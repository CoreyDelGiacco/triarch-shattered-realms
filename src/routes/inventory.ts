import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import { createRateLimiter } from "../middleware/rateLimit";
import { Character } from "../types";
import { GameData } from "../data/gameData";

const inventoryParamsSchema = z.object({
  characterId: z.coerce.number().int().positive(),
});

const inventoryMutationSchema = z.object({
  item_code: z.string().min(2).max(64),
  quantity: z.number().int().positive().max(9999),
});

const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>
) => {
  res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
};

export const createInventoryRouter = (db: Database, gameData: GameData) => {
  const router = Router();

  const mutateLimiter = createRateLimiter({ windowMs: 30_000, max: 20 });

  router.get("/:characterId", async (req: Request, res: Response) => {
    const parsed = inventoryParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const characterId = parsed.data.characterId;

      const characterResult = await pool.query<Character>(
        "SELECT id FROM characters WHERE id = $1",
        [characterId]
      );
      if (characterResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
        return;
      }

      const inventoryResult = await pool.query<{
        item_code: string;
        quantity: number;
      }>(
        "SELECT item_code, quantity FROM character_inventory WHERE character_id = $1 ORDER BY item_code",
        [characterId]
      );

      const items = inventoryResult.rows.map((row) => {
        const item = gameData.items[row.item_code];
        if (!item) {
          throw new Error(`Inventory references unknown item code: ${row.item_code}`);
        }

        return {
          item,
          item_code: row.item_code,
          quantity: row.quantity,
        };
      });

      res.json({
        character_id: characterId,
        items,
      });
    } catch (error) {
      console.error("Error fetching inventory:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch inventory.");
    }
  });

  router.post("/:characterId/add", mutateLimiter, async (req: Request, res: Response) => {
    const paramsParsed = inventoryParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", paramsParsed.error.flatten().fieldErrors);
      return;
    }

    const bodyParsed = inventoryMutationSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid inventory payload.", bodyParsed.error.flatten().fieldErrors);
      return;
    }

    const { characterId } = paramsParsed.data;
    const { item_code, quantity } = bodyParsed.data;
    const item = gameData.items[item_code];
    if (!item) {
      sendError(res, 404, "ITEM_NOT_FOUND", "Item code not found.");
      return;
    }

    try {
      const pool = db.getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const characterResult = await client.query<Character>(
          "SELECT id FROM characters WHERE id = $1",
          [characterId]
        );
        if (characterResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
          return;
        }

        const existingResult = await client.query<{
          quantity: number;
        }>(
          "SELECT quantity FROM character_inventory WHERE character_id = $1 AND item_code = $2",
          [characterId, item_code]
        );

        const existingQuantity = existingResult.rows[0]?.quantity ?? 0;
        const newQuantity = existingQuantity + quantity;

        if (newQuantity > item.stack_limit) {
          await client.query("ROLLBACK");
          sendError(
            res,
            400,
            "STACK_LIMIT_EXCEEDED",
            `Stack limit exceeded for ${item_code}. Max ${item.stack_limit}.`
          );
          return;
        }

        const upsertResult = await client.query<{
          item_code: string;
          quantity: number;
        }>(
          `INSERT INTO character_inventory (character_id, item_code, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (character_id, item_code)
           DO UPDATE SET quantity = $3, updated_at = CURRENT_TIMESTAMP
           RETURNING item_code, quantity`,
          [characterId, item_code, newQuantity]
        );

        await client.query("COMMIT");

        res.status(201).json({
          character_id: characterId,
          item: item,
          item_code: upsertResult.rows[0].item_code,
          quantity: upsertResult.rows[0].quantity,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error adding inventory item:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to add inventory item.");
    }
  });

  router.post("/:characterId/remove", mutateLimiter, async (req: Request, res: Response) => {
    const paramsParsed = inventoryParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", paramsParsed.error.flatten().fieldErrors);
      return;
    }

    const bodyParsed = inventoryMutationSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid inventory payload.", bodyParsed.error.flatten().fieldErrors);
      return;
    }

    const { characterId } = paramsParsed.data;
    const { item_code, quantity } = bodyParsed.data;
    const item = gameData.items[item_code];
    if (!item) {
      sendError(res, 404, "ITEM_NOT_FOUND", "Item code not found.");
      return;
    }

    try {
      const pool = db.getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const characterResult = await client.query<Character>(
          "SELECT id FROM characters WHERE id = $1",
          [characterId]
        );
        if (characterResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
          return;
        }

        const existingResult = await client.query<{
          quantity: number;
        }>(
          "SELECT quantity FROM character_inventory WHERE character_id = $1 AND item_code = $2",
          [characterId, item_code]
        );

        const existingQuantity = existingResult.rows[0]?.quantity ?? 0;
        if (existingQuantity <= 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "ITEM_NOT_OWNED", "Item not found in inventory.");
          return;
        }

        if (quantity > existingQuantity) {
          await client.query("ROLLBACK");
          sendError(res, 400, "INSUFFICIENT_QUANTITY", "Not enough quantity to remove.");
          return;
        }

        const newQuantity = existingQuantity - quantity;

        if (newQuantity === 0) {
          await client.query(
            "DELETE FROM character_inventory WHERE character_id = $1 AND item_code = $2",
            [characterId, item_code]
          );

          await client.query("COMMIT");

          res.json({
            character_id: characterId,
            item: item,
            item_code,
            quantity: 0,
          });
          return;
        }

        const updateResult = await client.query<{
          item_code: string;
          quantity: number;
        }>(
          `UPDATE character_inventory
           SET quantity = $1, updated_at = CURRENT_TIMESTAMP
           WHERE character_id = $2 AND item_code = $3
           RETURNING item_code, quantity`,
          [newQuantity, characterId, item_code]
        );

        await client.query("COMMIT");

        res.json({
          character_id: characterId,
          item: item,
          item_code: updateResult.rows[0].item_code,
          quantity: updateResult.rows[0].quantity,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error removing inventory item:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to remove inventory item.");
    }
  });

  return router;
};
