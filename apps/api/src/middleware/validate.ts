import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Invalid query",
        ),
      );
    }
    (req as Request & { valid?: { query?: unknown } }).valid = {
      ...(req as Request & { valid?: { query?: unknown } }).valid,
      query: parsed.data,
    };
    next();
  };
}

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Invalid body",
        ),
      );
    }
    (req as Request & { valid?: { body?: unknown } }).valid = {
      ...(req as Request & { valid?: { body?: unknown } }).valid,
      body: parsed.data,
    };
    next();
  };
}
