import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { Database } from "../src/db";
import { createApp } from "../src/app";

const buildApp = () => {
  const db = new Database("postgres://example", true);
  return createApp(db);
};

describe("API Endpoints", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = buildApp();
  });

  describe("GET /api/factions", () => {
    it("returns 500 when database is disabled", async () => {
      const response = await request(app).get("/api/factions");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/classes", () => {
    it("returns 500 when database is disabled", async () => {
      const response = await request(app).get("/api/classes");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/zones", () => {
    it("returns 500 when database is disabled", async () => {
      const response = await request(app).get("/api/zones");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/skills", () => {
    it("returns 500 when database is disabled", async () => {
      const response = await request(app).get("/api/skills");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /api/characters", () => {
    it("returns 500 when database is disabled", async () => {
      const response = await request(app)
        .post("/api/characters")
        .send({
          name: "TestCharacter",
          faction_id: 1,
          class_id: 1,
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });
});
