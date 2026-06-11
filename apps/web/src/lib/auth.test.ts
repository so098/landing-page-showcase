import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// auth.ts는 모듈 레벨 스토어를 쓰므로 테스트마다 모듈을 리셋해 깨끗한 상태로 시작한다.
const meUser = {
  id: "u1",
  name: "홍길동",
  email: "boss@example.com",
  avatarUrl: null,
  provider: "google" as const,
};

function stubFetch(impl: typeof fetch) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getUser / refreshUser", () => {
  it("초기엔 null이고, /me가 200이면 유저를 반환하며 구독자에게 알린다", async () => {
    stubFetch(
      (async () => ({ ok: true, json: async () => meUser })) as unknown as typeof fetch,
    );
    const auth = await import("./auth");
    expect(auth.getUser()).toBeNull();

    const cb = vi.fn();
    auth.subscribe(cb);
    await auth.refreshUser();

    expect(auth.getUser()?.name).toBe("홍길동");
    expect(cb).toHaveBeenCalled();
  });

  it("/me가 401이면 비로그인(null)으로 둔다", async () => {
    stubFetch(
      (async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as typeof fetch,
    );
    const auth = await import("./auth");
    await auth.refreshUser();
    expect(auth.getUser()).toBeNull();
  });
});

describe("logout", () => {
  it("logout 호출 후 유저가 null이 되고 구독자에게 알린다", async () => {
    stubFetch(
      (async () => ({ ok: true, json: async () => meUser })) as unknown as typeof fetch,
    );
    const auth = await import("./auth");
    await auth.refreshUser();
    expect(auth.getUser()).not.toBeNull();

    const cb = vi.fn();
    auth.subscribe(cb);
    cb.mockClear();
    await auth.logout();

    expect(auth.getUser()).toBeNull();
    expect(cb).toHaveBeenCalled();
  });
});

describe("startLogin", () => {
  it("provider 동의 시작 URL로 이동하며 현재 경로를 redirect로 전달한다", async () => {
    stubFetch(
      (async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as typeof fetch,
    );
    const auth = await import("./auth");
    const loc = { href: "", pathname: "/mypage", search: "" };
    Object.defineProperty(window, "location", {
      value: loc,
      writable: true,
      configurable: true,
    });

    auth.startLogin("google");
    expect(loc.href).toContain("/api/auth/google?redirect=");
    expect(loc.href).toContain(encodeURIComponent("/mypage"));
  });
});
