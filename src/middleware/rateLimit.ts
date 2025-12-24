import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const defaultKeyGenerator = (req: Request) => req.ip;

export const createRateLimiter = ({
  windowMs,
  max,
  keyGenerator = defaultKeyGenerator,
}: RateLimitOptions) => {
  const store = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please slow down.",
        },
      });
      return;
    }

    entry.count += 1;
    store.set(key, entry);
    next();
  };
};
