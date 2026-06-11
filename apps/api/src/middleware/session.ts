import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "@melstudio/shared";
import { getSessionUser } from "../services/auth.service.js";

export const SESSION_COOKIE = "melstudio_session";

// Express Request에 인증 유저를 부착하기 위한 타입 확장.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// melstudio_session 쿠키 → getSessionUser → req.user 부착.
// 세션이 없거나 만료면 그냥 통과한다(보호는 각 라우트가 401로 판단).
export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionId = (req.cookies as Record<string, string> | undefined)?.[
    SESSION_COOKIE
  ];
  if (sessionId) {
    try {
      const user = await getSessionUser(sessionId);
      if (user) req.user = user;
    } catch (err) {
      // 세션 조회 실패는 비로그인으로 처리(흐름을 막지 않는다). 원인은 로깅만.
      console.error("[auth] 세션 조회 실패:", err);
    }
  }
  next();
}
