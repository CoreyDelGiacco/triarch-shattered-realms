import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import { createRateLimiter } from "../middleware/rateLimit";
import { Character, CharacterPosition, Zone } from "../types";

const zoneEnterSchema = z.object({
  character_id: z.number().int().positive(),
  zone_id: z.number().int().positive(),
  position: z.object({
    x: z.number().finite().min(-10000).max(10000),
    y: z.number().finite().min(-10000).max(10000),
  }),
});

const worldStateParamsSchema = z.object({
  characterId: z.coerce.number().int().positive(),
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

const parseNumeric = (value: number | string) => Number(value);

export const createWorldRouter = (db: Database) => {
  const router = Router();

  const zoneEnterLimiter = createRateLimiter({ windowMs: 30_000, max: 20 });

  router.post("/zone-enter", zoneEnterLimiter, async (req: Request, res: Response) => {
    const parsed = zoneEnterSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid zone entry payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const { character_id, zone_id, position } = parsed.data;

      const characterResult = await pool.query<Character>(
        "SELECT id FROM characters WHERE id = $1",
        [character_id]
      );
      if (characterResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
        return;
      }

      const zoneResult = await pool.query<Zone>(
        "SELECT * FROM zones WHERE id = $1",
        [zone_id]
      );
      if (zoneResult.rows.length === 0) {
        sendError(res, 404, "ZONE_NOT_FOUND", "Zone not found.");
        return;
      }

      const upsertResult = await pool.query<CharacterPosition>(
        `INSERT INTO character_positions (character_id, zone_id, position_x, position_y)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (character_id)
         DO UPDATE SET
           zone_id = EXCLUDED.zone_id,
           position_x = EXCLUDED.position_x,
           position_y = EXCLUDED.position_y,
           updated_at = CURRENT_TIMESTAMP
         RETURNING character_id, zone_id, position_x, position_y, updated_at`,
        [character_id, zone_id, position.x, position.y]
      );

      const storedPosition = upsertResult.rows[0];

      res.json({
        character_id,
        zone: zoneResult.rows[0],
        position: {
          x: parseNumeric(storedPosition.position_x),
          y: parseNumeric(storedPosition.position_y),
        },
        updated_at: storedPosition.updated_at,
      });
    } catch (error) {
      console.error("Error entering zone:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to enter zone.");
    }
  });

  router.get("/state/:characterId", async (req: Request, res: Response) => {
    const parsed = worldStateParamsSchema.safeParse(req.params);
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

      const stateResult = await pool.query<
        CharacterPosition & {
          name: string;
          risk_level: Zone["risk_level"];
          pvp_enabled: boolean;
          loot_drop_on_death: Zone["loot_drop_on_death"];
          description: string;
          resource_tier: Zone["resource_tier"];
        }
      >(
        `SELECT cp.character_id, cp.zone_id, cp.position_x, cp.position_y, cp.updated_at,
                z.name, z.risk_level, z.pvp_enabled, z.loot_drop_on_death, z.description, z.resource_tier
         FROM character_positions cp
         JOIN zones z ON cp.zone_id = z.id
         WHERE cp.character_id = $1`,
        [characterId]
      );

      if (stateResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_IN_WORLD", "Character has no active world state.");
        return;
      }

      const state = stateResult.rows[0];

      res.json({
        character_id: state.character_id,
        zone: {
          id: state.zone_id,
          name: state.name,
          risk_level: state.risk_level,
          pvp_enabled: state.pvp_enabled,
          loot_drop_on_death: state.loot_drop_on_death,
          description: state.description,
          resource_tier: state.resource_tier,
        },
        position: {
          x: parseNumeric(state.position_x),
          y: parseNumeric(state.position_y),
        },
        updated_at: state.updated_at,
        server_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching world state:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch world state.");
    }
  });

  return router;
};
