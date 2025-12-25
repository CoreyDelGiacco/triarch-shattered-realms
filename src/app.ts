import express, { Request, Response } from "express";
import path from "node:path";
import { Database } from "./db";
import { createFactionsRouter } from "./routes/factions";
import { createClassesRouter } from "./routes/classes";
import { createZonesRouter } from "./routes/zones";
import { createSkillsRouter } from "./routes/skills";
import { createCharactersRouter } from "./routes/characters";
import { createAuthRouter } from "./routes/auth";
import { createWorldRouter } from "./routes/world";
import { createInventoryRouter } from "./routes/inventory";
import { createGatheringRouter } from "./routes/gathering";
import { createCombatRouter } from "./routes/combat";
import { createLootRouter } from "./routes/loot";
import { createBetrayalRouter } from "./routes/betrayal";
import { createReputationRouter } from "./routes/reputation";
import { GameData } from "./data/gameData";

export const createApp = (db: Database, gameData: GameData) => {
  const app = express();
  app.use(express.json());

  const publicDir = path.resolve(process.cwd(), "public");
  app.use(express.static(publicDir));

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
  app.use("/api/gathering", createGatheringRouter(db, gameData));
  app.use("/api/combat", createCombatRouter(db));
  app.use("/api/loot", createLootRouter(db, gameData));
  app.use("/api/betrayal", createBetrayalRouter(db));
  app.use("/api/reputation", createReputationRouter(db));

  return app;
};
