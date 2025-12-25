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

  describe("POST /api/world/zone-enter", () => {
    it("returns 400 for invalid payload", async () => {
      const response = await request(app)
        .post("/api/world/zone-enter")
        .send({
          character_id: "bad",
          zone_id: null,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("GET /api/world/state/:characterId", () => {
    it("returns 400 for invalid character id", async () => {
      const response = await request(app).get("/api/world/state/not-a-number");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("GET /api/inventory/:characterId", () => {
    it("returns 400 for invalid character id", async () => {
      const response = await request(app).get("/api/inventory/not-a-number");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("POST /api/inventory/:characterId/add", () => {
    it("returns 400 for invalid payload", async () => {
      const response = await request(app)
        .post("/api/inventory/1/add")
        .send({
          item_code: "",
          quantity: -3,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("POST /api/inventory/:characterId/remove", () => {
    it("returns 400 for invalid payload", async () => {
      const response = await request(app)
        .post("/api/inventory/1/remove")
        .send({
          item_code: "NOPE",
          quantity: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("INVALID_INPUT");
    });
  });
});
