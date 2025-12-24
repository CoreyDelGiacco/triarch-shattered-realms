import { Router } from "express";
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

export const createCharactersRouter = (db: Database) => {
  const router = Router();

  // GET /api/characters - List all characters
  router.get("/", async (_req, res) => {
    try {
      const pool = db.getPool();
      const result = await pool.query<CharacterWithDetails>(
        `SELECT c.*, 
                f.name as faction_name, f.code as faction_code,
                cl.name as class_name, cl.code as class_code
         FROM characters c
         LEFT JOIN factions f ON c.faction_id = f.id
         LEFT JOIN classes cl ON c.class_id = cl.id
         ORDER BY c.id`
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  // GET /api/characters/:id - Get specific character with full details
  router.get("/:id", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;

      // Get character details
      const charResult = await pool.query<Character>(
        `SELECT c.*, 
                f.name as faction_name, f.code as faction_code,
                cl.name as class_name, cl.code as class_code, cl.role as class_role
         FROM characters c
         LEFT JOIN factions f ON c.faction_id = f.id
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.id = $1`,
        [id]
      );

      if (charResult.rows.length === 0) {
        res.status(404).json({ error: "Character not found" });
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
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  // POST /api/characters - Create new character
  router.post("/", async (req, res) => {
    try {
      const pool = db.getPool();
      const { name, faction_id, class_id }: CreateCharacterRequest = req.body;

      if (!name || !faction_id || !class_id) {
        res.status(400).json({
          error: "Missing required fields: name, faction_id, class_id",
        });
        return;
      }

      // Validate faction exists
      const factionCheck = await pool.query(
        "SELECT id FROM factions WHERE id = $1",
        [faction_id]
      );
      if (factionCheck.rows.length === 0) {
        res.status(400).json({ error: "Invalid faction_id" });
        return;
      }

      // Validate class exists
      const classCheck = await pool.query(
        "SELECT id FROM classes WHERE id = $1",
        [class_id]
      );
      if (classCheck.rows.length === 0) {
        res.status(400).json({ error: "Invalid class_id" });
        return;
      }

      const result = await pool.query<Character>(
        `INSERT INTO characters (name, faction_id, class_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, faction_id, class_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating character:", error);
      if (
        error instanceof Error &&
        error.message.includes("duplicate key")
      ) {
        res.status(409).json({ error: "Character name already exists" });
      } else {
        res.status(500).json({ error: "Failed to create character" });
      }
    }
  });

  // PATCH /api/characters/:id/stats - Update character stats
  router.patch("/:id/stats", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;
      const { power, control, resilience }: UpdateCharacterStatsRequest =
        req.body;

      // Get current character
      const charResult = await pool.query<Character>(
        "SELECT * FROM characters WHERE id = $1",
        [id]
      );

      if (charResult.rows.length === 0) {
        res.status(404).json({ error: "Character not found" });
        return;
      }

      const character = charResult.rows[0];

      // Calculate new stats
      const newPower = power !== undefined ? power : character.power;
      const newControl = control !== undefined ? control : character.control;
      const newResilience =
        resilience !== undefined ? resilience : character.resilience;

      // Validate stat allocation
      const totalStats = newPower + newControl + newResilience;
      if (totalStats > character.level) {
        res.status(400).json({
          error: `Total stat points (${totalStats}) cannot exceed character level (${character.level})`,
        });
        return;
      }

      if (newPower < 0 || newControl < 0 || newResilience < 0) {
        res.status(400).json({ error: "Stats cannot be negative" });
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
      res.status(500).json({ error: "Failed to update character stats" });
    }
  });

  // POST /api/characters/:id/abilities - Assign ability to character
  router.post("/:id/abilities", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;
      const { ability_id }: AssignAbilityRequest = req.body;

      if (!ability_id) {
        res.status(400).json({ error: "Missing required field: ability_id" });
        return;
      }

      // Verify character exists
      const charCheck = await pool.query("SELECT id FROM characters WHERE id = $1", [
        id,
      ]);
      if (charCheck.rows.length === 0) {
        res.status(404).json({ error: "Character not found" });
        return;
      }

      // Verify ability exists
      const abilityCheck = await pool.query(
        "SELECT id FROM abilities WHERE id = $1",
        [ability_id]
      );
      if (abilityCheck.rows.length === 0) {
        res.status(400).json({ error: "Invalid ability_id" });
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
      if (
        error instanceof Error &&
        error.message.includes("duplicate key")
      ) {
        res.status(409).json({ error: "Character already has this ability" });
      } else {
        res.status(500).json({ error: "Failed to assign ability" });
      }
    }
  });

  // POST /api/characters/:id/traits - Assign trait to character
  router.post("/:id/traits", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;
      const { trait_id, level = 1 }: AssignTraitRequest = req.body;

      if (!trait_id) {
        res.status(400).json({ error: "Missing required field: trait_id" });
        return;
      }

      // Verify character exists
      const charCheck = await pool.query("SELECT id FROM characters WHERE id = $1", [
        id,
      ]);
      if (charCheck.rows.length === 0) {
        res.status(404).json({ error: "Character not found" });
        return;
      }

      // Verify trait exists and get max level
      const traitCheck = await pool.query(
        "SELECT id, max_level FROM passive_traits WHERE id = $1",
        [trait_id]
      );
      if (traitCheck.rows.length === 0) {
        res.status(400).json({ error: "Invalid trait_id" });
        return;
      }

      const maxLevel = traitCheck.rows[0].max_level;
      if (level > maxLevel) {
        res.status(400).json({
          error: `Trait level (${level}) cannot exceed max level (${maxLevel})`,
        });
        return;
      }

      const result = await pool.query(
        `INSERT INTO character_traits (character_id, trait_id, current_level)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [id, trait_id, level]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error assigning trait:", error);
      if (
        error instanceof Error &&
        error.message.includes("duplicate key")
      ) {
        res.status(409).json({ error: "Character already has this trait" });
      } else {
        res.status(500).json({ error: "Failed to assign trait" });
      }
    }
  });

  // POST /api/characters/:id/skills - Update character skill
  router.post("/:id/skills", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;
      const { skill_id, experience_gained }: UpdateSkillRequest = req.body;

      if (!skill_id || experience_gained === undefined) {
        res.status(400).json({
          error: "Missing required fields: skill_id, experience_gained",
        });
        return;
      }

      // Verify character exists
      const charCheck = await pool.query("SELECT id FROM characters WHERE id = $1", [
        id,
      ]);
      if (charCheck.rows.length === 0) {
        res.status(404).json({ error: "Character not found" });
        return;
      }

      // Verify skill exists
      const skillCheck = await pool.query(
        "SELECT id FROM skills WHERE id = $1",
        [skill_id]
      );
      if (skillCheck.rows.length === 0) {
        res.status(400).json({ error: "Invalid skill_id" });
        return;
      }

      // Check if character already has this skill
      const existingSkill = await pool.query(
        "SELECT * FROM character_skills WHERE character_id = $1 AND skill_id = $2",
        [id, skill_id]
      );

      let result;
      if (existingSkill.rows.length === 0) {
        // Create new skill entry
        result = await pool.query(
          `INSERT INTO character_skills (character_id, skill_id, experience)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [id, skill_id, experience_gained]
        );
      } else {
        // Update existing skill
        const newExperience = existingSkill.rows[0].experience + experience_gained;
        result = await pool.query(
          `UPDATE character_skills
           SET experience = $1, updated_at = CURRENT_TIMESTAMP
           WHERE character_id = $2 AND skill_id = $3
           RETURNING *`,
          [newExperience, id, skill_id]
        );
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating character skill:", error);
      res.status(500).json({ error: "Failed to update character skill" });
    }
  });

  return router;
};
