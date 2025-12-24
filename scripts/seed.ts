import { loadConfig } from "../src/config";
import { Database } from "../src/db";

const run = async () => {
  const config = loadConfig();
  if (config.SKIP_DB) {
    throw new Error("Cannot seed when SKIP_DB=true.");
  }

  const db = new Database(config.DATABASE_URL, false);
  const pool = db.getPool();

  await pool.query(
    "INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    ["world_name", "Triarch: Shattered Realms"]
  );

  await db.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
