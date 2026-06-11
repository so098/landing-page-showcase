import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import type { OAuthProvider } from "../lib/oauth/provider";
import { setProviderForTest, resetProvidersForTest } from "../lib/oauth/registry";

const app = createApp();

// 실제 구글/카카오 콘솔·네트워크 없이 콜백 흐름을 검증하기 위한 fake provider.
const fakeGoogle: OAuthProvider = {
  name: "google",
  getAuthUrl: (state) => `https://provider.test/authorize?state=${state}`,
  exchangeCode: async (code) => {
    if (code === "bad") throw new Error("교환 실패");
    return { accessToken: `tok-${code}` };
  },
  fetchProfile: async () => ({
    provider: "google",
    providerId: "p-001",
    email: "boss@example.com",
    name: "사장님",
    avatarUrl: null,
  }),
};

// 시작 요청에서 발급된 oauth_state 쿠키 값을 추출한다.
function readStateCookie(setCookie: string[] | undefined): string {
  const raw = (setCookie ?? []).find((c) => c.startsWith("oauth_state="));
  if (!raw) throw new Error("oauth_state 쿠키 없음");
  return decodeURIComponent(raw.split(";")[0].split("=")[1]);
}

beforeEach(async () => {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  resetProvidersForTest();
  setProviderForTest("google", fakeGoogle);
});

afterAll(() => {
  resetProvidersForTest();
});

describe("GET /api/auth/:provider", () => {
  it("설정된 provider면 state 쿠키를 발급하고 동의 URL로 302한다", async () => {
    const res = await request(app).get("/api/auth/google?redirect=/mypage");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("https://provider.test/authorize");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("oauth_state="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("oauth_redirect="))).toBe(true);
  });

  it("미설정 provider면 web으로 에러 리다이렉트한다", async () => {
    const res = await request(app).get("/api/auth/kakao");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=provider");
  });
});

describe("GET /api/auth/:provider/callback", () => {
  it("state가 일치하면 세션 쿠키를 내리고 redirect 경로로 302한다", async () => {
    const agent = request.agent(app); // 쿠키 자동 보존
    const start = await agent.get("/api/auth/google?redirect=/mypage");
    const state = readStateCookie(start.headers["set-cookie"] as unknown as string[]);

    const cb = await agent.get(`/api/auth/google/callback?code=good&state=${state}`);
    expect(cb.status).toBe(302);
    expect(cb.headers.location).toContain("/mypage");
    const cookies = cb.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("melstudio_session="))).toBe(true);

    // 유저가 실제로 생성됐다
    expect(await prisma.user.count()).toBe(1);
  });

  it("state가 불일치하면 거부하고 /?error=csrf로 302한다", async () => {
    const agent = request.agent(app);
    await agent.get("/api/auth/google?redirect=/mypage");
    const cb = await agent.get("/api/auth/google/callback?code=good&state=WRONG");
    expect(cb.status).toBe(302);
    expect(cb.headers.location).toContain("error=csrf");
    const cookies = (cb.headers["set-cookie"] as unknown as string[]) ?? [];
    expect(cookies.some((c) => c.startsWith("melstudio_session="))).toBe(false);
  });

  it("code 교환이 실패하면 /?error=oauth로 302한다", async () => {
    const agent = request.agent(app);
    const start = await agent.get("/api/auth/google");
    const state = readStateCookie(start.headers["set-cookie"] as unknown as string[]);
    const cb = await agent.get(`/api/auth/google/callback?code=bad&state=${state}`);
    expect(cb.status).toBe(302);
    expect(cb.headers.location).toContain("error=oauth");
  });
});

describe("GET /api/auth/me & POST /api/auth/logout", () => {
  it("세션이 없으면 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("로그인 후 /me는 AuthUser를 반환하고, logout 후엔 401이 된다", async () => {
    const agent = request.agent(app);
    const start = await agent.get("/api/auth/google?redirect=/");
    const state = readStateCookie(start.headers["set-cookie"] as unknown as string[]);
    await agent.get(`/api/auth/google/callback?code=good&state=${state}`);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.name).toBe("사장님");
    expect(me.body.provider).toBe("google");
    expect(me.body).not.toHaveProperty("providerId");

    const out = await agent.post("/api/auth/logout");
    expect(out.status).toBe(200);

    const after = await agent.get("/api/auth/me");
    expect(after.status).toBe(401);
  });
});
