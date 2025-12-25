import { Request } from "express";

export interface SuspiciousActionContext {
  player_id?: number;
  character_id?: number;
  zone_id?: number;
  action: string;
  reason: string;
}

const getRequestIp = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.ip;
};

export const logSuspiciousAction = (req: Request, context: SuspiciousActionContext) => {
  console.warn("Suspicious action", {
    ...context,
    ip: getRequestIp(req),
  });
};
