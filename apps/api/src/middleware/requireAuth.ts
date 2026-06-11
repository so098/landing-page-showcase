import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./validate.js";

// 세션 미들웨어가 채운 req.user가 없으면 401. 보호가 필요한 라우트 앞에 단다.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new ApiError(401, "UNAUTHENTICATED", "로그인이 필요해요"));
    return;
  }
  next();
}
