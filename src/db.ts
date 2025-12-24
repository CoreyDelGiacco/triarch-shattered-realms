import { Pool } from "pg";

export type DatabaseStatus = "ok" | "skipped" | "error";

export class Database {
  private pool: Pool | null;

  constructor(private readonly databaseUrl: string, private readonly skip: boolean) {
    this.pool = this.skip ? null : new Pool({ connectionString: databaseUrl });
  }

  async connect(): Promise<DatabaseStatus> {
    if (!this.pool) {
      return "skipped";
    }

    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      return "ok";
    } catch (error) {
      return "error";
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error("Database is disabled. Set SKIP_DB=false to enable.");
    }

    return this.pool;
  }

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
  }
}
