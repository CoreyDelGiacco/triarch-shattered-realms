import { Router } from "express";
import { Database } from "../db";
import { Zone } from "../types";

export const createZonesRouter = (db: Database) => {
  const router = Router();

  // GET /api/zones - List all zones
  router.get("/", async (_req, res) => {
    try {
      const pool = db.getPool();
      const result = await pool.query<Zone>(
        "SELECT * FROM zones ORDER BY risk_level, id"
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching zones:", error);
      res.status(500).json({ error: "Failed to fetch zones" });
    }
  });

  // GET /api/zones/:id - Get specific zone
  router.get("/:id", async (req, res) => {
    try {
      const pool = db.getPool();
      const { id } = req.params;
      const result = await pool.query<Zone>(
        "SELECT * FROM zones WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Zone not found" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching zone:", error);
      res.status(500).json({ error: "Failed to fetch zone" });
    }
  });

  return router;
};
