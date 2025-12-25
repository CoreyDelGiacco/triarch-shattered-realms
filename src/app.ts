import express, { Request, Response } from "express";
import { Database } from "./db";
import { createFactionsRouter } from "./routes/factions";
import { createClassesRouter } from "./routes/classes";
import { createZonesRouter } from "./routes/zones";
import { createSkillsRouter } from "./routes/skills";
import { createCharactersRouter } from "./routes/characters";
import { createAuthRouter } from "./routes/auth";
import { createWorldRouter } from "./routes/world";
import { createInventoryRouter } from "./routes/inventory";
import { GameData } from "./data/gameData";

export const createApp = (db: Database, gameData: GameData) => {
  const app = express();
  app.use(express.json());

  app.get("/health", async (_req: Request, res: Response) => {
    const dbStatus = await db.connect();
    const ok = dbStatus === "ok" || dbStatus === "skipped";

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      db: dbStatus,
    });
  });

  // API routes
  app.use("/api/factions", createFactionsRouter(db));
  app.use("/api/classes", createClassesRouter(db));
  app.use("/api/zones", createZonesRouter(db));
  app.use("/api/skills", createSkillsRouter(db));
  app.use("/api/characters", createCharactersRouter(db));
  app.use("/api/auth", createAuthRouter(db));
  app.use("/api/world", createWorldRouter(db));
  app.use("/api/inventory", createInventoryRouter(db, gameData));

  return app;
};
