import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../lib/prisma";
import type { OAuthProfile } from "../lib/oauth/provider";
import {
  upsertUserFromProfile,
  createSession,
  getSessionUser,
  revokeSession,
} from "./auth.service";

const googleProfile: OAuthProfile = {
  provider: "google",
  providerId: "g-123",
  email: "boss@example.com",
  name: "홍길동",
  avatarUrl: "https://img/a.png",
};

beforeEach(async () => {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

describe("upsertUserFromProfile", () => {
  it("신규 프로필이면 유저를 생성하고 AuthUser를 반환한다", async () => {
    const user = await upsertUserFromProfile(googleProfile);
    expect(user.id).toBeTruthy();
    expect(user.name).toBe("홍길동");
    expect(user.email).toBe("boss@example.com");
    expect(user.provider).toBe("google");
    // 민감정보(providerId)는 노출하지 않는다
    expect(user).not.toHaveProperty("providerId");
    expect(await prisma.user.count()).toBe(1);
  });

  it("같은 (provider, providerId)면 새 유저를 만들지 않고 이름/이메일을 갱신한다", async () => {
    const first = await upsertUserFromProfile(googleProfile);
    const second = await upsertUserFromProfile({
      ...googleProfile,
      name: "홍길동2",
      email: "new@example.com",
    });
    expect(second.id).toBe(first.id); // 동일 유저
    expect(second.name).toBe("홍길동2");
    expect(second.email).toBe("new@example.com");
    expect(await prisma.user.count()).toBe(1);
  });

  it("provider가 다르면 providerId가 같아도 별도 유저다", async () => {
    await upsertUserFromProfile(googleProfile);
    const kakao = await upsertUserFromProfile({
      ...googleProfile,
      provider: "kakao",
    });
    expect(kakao.provider).toBe("kakao");
    expect(await prisma.user.count()).toBe(2);
  });
});

describe("세션 생성/조회/만료/폐기", () => {
  it("createSession 후 getSessionUser로 유저를 조회한다", async () => {
    const user = await upsertUserFromProfile(googleProfile);
    const session = await createSession(user.id);
    expect(session.id).toBeTruthy();
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const resolved = await getSessionUser(session.id);
    expect(resolved?.id).toBe(user.id);
  });

  it("만료된 세션은 null을 반환하고 row를 삭제한다", async () => {
    const user = await upsertUserFromProfile(googleProfile);
    // 과거 만료 시각으로 직접 생성
    const expired = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });

    const resolved = await getSessionUser(expired.id);
    expect(resolved).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: expired.id } })).toBeNull();
  });

  it("존재하지 않는 세션 ID는 null", async () => {
    expect(await getSessionUser("nope")).toBeNull();
  });

  it("revokeSession 후에는 getSessionUser가 null", async () => {
    const user = await upsertUserFromProfile(googleProfile);
    const session = await createSession(user.id);
    await revokeSession(session.id);
    expect(await getSessionUser(session.id)).toBeNull();
  });
});
