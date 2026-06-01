// 목(mock) 인증 헬퍼 — localStorage 기반.
// 실제 OAuth(카카오/구글) 연동 전 단계로, 클라이언트에서만 동작한다.
// (백엔드/세션 연동 시 토큰 기반 조회로 대체 예정)

export type User = { name: string };

const AUTH_KEY = "melstudio:user";
const AUTH_EVENT = "melstudio:auth";

// 로그인 상태 변화를 같은 탭 안에서도 구독할 수 있게 커스텀 이벤트를 쏜다.
function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function login(name: string): User {
  const user: User = { name };
  if (typeof window === "undefined") return user;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  emitChange();
  return user;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  emitChange();
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// 로그인 상태가 바뀔 때 콜백을 부르는 구독 헬퍼. 해제 함수를 돌려준다.
export function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback); // 다른 탭 동기화
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
