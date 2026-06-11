import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  AI_LANDING_OUTPUT_DIR: z.string().optional(),
  ASSETS_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default("ap-northeast-2"),
  // ── OAuth / 세션 ──
  // provider 시크릿은 미설정 가능(optional) — 미설정 시 해당 버튼 비활성.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  KAKAO_CLIENT_ID: z.string().optional(),
  KAKAO_CLIENT_SECRET: z.string().optional(),
  // 콜백 절대 URL 구성용 베이스 (dev: http://localhost:4000, prod: ALB/도메인)
  OAUTH_REDIRECT_BASE: z.string().default("http://localhost:4000"),
  // 세션 쿠키 Secure 플래그 (prod true). cross-site(SameSite=None)는 Secure 필수.
  SESSION_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SESSION_TTL_DAYS: z.coerce.number().default(7),
});

export const env = EnvSchema.parse(process.env);
