import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import { requireSession } from "../middleware/auth";
import { sendError } from "../utils/errors";
import { Character, BetrayalQuest } from "../types";

const startSchema = z.object({
  character_id: z.number().int().positive(),
  target_faction_id: z.number().int().positive(),
});

const advanceSchema = z.object({
  character_id: z.number().int().positive(),
});

const statusParamsSchema = z.object({
  characterId: z.coerce.number().int().positive(),
});

const STEP_SEQUENCE: BetrayalQuest["current_step"][] = [
  "RENOUNCE",
  "PROVE",
  "COMPLETE",
];

const BETRAYAL_REP_PENALTY = -500;
const BETRAYAL_REP_BASELINE = 200;

export const createBetrayalRouter = (db: Database) => {
  const router = Router();

  router.use(requireSession(db));

  router.get("/status/:characterId", async (req: Request, res: Response) => {
    const parsed = statusParamsSchema.safeParse(req.params);
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

      const questResult = await pool.query<BetrayalQuest>(
        "SELECT * FROM betrayal_quests WHERE character_id = $1 ORDER BY started_at DESC LIMIT 1",
        [characterId]
      );

      res.json({
        character_id: characterId,
        quest: questResult.rows[0] ?? null,
      });
    } catch (error) {
      console.error("Error fetching betrayal status:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch betrayal status.");
    }
  });

  router.post("/start", async (req: Request, res: Response) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid betrayal payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { character_id, target_faction_id } = parsed.data;

      const characterResult = await pool.query<Character>(
        "SELECT id, faction_id FROM characters WHERE id = $1 AND player_id = $2",
        [character_id, player.id]
      );
      if (characterResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
        return;
      }

      const character = characterResult.rows[0];
      if (character.faction_id === target_faction_id) {
        sendError(res, 400, "INVALID_TARGET", "Target faction must differ from current faction.");
        return;
      }

      const activeQuest = await pool.query<BetrayalQuest>(
        `SELECT * FROM betrayal_quests
         WHERE character_id = $1 AND status = 'IN_PROGRESS'
         ORDER BY started_at DESC
         LIMIT 1`,
        [character_id]
      );

      if (activeQuest.rows.length > 0) {
        sendError(res, 400, "QUEST_ACTIVE", "Betrayal quest already in progress.");
        return;
      }

      const questResult = await pool.query<BetrayalQuest>(
        `INSERT INTO betrayal_quests (character_id, target_faction_id, current_step, status)
         VALUES ($1, $2, 'RENOUNCE', 'IN_PROGRESS')
         RETURNING *`,
        [character_id, target_faction_id]
      );

      res.status(201).json({
        quest: questResult.rows[0],
      });
    } catch (error) {
      console.error("Error starting betrayal quest:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to start betrayal quest.");
    }
  });

  router.post("/advance", async (req: Request, res: Response) => {
    const parsed = advanceSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid betrayal payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { character_id } = parsed.data;

      const characterResult = await pool.query<Character>(
        "SELECT id, faction_id FROM characters WHERE id = $1 AND player_id = $2",
        [character_id, player.id]
      );
      if (characterResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
        return;
      }

      const questResult = await pool.query<BetrayalQuest>(
        `SELECT * FROM betrayal_quests
         WHERE character_id = $1 AND status = 'IN_PROGRESS'
         ORDER BY started_at DESC
         LIMIT 1`,
        [character_id]
      );

      if (questResult.rows.length === 0) {
        sendError(res, 404, "QUEST_NOT_FOUND", "No active betrayal quest.");
        return;
      }

      const quest = questResult.rows[0];
      const currentIndex = STEP_SEQUENCE.indexOf(quest.current_step);
      const nextStep = STEP_SEQUENCE[currentIndex + 1] ?? "COMPLETE";

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        if (quest.current_step === "PROVE") {
          await client.query(
            `UPDATE betrayal_quests
             SET current_step = 'COMPLETE', status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [quest.id]
          );

          await client.query(
            `UPDATE characters
             SET faction_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [quest.target_faction_id, character_id]
          );

          await client.query(
            `UPDATE character_reputation
             SET value = $1, updated_at = CURRENT_TIMESTAMP
             WHERE character_id = $2`,
            [BETRAYAL_REP_BASELINE, character_id]
          );

          await client.query(
            `UPDATE character_reputation
             SET value = $1, updated_at = CURRENT_TIMESTAMP
             WHERE character_id = $2 AND faction_id = $3`,
            [BETRAYAL_REP_PENALTY, character_id, characterResult.rows[0].faction_id]
          );

          await client.query(
            `UPDATE character_reputation
             SET value = $1, updated_at = CURRENT_TIMESTAMP
             WHERE character_id = $2 AND faction_id = $3`,
            [BETRAYAL_REP_BASELINE + 200, character_id, quest.target_faction_id]
          );
        } else {
          await client.query(
            `UPDATE betrayal_quests
             SET current_step = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextStep, quest.id]
          );
        }

        const updatedQuest = await client.query<BetrayalQuest>(
          "SELECT * FROM betrayal_quests WHERE id = $1",
          [quest.id]
        );

        await client.query("COMMIT");

        res.json({
          quest: updatedQuest.rows[0],
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error advancing betrayal quest:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to advance betrayal quest.");
    }
  });

  return router;
};
