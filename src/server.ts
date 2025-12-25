import { loadConfig } from "./config";
import { Database } from "./db";
import { createApp } from "./app";
import { loadGameData } from "./data/gameData";

const config = loadConfig();
const db = new Database(config.DATABASE_URL, config.SKIP_DB ?? false);
const gameData = loadGameData();
const app = createApp(db, gameData);

const server = app.listen(config.PORT, () => {
  console.log(`Triarch server listening on :${config.PORT}`);
});

const shutdown = async () => {
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
