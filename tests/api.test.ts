import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { Database } from "../src/db";
import { createApp } from "../src/app";
import { loadGameData } from "../src/data/gameData";

const buildApp = () => {
  const db = new Database("postgres://example", true);
  const gameData = loadGameData();
  return createApp(db, gameData);
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

  describe("POST /api/auth/register", () => {
    it("returns 400 for invalid payload", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "not-an-email",
          password: "short",
          display_name: "Hi",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 400 for invalid payload", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "invalid",
          password: "short",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 when token is missing", async () => {
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Protected routes", () => {
    it("returns 401 for missing token on /api/characters", async () => {
      const response = await request(app).get("/api/characters");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for missing token on /api/world/zone-enter", async () => {
      const response = await request(app)
        .post("/api/world/zone-enter")
        .send({
          character_id: 1,
          zone_id: 1,
          position: { x: 1, y: 1 },
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for missing token on /api/inventory", async () => {
      const response = await request(app).get("/api/inventory/1");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for missing token on /api/gathering/attempt", async () => {
      const response = await request(app)
        .post("/api/gathering/attempt")
        .send({
          character_id: 1,
          node_code: "COPPER_VEIN",
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for missing token on /api/combat/attack", async () => {
      const response = await request(app)
        .post("/api/combat/attack")
        .send({
          character_id: 1,
          npc_id: 1,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for missing token on /api/loot/containers", async () => {
      const response = await request(app).get("/api/loot/containers/1");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for missing token on /api/betrayal/start", async () => {
      const response = await request(app)
        .post("/api/betrayal/start")
        .send({
          character_id: 1,
          target_faction_id: 2,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
