import { Response } from "express";

export const sendError = (
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
