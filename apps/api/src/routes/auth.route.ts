import { Router, type CookieOptions, type Response } from "express";
import { randomUUID } from "node:crypto";
import { env } from "../lib/env.js";
import { getProvider, enabledProviders } from "../lib/oauth/registry.js";
import {
  upsertUserFromProfile,
  createSession,
  revokeSession,
} from "../services/auth.service.js";
import { SESSION_COOKIE } from "../middleware/session.js";

export const authRouter = Router();

const STATE_COOKIE = "oauth_state";
const REDIRECT_COOKIE = "oauth_redirect";
const STATE_TTL_MS = 10 * 60 * 1000; // state 쿠키 수명 10분

// 세션 쿠키 옵션. prod(cross-site)는 SameSite=None;Secure, dev(same-site)는 Lax.
function sessionCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SECURE ? "none" : "lax",
    path: "/",
    maxAge: maxAgeMs,
  };
}

// 오픈 리다이렉트 방지: 내부 절대경로("/...")만 허용, protocol-relative("//")는 거부.
function safeRedirectPath(value: unknown): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

// 에러 시 web으로 일반 메시지만 전달(시크릿/원문은 서버 로그에만).
function redirectWebError(res: Response, code: string): void {
  res.redirect(`${env.WEB_ORIGIN}/?error=${code}`);
}

// 활성(설정된) provider 목록 — web 버튼 활성 판단용.
authRouter.get("/providers", (_req, res) => {
  res.json({ providers: enabledProviders() });
});

// 현재 로그인 유저. 세션 미들웨어가 req.user를 채운다. 없으면 401.
authRouter.get("/me", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "로그인이 필요해요" } });
    return;
  }
  res.json(req.user);
});

// 로그아웃 — 세션 폐기 + 쿠키 제거.
authRouter.post("/logout", async (req, res, next) => {
  try {
    const sessionId = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (sessionId) await revokeSession(sessionId);
    res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(0), maxAge: undefined });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 동의 흐름 시작 — state 쿠키 발급 후 공급자 동의 URL로 302.
authRouter.get("/:provider", (req, res) => {
  const provider = getProvider(req.params.provider);
  if (!provider) {
    redirectWebError(res, "provider");
    return;
  }
  const state = randomUUID();
  const redirect = safeRedirectPath(req.query.redirect);

  const stateOpts: CookieOptions = {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: "lax", // 콜백은 top-level GET 네비게이션 → Lax로 전송됨
    path: "/",
    maxAge: STATE_TTL_MS,
  };
  res.cookie(STATE_COOKIE, state, stateOpts);
  res.cookie(REDIRECT_COOKIE, redirect, stateOpts);

  res.redirect(provider.getAuthUrl(state));
});

// 콜백 — state 검증 → code 교환 → 프로필 조회 → 유저 upsert → 세션 발급 → web으로 302.
authRouter.get("/:provider/callback", async (req, res) => {
  const provider = getProvider(req.params.provider);
  const cookies = (req.cookies as Record<string, string> | undefined) ?? {};
  const cookieState = cookies[STATE_COOKIE];
  const redirect = safeRedirectPath(cookies[REDIRECT_COOKIE]);

  // 사용 후 state 쿠키 제거(1회용).
  res.clearCookie(STATE_COOKIE, { path: "/" });
  res.clearCookie(REDIRECT_COOKIE, { path: "/" });

  if (!provider) {
    redirectWebError(res, "oauth");
    return;
  }

  // CSRF: 쿼리 state == 쿠키 state.
  const queryState = req.query.state;
  if (!queryState || queryState !== cookieState) {
    console.warn("[auth] state 불일치 — CSRF 의심, 거부");
    redirectWebError(res, "csrf");
    return;
  }

  const code = req.query.code;
  if (typeof code !== "string" || !code) {
    redirectWebError(res, "oauth");
    return;
  }

  try {
    const { accessToken } = await provider.exchangeCode(code);
    const profile = await provider.fetchProfile(accessToken);
    const user = await upsertUserFromProfile(profile);
    const session = await createSession(user.id);
    const maxAgeMs = Math.max(0, session.expiresAt.getTime() - Date.now());
    res.cookie(SESSION_COOKIE, session.id, sessionCookieOptions(maxAgeMs));
    res.redirect(`${env.WEB_ORIGIN}${redirect}`);
  } catch (err) {
    // 시크릿/원문 응답은 로그에만, 사용자에겐 일반 메시지.
    console.error("[auth] OAuth 콜백 실패:", err);
    redirectWebError(res, "oauth");
  }
});
