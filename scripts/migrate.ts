import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../src/config";
import { Database } from "../src/db";

const migrationsDir = path.resolve(__dirname, "..", "migrations");

const run = async () => {
  const config = loadConfig();
  if (config.SKIP_DB) {
    throw new Error("Cannot run migrations when SKIP_DB=true.");
  }

  const db = new Database(config.DATABASE_URL, false);
  const pool = db.getPool();

  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, run_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const id = file;
    const existing = await pool.query(
      "SELECT id FROM schema_migrations WHERE id = $1",
      [id]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
      await pool.query("COMMIT");
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  await db.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
