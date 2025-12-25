import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import {
  Character,
  CharacterWithDetails,
  CreateCharacterRequest,
  UpdateCharacterStatsRequest,
  AssignAbilityRequest,
  AssignTraitRequest,
  UpdateSkillRequest,
} from "../types";
import { requireSession } from "../middleware/auth";
import { sendError } from "../utils/errors";

const createCharacterSchema = z.object({
  name: z.string().min(3).max(100),
  faction_id: z.number().int().positive(),
  class_id: z.number().int().positive(),
});

const characterIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const updateStatsSchema = z.object({
  power: z.number().int().min(0).optional(),
  control: z.number().int().min(0).optional(),
  resilience: z.number().int().min(0).optional(),
});

const assignAbilitySchema = z.object({
  ability_id: z.number().int().positive(),
});

const assignTraitSchema = z.object({
  trait_id: z.number().int().positive(),
  level: z.number().int().min(1).optional(),
});

const updateSkillSchema = z.object({
  skill_id: z.number().int().positive(),
  experience_gained: z.number().int().positive(),
});

const DEFAULT_MAX_HP = 120;
const PRIMARY_REPUTATION = 500;
const NEUTRAL_REPUTATION = 0;

export const createCharactersRouter = (db: Database) => {
  const router = Router();

  router.use(requireSession(db));

  const getOwnedCharacter = async (
    res: Response,
    characterId: number,
    playerId: number
  ) => {
    const pool = db.getPool();
    const result = await pool.query<Character>(
      "SELECT * FROM characters WHERE id = $1 AND player_id = $2",
      [characterId, playerId]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
      return null;
    }

    return result.rows[0];
  };

  // GET /api/characters - List all characters for player
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const result = await pool.query<CharacterWithDetails>(
        `SELECT c.*, 
                f.name as faction_name, f.code as faction_code,
                cl.name as class_name, cl.code as class_code
         FROM characters c
         LEFT JOIN factions f ON c.faction_id = f.id
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.player_id = $1
         ORDER BY c.id`,
        [player.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching characters:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch characters.");
    }
  });

  // GET /api/characters/:id - Get specific character with full details
  router.get("/:id", async (req: Request, res: Response) => {
    const parsedParams = characterIdSchema.safeParse(req.params);
    if (!parsedParams.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", parsedParams.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { id } = parsedParams.data;

      // Get character details
      const charResult = await pool.query<Character>(
        `SELECT c.*, 
                f.name as faction_name, f.code as faction_code,
                cl.name as class_name, cl.code as class_code, cl.role as class_role
         FROM characters c
         LEFT JOIN factions f ON c.faction_id = f.id
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.id = $1 AND c.player_id = $2`,
        [id, player.id]
      );

      if (charResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
        return;
      }

      // Get character abilities
      const abilitiesResult = await pool.query(
        `SELECT a.*, ca.enhancement_level
         FROM abilities a
         JOIN character_abilities ca ON a.id = ca.ability_id
         WHERE ca.character_id = $1
         ORDER BY a.ability_type, a.cooldown_seconds`,
        [id]
      );

      // Get character traits
      const traitsResult = await pool.query(
        `SELECT pt.*, ct.current_level
         FROM passive_traits pt
         JOIN character_traits ct ON pt.id = ct.trait_id
         WHERE ct.character_id = $1
         ORDER BY pt.id`,
        [id]
      );

      // Get character skills
      const skillsResult = await pool.query(
        `SELECT s.*, cs.current_level, cs.experience
         FROM skills s
         JOIN character_skills cs ON s.id = cs.skill_id
         WHERE cs.character_id = $1
         ORDER BY s.category, s.name`,
        [id]
      );

      res.json({
        ...charResult.rows[0],
        abilities: abilitiesResult.rows,
        traits: traitsResult.rows,
        skills: skillsResult.rows,
      });
    } catch (error) {
      console.error("Error fetching character:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch character.");
    }
  });

  // POST /api/characters - Create new character
  router.post("/", async (req: Request, res: Response) => {
    const parsed = createCharacterSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { name, faction_id, class_id }: CreateCharacterRequest = parsed.data;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Validate faction exists
        const factionCheck = await client.query(
          "SELECT id FROM factions WHERE id = $1",
          [faction_id]
        );
        if (factionCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 400, "INVALID_FACTION", "Invalid faction_id.");
          return;
        }

        // Validate class exists
        const classCheck = await client.query(
          "SELECT id FROM classes WHERE id = $1",
          [class_id]
        );
        if (classCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 400, "INVALID_CLASS", "Invalid class_id.");
          return;
        }

        const result = await client.query<Character>(
          `INSERT INTO characters (player_id, name, faction_id, class_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [player.id, name, faction_id, class_id]
        );

        const character = result.rows[0];

        await client.query(
          `INSERT INTO character_state (character_id, current_hp, max_hp, is_dead)
           VALUES ($1, $2, $3, $4)`,
          [character.id, DEFAULT_MAX_HP, DEFAULT_MAX_HP, false]
        );

        const factionsResult = await client.query<{ id: number }>(
          "SELECT id FROM factions ORDER BY id"
        );

        for (const faction of factionsResult.rows) {
          const value = faction.id === faction_id ? PRIMARY_REPUTATION : NEUTRAL_REPUTATION;
          await client.query(
            `INSERT INTO character_reputation (character_id, faction_id, value)
             VALUES ($1, $2, $3)
             ON CONFLICT (character_id, faction_id)
             DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
            [character.id, faction.id, value]
          );
        }

        await client.query("COMMIT");

        res.status(201).json(character);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating character:", error);
      if (error instanceof Error && error.message.includes("duplicate key")) {
        sendError(res, 409, "NAME_TAKEN", "Character name already exists.");
      } else {
        sendError(res, 500, "INTERNAL_ERROR", "Failed to create character.");
      }
    }
  });

  // PATCH /api/characters/:id/stats - Update character stats
  router.patch("/:id/stats", async (req: Request, res: Response) => {
    const paramsParsed = characterIdSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", paramsParsed.error.flatten().fieldErrors);
      return;
    }

    const bodyParsed = updateStatsSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid stats payload.", bodyParsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { id } = paramsParsed.data;
      const { power, control, resilience }: UpdateCharacterStatsRequest = bodyParsed.data;

      // Get current character
      const character = await getOwnedCharacter(res, id, player.id);
      if (!character) {
        return;
      }

      // Calculate new stats
      const newPower = power !== undefined ? power : character.power;
      const newControl = control !== undefined ? control : character.control;
      const newResilience = resilience !== undefined ? resilience : character.resilience;

      // Validate stat allocation
      const totalStats = newPower + newControl + newResilience;
      if (totalStats > character.level) {
        sendError(
          res,
          400,
          "STAT_LIMIT_EXCEEDED",
          `Total stat points (${totalStats}) cannot exceed character level (${character.level}).`
        );
        return;
      }

      const result = await pool.query<Character>(
        `UPDATE characters
         SET power = $1, control = $2, resilience = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [newPower, newControl, newResilience, id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating character stats:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to update character stats.");
    }
  });

  // POST /api/characters/:id/abilities - Assign ability to character
  router.post("/:id/abilities", async (req: Request, res: Response) => {
    const paramsParsed = characterIdSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", paramsParsed.error.flatten().fieldErrors);
      return;
    }

    const bodyParsed = assignAbilitySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid ability payload.", bodyParsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { id } = paramsParsed.data;
      const { ability_id }: AssignAbilityRequest = bodyParsed.data;

      // Verify character exists
      const character = await getOwnedCharacter(res, id, player.id);
      if (!character) {
        return;
      }

      // Verify ability exists
      const abilityCheck = await pool.query(
        "SELECT id FROM abilities WHERE id = $1",
        [ability_id]
      );
      if (abilityCheck.rows.length === 0) {
        sendError(res, 400, "INVALID_ABILITY", "Invalid ability_id.");
        return;
      }

      const result = await pool.query(
        `INSERT INTO character_abilities (character_id, ability_id)
         VALUES ($1, $2)
         RETURNING *`,
        [id, ability_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error assigning ability:", error);
      if (error instanceof Error && error.message.includes("duplicate key")) {
        sendError(res, 409, "ABILITY_EXISTS", "Character already has this ability.");
      } else {
        sendError(res, 500, "INTERNAL_ERROR", "Failed to assign ability.");
      }
    }
  });

  // POST /api/characters/:id/traits - Assign trait to character
  router.post("/:id/traits", async (req: Request, res: Response) => {
    const paramsParsed = characterIdSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", paramsParsed.error.flatten().fieldErrors);
      return;
    }

    const bodyParsed = assignTraitSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid trait payload.", bodyParsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { id } = paramsParsed.data;
      const { trait_id, level }: AssignTraitRequest = bodyParsed.data;

      // Verify character exists
      const character = await getOwnedCharacter(res, id, player.id);
      if (!character) {
        return;
      }

      // Verify trait exists and level is valid
      const traitResult = await pool.query<{ max_level: number }>(
        "SELECT max_level FROM passive_traits WHERE id = $1",
        [trait_id]
      );
      if (traitResult.rows.length === 0) {
        sendError(res, 400, "INVALID_TRAIT", "Invalid trait_id.");
        return;
      }

      const maxLevel = traitResult.rows[0].max_level;
      const traitLevel = level ?? 1;
      if (traitLevel > maxLevel) {
        sendError(res, 400, "INVALID_LEVEL", "Trait level exceeds max level.");
        return;
      }

      const result = await pool.query(
        `INSERT INTO character_traits (character_id, trait_id, current_level)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [id, trait_id, traitLevel]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error assigning trait:", error);
      if (error instanceof Error && error.message.includes("duplicate key")) {
        sendError(res, 409, "TRAIT_EXISTS", "Character already has this trait.");
      } else {
        sendError(res, 500, "INTERNAL_ERROR", "Failed to assign trait.");
      }
    }
  });

  // POST /api/characters/:id/skills - Update skill experience
  router.post("/:id/skills", async (req: Request, res: Response) => {
    const paramsParsed = characterIdSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid character id.", paramsParsed.error.flatten().fieldErrors);
      return;
    }

    const bodyParsed = updateSkillSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid skill payload.", bodyParsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { id } = paramsParsed.data;
      const { skill_id, experience_gained }: UpdateSkillRequest = bodyParsed.data;

      // Verify character exists
      const character = await getOwnedCharacter(res, id, player.id);
      if (!character) {
        return;
      }

      // Verify skill exists
      const skillCheck = await pool.query(
        "SELECT id FROM skills WHERE id = $1",
        [skill_id]
      );
      if (skillCheck.rows.length === 0) {
        sendError(res, 400, "INVALID_SKILL", "Invalid skill_id.");
        return;
      }

      const result = await pool.query(
        `INSERT INTO character_skills (character_id, skill_id, current_level, experience)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (character_id, skill_id)
         DO UPDATE SET experience = character_skills.experience + $3, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [id, skill_id, experience_gained]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating skill:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to update skill.");
    }
  });

  return router;
};
