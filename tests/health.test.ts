import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { Database } from "../src/db";
import { createApp } from "../src/app";

const buildApp = () => {
  const db = new Database("postgres://example", true);
  return createApp(db);
};

describe("GET /health", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = buildApp();
  });

  it("returns ok when database is skipped", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      db: "skipped",
    });
  });
});
