import { Request, Response, NextFunction } from "express";
import { Database } from "../db";
import { PlayerSession } from "../types";
import { sendError } from "../utils/errors";

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

export interface AuthenticatedLocals {
  player: {
    id: number;
    email: string;
    display_name: string;
  };
}

export const requireSession = (db: Database) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = getBearerToken(req);
    if (!token) {
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
        [token]
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

      res.locals.player = {
        id: session.player_id,
        email: session.email,
        display_name: session.display_name,
      } satisfies AuthenticatedLocals["player"];

      next();
    } catch (error) {
      console.error("Error validating session:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to validate session.");
    }
  };
};
