import express from "express";
import { Database } from "./db";

export const createApp = (db: Database) => {
  const app = express();
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    const dbStatus = await db.connect();
    const ok = dbStatus === "ok" || dbStatus === "skipped";

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      db: dbStatus,
    });
  });

  return app;
};
