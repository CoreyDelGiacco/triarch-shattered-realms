import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import { createRateLimiter } from "../middleware/rateLimit";
import { Character, CharacterPosition } from "../types";
import { GameData, ResourceNodeDefinition } from "../data/gameData";
import { selectWeightedLoot } from "../utils/loot";
import { sendError } from "../utils/errors";
import { logSuspiciousAction } from "../utils/securityLog";
import { requireSession } from "../middleware/auth";

const nodeParamsSchema = z.object({
  zoneId: z.coerce.number().int().positive(),
});

const gatherAttemptSchema = z.object({
  character_id: z.number().int().positive(),
  node_code: z.string().min(2).max(64),
  client_position: z
    .object({
      x: z.number().finite().min(-10000).max(10000),
      y: z.number().finite().min(-10000).max(10000),
    })
    .optional(),
});

const parseNumeric = (value: number | string) => Number(value);

const logGatheringSuspicious = (
  req: Request,
  playerId: number,
  characterId: number,
  node: ResourceNodeDefinition,
  reason: string
) => {
  logSuspiciousAction(req, {
    player_id: playerId,
    character_id: characterId,
    zone_id: node.zone_id,
    action: "GATHERING",
    reason,
  });
};

export const createGatheringRouter = (db: Database, gameData: GameData) => {
  const router = Router();

  const gatherLimiter = createRateLimiter({ windowMs: 30_000, max: 15 });

  router.use(requireSession(db));

  router.get("/nodes/:zoneId", (req: Request, res: Response) => {
    const parsed = nodeParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid zone id.", parsed.error.flatten().fieldErrors);
      return;
    }

    const zoneId = parsed.data.zoneId;
    const nodes = Object.values(gameData.nodes)
      .filter((node) => node.zone_id === zoneId)
      .map((node) => ({
        code: node.code,
        name: node.name,
        skill_code: node.skill_code,
        zone_id: node.zone_id,
        position: node.position,
        interaction_radius: node.interaction_radius,
        cooldown_seconds: node.cooldown_seconds,
        min_skill_level: node.min_skill_level,
        loot_table: node.loot_table.map((entry) => ({
          ...entry,
          item: gameData.items[entry.item_code],
        })),
      }));

    res.json({
      zone_id: zoneId,
      nodes,
    });
  });

  router.post("/attempt", gatherLimiter, async (req: Request, res: Response) => {
    const parsed = gatherAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid gathering payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    const { character_id, node_code, client_position } = parsed.data;
    const node = gameData.nodes[node_code];

    if (!node) {
      sendError(res, 404, "NODE_NOT_FOUND", "Gathering node not found.");
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
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

        const positionResult = await client.query<CharacterPosition>(
          "SELECT character_id, zone_id, position_x, position_y FROM character_positions WHERE character_id = $1",
          [character_id]
        );
        if (positionResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_NOT_IN_WORLD", "Character has no active world state.");
          return;
        }

        const position = positionResult.rows[0];
        const serverPosition = {
          x: parseNumeric(position.position_x),
          y: parseNumeric(position.position_y),
        };

        if (client_position) {
          const mismatch = Math.hypot(
            client_position.x - serverPosition.x,
            client_position.y - serverPosition.y
          );
          if (mismatch > 15) {
            logGatheringSuspicious(req, player.id, character_id, node, "CLIENT_POSITION_DESYNC");
          }
        }

        if (position.zone_id !== node.zone_id) {
          await client.query("ROLLBACK");
          logGatheringSuspicious(req, player.id, character_id, node, "ZONE_MISMATCH");
          sendError(res, 400, "INVALID_ZONE", "Character is not in the same zone as the node.");
          return;
        }

        const distance = Math.hypot(
          node.position.x - serverPosition.x,
          node.position.y - serverPosition.y
        );

        if (distance > node.interaction_radius) {
          await client.query("ROLLBACK");
          logGatheringSuspicious(req, player.id, character_id, node, "OUT_OF_RANGE");
          sendError(res, 400, "OUT_OF_RANGE", "Character is too far from the node.");
          return;
        }

        const skillResult = await client.query<{ current_level: number }>(
          `SELECT cs.current_level
           FROM character_skills cs
           JOIN skills s ON cs.skill_id = s.id
           WHERE cs.character_id = $1 AND s.code = $2`,
          [character_id, node.skill_code]
        );

        if (skillResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 400, "SKILL_NOT_TRAINED", "Required gathering skill not trained.");
          return;
        }

        const skillLevel = skillResult.rows[0].current_level;
        if (skillLevel < node.min_skill_level) {
          await client.query("ROLLBACK");
          sendError(res, 400, "SKILL_TOO_LOW", "Gathering skill level too low.");
          return;
        }

        const cooldownResult = await client.query<{ next_available_at: Date }>(
          "SELECT next_available_at FROM character_gathering_cooldowns WHERE character_id = $1 AND node_code = $2",
          [character_id, node.code]
        );

        const now = new Date();
        const nextAvailableAt = cooldownResult.rows[0]?.next_available_at;
        if (nextAvailableAt && now < nextAvailableAt) {
          await client.query("ROLLBACK");
          logGatheringSuspicious(req, player.id, character_id, node, "COOLDOWN_ACTIVE");
          sendError(res, 400, "NODE_COOLDOWN", "Node is still on cooldown.");
          return;
        }

        const loot = selectWeightedLoot(node.loot_table);
        const item = gameData.items[loot.item_code];
        if (!item) {
          await client.query("ROLLBACK");
          sendError(res, 500, "INVALID_LOOT", "Loot item definition missing.");
          return;
        }

        const inventoryResult = await client.query<{ quantity: number }>(
          "SELECT quantity FROM character_inventory WHERE character_id = $1 AND item_code = $2",
          [character_id, loot.item_code]
        );

        const existingQuantity = inventoryResult.rows[0]?.quantity ?? 0;
        const newQuantity = existingQuantity + loot.quantity;

        if (newQuantity > item.stack_limit) {
          await client.query("ROLLBACK");
          sendError(
            res,
            400,
            "STACK_LIMIT_EXCEEDED",
            `Stack limit exceeded for ${loot.item_code}. Max ${item.stack_limit}.`
          );
          return;
        }

        const nextTime = new Date(now.getTime() + node.cooldown_seconds * 1000);

        await client.query(
          `INSERT INTO character_gathering_cooldowns (character_id, node_code, next_available_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (character_id, node_code)
           DO UPDATE SET next_available_at = EXCLUDED.next_available_at, updated_at = CURRENT_TIMESTAMP`,
          [character_id, node.code, nextTime]
        );

        await client.query(
          `INSERT INTO character_inventory (character_id, item_code, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (character_id, item_code)
           DO UPDATE SET quantity = $3, updated_at = CURRENT_TIMESTAMP`,
          [character_id, loot.item_code, newQuantity]
        );

        await client.query("COMMIT");

        res.status(201).json({
          character_id,
          node: {
            code: node.code,
            name: node.name,
            zone_id: node.zone_id,
            skill_code: node.skill_code,
            position: node.position,
            interaction_radius: node.interaction_radius,
            cooldown_seconds: node.cooldown_seconds,
            min_skill_level: node.min_skill_level,
          },
          loot: {
            item,
            item_code: loot.item_code,
            quantity: loot.quantity,
          },
          next_available_at: nextTime.toISOString(),
          server_time: new Date().toISOString(),
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error gathering:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to gather resources.");
    }
  });

  return router;
};
