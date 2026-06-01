import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./validate.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
  }
  console.error("[api] unhandled error:", err);
  return res
    .status(500)
    .json({ error: { code: "INTERNAL", message: "Internal server error" } });
}
