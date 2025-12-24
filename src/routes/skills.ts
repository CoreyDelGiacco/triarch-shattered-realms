import { Router } from "express";
import { Database } from "../db";
import { Skill } from "../types";

export const createSkillsRouter = (db: Database) => {
  const router = Router();

  // GET /api/skills - List all skills
  router.get("/", async (req, res) => {
    try {
      const pool = db.getPool();
      const { category } = req.query;

      let query = "SELECT * FROM skills";
      const params: unknown[] = [];

      if (category) {
        query += " WHERE category = $1";
        params.push(category);
      }

      query += " ORDER BY category, name";

      const result = await pool.query<Skill>(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  // GET /api/skills/:id - Get specific skill
  router.get("/:id", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;
      const result = await pool.query<Skill>(
        "SELECT * FROM skills WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching skill:", error);
      res.status(500).json({ error: "Failed to fetch skill" });
    }
  });

  return router;
};
