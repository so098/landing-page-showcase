// 인증 헬퍼 — API 세션(httpOnly 쿠키) 기반.
// 기존 목(localStorage) 구현을 대체한다. getUser()/subscribe() 시그니처는 유지해
// 소비처(SiteHeader, mypage, chat) 변경을 최소화하되, 내부는 GET /api/auth/me 로 동작한다.

import { AuthUserSchema, type AuthUser, type OAuthProviderName } from "@melstudio/shared";

export type User = AuthUser;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const AUTH_EVENT = "melstudio:auth";

// ── 모듈 스토어 ──
// 동기 스냅샷을 제공하기 위해 현재 유저를 모듈 변수에 캐시한다.
let currentUser: User | null = null;
let loaded = false;
let inFlight: Promise<void> | null = null;

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

// /api/auth/me 로 현재 세션 유저를 조회해 스토어를 갱신한다.
async function fetchMe(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    currentUser = res.ok ? AuthUserSchema.parse(await res.json()) : null;
  } catch {
    currentUser = null;
  } finally {
    loaded = true;
    inFlight = null;
    emitChange();
  }
}

// 강제 재조회(로그인 직후 등). 진행 중 요청이 있으면 그것을 재사용한다.
export function refreshUser(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = fetchMe();
  return inFlight;
}

// 최초 구독 시 한 번만 /me를 로드한다.
function ensureLoaded(): void {
  if (loaded || inFlight) return;
  void refreshUser();
}

// 현재 유저 스냅샷(동기). 아직 로드 전이면 null.
export function getUser(): User | null {
  return currentUser;
}

// 로그인 상태 변화 구독. 최초 구독 시 /me를 로드한다. 해제 함수를 돌려준다.
export function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, callback);
  ensureLoaded();
  return () => window.removeEventListener(AUTH_EVENT, callback);
}

// 소셜 로그인 시작 — API의 동의 흐름으로 top-level 이동. 현재 경로를 redirect로 전달.
export function startLogin(provider: OAuthProviderName, redirect?: string): void {
  if (typeof window === "undefined") return;
  const target = redirect ?? window.location.pathname + window.location.search;
  window.location.href = `${API_BASE}/api/auth/${provider}?redirect=${encodeURIComponent(target)}`;
}

// 설정(활성)된 provider 목록 — 미설정 provider 버튼을 비활성 처리하는 데 쓴다.
export async function getEnabledProviders(): Promise<OAuthProviderName[]> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/providers`, { credentials: "include" });
    if (!res.ok) return [];
    const data = (await res.json()) as { providers?: OAuthProviderName[] };
    return Array.isArray(data.providers) ? data.providers : [];
  } catch {
    return [];
  }
}

// 로그아웃 — 세션 폐기 후 스토어를 비우고 알린다.
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // 네트워크 실패해도 클라이언트 상태는 비운다.
  } finally {
    currentUser = null;
    loaded = true;
    emitChange();
  }
}
