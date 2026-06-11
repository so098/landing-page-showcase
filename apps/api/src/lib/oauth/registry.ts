import type { OAuthProviderName } from "@melstudio/shared";
import { env } from "../env.js";
import type { OAuthProvider, ProviderConfig } from "./provider.js";
import { createGoogleProvider } from "./google.js";
import { createKakaoProvider } from "./kakao.js";

// env에서 provider를 빌드. client id/secret이 없으면 null(버튼 비활성).
function buildFromEnv(): Map<OAuthProviderName, OAuthProvider> {
  const map = new Map<OAuthProviderName, OAuthProvider>();
  const base = env.OAUTH_REDIRECT_BASE;

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    const config: ProviderConfig = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectBase: base,
    };
    map.set("google", createGoogleProvider(config));
  } else {
    console.warn("[auth] GOOGLE_CLIENT_ID/SECRET 미설정 — 구글 로그인 비활성");
  }

  if (env.KAKAO_CLIENT_ID && env.KAKAO_CLIENT_SECRET) {
    const config: ProviderConfig = {
      clientId: env.KAKAO_CLIENT_ID,
      clientSecret: env.KAKAO_CLIENT_SECRET,
      redirectBase: base,
    };
    map.set("kakao", createKakaoProvider(config));
  } else {
    console.warn("[auth] KAKAO_CLIENT_ID/SECRET 미설정 — 카카오 로그인 비활성");
  }

  return map;
}

let registry: Map<OAuthProviderName, OAuthProvider> | null = null;
// 테스트 주입용 override. 설정된 키는 env 빌드보다 우선한다.
const overrides = new Map<OAuthProviderName, OAuthProvider | null>();

function ensureRegistry(): Map<OAuthProviderName, OAuthProvider> {
  if (!registry) registry = buildFromEnv();
  return registry;
}

// provider 이름으로 구현을 얻는다. 미지원/미설정이면 null.
export function getProvider(name: string): OAuthProvider | null {
  if (overrides.has(name as OAuthProviderName)) {
    return overrides.get(name as OAuthProviderName) ?? null;
  }
  return ensureRegistry().get(name as OAuthProviderName) ?? null;
}

// 설정된(활성) provider 이름 목록. web 버튼 활성 판단에 쓸 수 있다.
export function enabledProviders(): OAuthProviderName[] {
  const reg = ensureRegistry();
  const names = new Set<OAuthProviderName>(reg.keys());
  for (const [name, provider] of overrides) {
    if (provider) names.add(name);
    else names.delete(name);
  }
  return [...names];
}

// ── 테스트 전용 주입 시드 ──
export function setProviderForTest(
  name: OAuthProviderName,
  provider: OAuthProvider | null,
): void {
  overrides.set(name, provider);
}

export function resetProvidersForTest(): void {
  overrides.clear();
}
