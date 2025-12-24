import { Router, Request, Response } from "express";
import { Database } from "../db";
import { Class, Ability, PassiveTrait } from "../types";

export const createClassesRouter = (db: Database) => {
  const router = Router();

  // GET /api/classes - List all classes
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const pool = db.getPool();
      const result = await pool.query<Class>(
        `SELECT c.*, f.name as faction_name, f.code as faction_code
         FROM classes c
         LEFT JOIN factions f ON c.faction_id = f.id
         ORDER BY c.id`
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  // GET /api/classes/:id - Get specific class with abilities and traits
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;

      // Get class details
      const classResult = await pool.query<Class>(
        `SELECT c.*, f.name as faction_name, f.code as faction_code
         FROM classes c
         LEFT JOIN factions f ON c.faction_id = f.id
         WHERE c.id = $1`,
        [id]
      );

      if (classResult.rows.length === 0) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      // Get abilities for this class
      const abilitiesResult = await pool.query<Ability>(
        "SELECT * FROM abilities WHERE class_id = $1 ORDER BY ability_type, cooldown_seconds",
        [id]
      );

      // Get passive traits for this class
      const traitsResult = await pool.query<PassiveTrait>(
        "SELECT * FROM passive_traits WHERE class_id = $1 ORDER BY id",
        [id]
      );

      res.json({
        ...classResult.rows[0],
        abilities: abilitiesResult.rows,
        passive_traits: traitsResult.rows,
      });
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ error: "Failed to fetch class" });
    }
  });

  return router;
};
