import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { Database } from "../db";
import { createRateLimiter } from "../middleware/rateLimit";
import { Player, PlayerSession } from "../types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  display_name: z.string().min(3).max(24),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const sessionSchema = z.object({
  token: z.string().min(32),
});

const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>
) => {
  res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
};

const hashPassword = async (password: string, salt: string): Promise<string> => {
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });

  return derived.toString("hex");
};

const generateToken = () => crypto.randomBytes(32).toString("hex");

const getBearerToken = (req: Request): string | null => {
  const header = req.header("authorization");
  if (!header) {
    return null;
  }

  const [scheme, value] = header.split(" ");
  if (scheme !== "Bearer" || !value) {
    return null;
  }

  return value;
};

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const createAuthRouter = (db: Database) => {
  const router = Router();

  const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
  const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 8 });

  router.post("/register", registerLimiter, async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid registration payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const { email, password, display_name } = parsed.data;

      const existing = await pool.query("SELECT id FROM players WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        sendError(res, 409, "EMAIL_TAKEN", "Email is already registered.");
        return;
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = await hashPassword(password, salt);

      const result = await pool.query<Player>(
        `INSERT INTO players (email, display_name, password_hash, password_salt)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name, created_at`,
        [email, display_name, hash, salt]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error registering player:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to register player.");
    }
  });

  router.post("/login", loginLimiter, async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid login payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const { email, password } = parsed.data;

      const playerResult = await pool.query<Player & { password_hash: string; password_salt: string }>(
        "SELECT id, email, display_name, password_hash, password_salt FROM players WHERE email = $1",
        [email]
      );

      if (playerResult.rows.length === 0) {
        sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
        return;
      }

      const player = playerResult.rows[0];
      const computedHash = await hashPassword(password, player.password_salt);
      if (computedHash !== player.password_hash) {
        sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
        return;
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

      await pool.query<PlayerSession>(
        `INSERT INTO player_sessions (player_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [player.id, token, expiresAt]
      );

      res.json({
        token,
        expires_at: expiresAt.toISOString(),
        player: {
          id: player.id,
          email: player.email,
          display_name: player.display_name,
        },
      });
    } catch (error) {
      console.error("Error logging in:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to login.");
    }
  });

  router.get("/me", async (req: Request, res: Response) => {
    const token = getBearerToken(req);
    const parsed = sessionSchema.safeParse({ token });
    if (!parsed.success) {
      sendError(res, 401, "UNAUTHORIZED", "Missing or invalid session token.");
      return;
    }

    try {
      const pool = db.getPool();
      const sessionResult = await pool.query<
        PlayerSession & { email: string; display_name: string }
      >(
        `SELECT ps.id, ps.player_id, ps.token, ps.created_at, ps.expires_at,
                p.email, p.display_name
         FROM player_sessions ps
         JOIN players p ON ps.player_id = p.id
         WHERE ps.token = $1`,
        [parsed.data.token]
      );

      if (sessionResult.rows.length === 0) {
        sendError(res, 401, "UNAUTHORIZED", "Session not found.");
        return;
      }

      const session = sessionResult.rows[0];
      if (new Date(session.expires_at).getTime() <= Date.now()) {
        sendError(res, 401, "SESSION_EXPIRED", "Session has expired.");
        return;
      }

      res.json({
        player: {
          id: session.player_id,
          email: session.email,
          display_name: session.display_name,
        },
        session: {
          token: session.token,
          created_at: session.created_at,
          expires_at: session.expires_at,
        },
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch session.");
    }
  });

  return router;
};
