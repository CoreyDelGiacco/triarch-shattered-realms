import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import { requireSession } from "../middleware/auth";
import { sendError } from "../utils/errors";
import { Character, CharacterReputation, Faction } from "../types";

const paramsSchema = z.object({
  characterId: z.coerce.number().int().positive(),
});

export const createReputationRouter = (db: Database) => {
  const router = Router();

  router.use(requireSession(db));

  router.get("/:characterId", async (req: Request, res: Response) => {
    const parsed = paramsSchema.safeParse(req.params);
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

      const reputationResult = await pool.query<
        CharacterReputation & { faction_name: string; faction_code: string }
      >(
        `SELECT cr.character_id, cr.faction_id, cr.value, cr.updated_at,
                f.name as faction_name, f.code as faction_code
         FROM character_reputation cr
         JOIN factions f ON cr.faction_id = f.id
         WHERE cr.character_id = $1
         ORDER BY f.id`,
        [characterId]
      );

      res.json({
        character_id: characterId,
        reputation: reputationResult.rows.map((row) => ({
          character_id: row.character_id,
          faction: {
            id: row.faction_id,
            name: row.faction_name,
            code: row.faction_code,
          } satisfies Pick<Faction, "id" | "name" | "code">,
          value: row.value,
          updated_at: row.updated_at,
        })),
      });
    } catch (error) {
      console.error("Error fetching reputation:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch reputation.");
    }
  });

  return router;
};
