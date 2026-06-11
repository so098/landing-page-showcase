import type { AuthUser, OAuthProviderName } from "@melstudio/shared";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import type { OAuthProfile } from "../lib/oauth/provider.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// DB User 행 → 퍼블릭 AuthUser. providerId/세션 등 민감정보는 노출하지 않는다.
function toAuthUser(row: {
  id: string;
  provider: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    provider: row.provider as OAuthProviderName,
  };
}

// (provider, providerId) 기준 upsert. 재로그인 시 이름/이메일/아바타를 최신으로 갱신한다.
export async function upsertUserFromProfile(profile: OAuthProfile): Promise<AuthUser> {
  const row = await prisma.user.upsert({
    where: {
      provider_providerId: {
        provider: profile.provider,
        providerId: profile.providerId,
      },
    },
    update: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
    create: {
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
  });
  return toAuthUser(row);
}

// 세션 생성 — 만료는 SESSION_TTL_DAYS(기본 7일).
export async function createSession(
  userId: string,
): Promise<{ id: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS);
  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });
  return { id: session.id, expiresAt: session.expiresAt };
}

// 세션 ID로 유저 조회. 만료됐으면 row를 삭제하고 null(서버에서 즉시 무효화).
export async function getSessionUser(sessionId: string): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    // 만료 row 청소 — 동시성으로 이미 삭제됐을 수 있어 실패는 무시.
    await prisma.session.deleteMany({ where: { id: sessionId } });
    return null;
  }
  return toAuthUser(session.user);
}

// 로그아웃 — 세션 row 삭제. 없어도 조용히 통과.
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
