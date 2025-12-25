import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import { GameData } from "../data/gameData";
import { requireSession } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";
import { Character, CharacterPosition, CharacterState, LootContainer } from "../types";
import { sendError } from "../utils/errors";
import { logSuspiciousAction } from "../utils/securityLog";

const listContainersSchema = z.object({
  characterId: z.coerce.number().int().positive(),
});

const claimParamsSchema = z.object({
  containerId: z.coerce.number().int().positive(),
});

const claimBodySchema = z.object({
  character_id: z.number().int().positive(),
});

const parseNumeric = (value: number | string) => Number(value);

const logLootSuspicious = (
  req: Request,
  playerId: number,
  characterId: number,
  zoneId: number,
  reason: string
) => {
  logSuspiciousAction(req, {
    player_id: playerId,
    character_id: characterId,
    zone_id: zoneId,
    action: "LOOT",
    reason,
  });
};

export const createLootRouter = (db: Database, gameData: GameData) => {
  const router = Router();

  const claimLimiter = createRateLimiter({ windowMs: 30_000, max: 20 });

  router.use(requireSession(db));

  router.get("/containers/:characterId", async (req: Request, res: Response) => {
    const parsed = listContainersSchema.safeParse(req.params);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const characterId = parsed.data.characterId;

      const characterResult = await pool.query<Character>(
        "SELECT id FROM characters WHERE id = $1 AND player_id = $2",
        [characterId, player.id]
      );
      if (characterResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
        return;
      }

      const positionResult = await pool.query<CharacterPosition>(
        "SELECT * FROM character_positions WHERE character_id = $1",
        [characterId]
      );
      if (positionResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_IN_WORLD", "Character has no active world state.");
        return;
      }

      const position = positionResult.rows[0];
      const zoneId = position.zone_id;

      const containersResult = await pool.query<LootContainer>(
        `SELECT * FROM loot_containers
         WHERE zone_id = $1
         ORDER BY created_at DESC`,
        [zoneId]
      );

      const containerIds = containersResult.rows.map((container) => container.id);
      const itemsResult = containerIds.length
        ? await pool.query<{
            container_id: number;
            item_code: string;
            quantity: number;
          }>(
            `SELECT container_id, item_code, quantity
             FROM loot_container_items
             WHERE container_id = ANY($1::int[])
             ORDER BY item_code`,
            [containerIds]
          )
        : { rows: [] };

      const itemsByContainer = new Map<number, Array<{ item_code: string; quantity: number }>>();
      for (const item of itemsResult.rows) {
        const list = itemsByContainer.get(item.container_id) ?? [];
        list.push({ item_code: item.item_code, quantity: item.quantity });
        itemsByContainer.set(item.container_id, list);
      }

      const containers = containersResult.rows.map((container) => ({
        id: container.id,
        zone_id: container.zone_id,
        position: {
          x: parseNumeric(container.position_x),
          y: parseNumeric(container.position_y),
        },
        owner_character_id: container.owner_character_id,
        items: (itemsByContainer.get(container.id) ?? []).map((entry) => ({
          ...entry,
          item: gameData.items[entry.item_code],
        })),
        created_at: container.created_at,
      }));

      res.json({
        character_id: characterId,
        zone_id: zoneId,
        containers,
      });
    } catch (error) {
      console.error("Error listing loot containers:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch loot containers.");
    }
  });

  router.post("/containers/:containerId/claim", claimLimiter, async (req: Request, res: Response) => {
    const paramsParsed = claimParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid container id.", paramsParsed.error.flatten().fieldErrors);
      return;
    }

    const bodyParsed = claimBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid loot claim payload.", bodyParsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { containerId } = paramsParsed.data;
      const { character_id } = bodyParsed.data;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const characterResult = await client.query<Character>(
          "SELECT id FROM characters WHERE id = $1 AND player_id = $2",
          [character_id, player.id]
        );
        if (characterResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
          return;
        }

        const stateResult = await client.query<CharacterState>(
          "SELECT * FROM character_state WHERE character_id = $1",
          [character_id]
        );
        if (stateResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_STATE_MISSING", "Character state missing.");
          return;
        }
        if (stateResult.rows[0].is_dead) {
          await client.query("ROLLBACK");
          sendError(res, 400, "CHARACTER_DEAD", "Character cannot loot while dead.");
          return;
        }

        const positionResult = await client.query<CharacterPosition>(
          "SELECT * FROM character_positions WHERE character_id = $1",
          [character_id]
        );
        if (positionResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_NOT_IN_WORLD", "Character has no active world state.");
          return;
        }

        const containerResult = await client.query<LootContainer>(
          "SELECT * FROM loot_containers WHERE id = $1",
          [containerId]
        );
        if (containerResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CONTAINER_NOT_FOUND", "Loot container not found.");
          return;
        }

        const container = containerResult.rows[0];
        const position = positionResult.rows[0];
        const zoneId = position.zone_id;

        if (container.zone_id !== zoneId) {
          await client.query("ROLLBACK");
          logLootSuspicious(req, player.id, character_id, zoneId, "ZONE_MISMATCH");
          sendError(res, 400, "INVALID_ZONE", "Loot container is not in the same zone.");
          return;
        }

        const characterPosition = {
          x: parseNumeric(position.position_x),
          y: parseNumeric(position.position_y),
        };
        const containerPosition = {
          x: parseNumeric(container.position_x),
          y: parseNumeric(container.position_y),
        };
        const distance = Math.hypot(
          containerPosition.x - characterPosition.x,
          containerPosition.y - characterPosition.y
        );
        if (distance > 12) {
          await client.query("ROLLBACK");
          logLootSuspicious(req, player.id, character_id, zoneId, "OUT_OF_RANGE");
          sendError(res, 400, "OUT_OF_RANGE", "Loot container is out of range.");
          return;
        }

        const itemsResult = await client.query<{
          item_code: string;
          quantity: number;
        }>(
          "SELECT item_code, quantity FROM loot_container_items WHERE container_id = $1",
          [containerId]
        );

        if (itemsResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 400, "EMPTY_CONTAINER", "Loot container is empty.");
          return;
        }

        for (const item of itemsResult.rows) {
          const itemDef = gameData.items[item.item_code];
          if (!itemDef) {
            await client.query("ROLLBACK");
            sendError(res, 500, "INVALID_LOOT", "Loot item definition missing.");
            return;
          }

          const inventoryResult = await client.query<{ quantity: number }>(
            "SELECT quantity FROM character_inventory WHERE character_id = $1 AND item_code = $2",
            [character_id, item.item_code]
          );

          const existingQuantity = inventoryResult.rows[0]?.quantity ?? 0;
          const newQuantity = existingQuantity + item.quantity;
          if (newQuantity > itemDef.stack_limit) {
            await client.query("ROLLBACK");
            sendError(
              res,
              400,
              "STACK_LIMIT_EXCEEDED",
              `Stack limit exceeded for ${item.item_code}. Max ${itemDef.stack_limit}.`
            );
            return;
          }
        }

        for (const item of itemsResult.rows) {
          await client.query(
            `INSERT INTO character_inventory (character_id, item_code, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (character_id, item_code)
             DO UPDATE SET quantity = character_inventory.quantity + $3, updated_at = CURRENT_TIMESTAMP`,
            [character_id, item.item_code, item.quantity]
          );
        }

        await client.query("DELETE FROM loot_container_items WHERE container_id = $1", [containerId]);
        await client.query("DELETE FROM loot_containers WHERE id = $1", [containerId]);

        await client.query("COMMIT");

        res.json({
          character_id,
          container_id: containerId,
          items: itemsResult.rows.map((item) => ({
            item_code: item.item_code,
            quantity: item.quantity,
            item: gameData.items[item.item_code],
          })),
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error claiming loot:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to claim loot.");
    }
  });

  return router;
};
