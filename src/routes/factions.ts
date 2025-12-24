import { Router } from "express";
import { Database } from "../db";
import { Faction } from "../types";

export const createFactionsRouter = (db: Database) => {
  const router = Router();

  // GET /api/factions - List all factions
  router.get("/", async (_req, res) => {
    try {
      const pool = db.getPool();
      const result = await pool.query<Faction>(
        "SELECT * FROM factions ORDER BY id"
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching factions:", error);
      res.status(500).json({ error: "Failed to fetch factions" });
    }
  });

  // GET /api/factions/:id - Get specific faction
  router.get("/:id", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;
      const result = await pool.query<Faction>(
        "SELECT * FROM factions WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Faction not found" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching faction:", error);
      res.status(500).json({ error: "Failed to fetch faction" });
    }
  });

  return router;
};
