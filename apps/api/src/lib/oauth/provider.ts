import type { OAuthProviderName } from "@melstudio/shared";

// 공급자(구글/카카오)에서 받아온 정규화된 프로필. 동의항목 = 이름 + 이메일.
export type OAuthProfile = {
  provider: OAuthProviderName;
  providerId: string; // 공급자 측 고유 ID (문자열로 정규화)
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

// provider 추상화 — 라우트 콜백 로직을 실제 콘솔/네트워크 없이 테스트하기 위한 경계.
// 테스트에서는 이 인터페이스를 구현한 fake를 registry에 주입한다.
export interface OAuthProvider {
  readonly name: OAuthProviderName;
  // CSRF용 state를 실어 공급자 동의 URL을 만든다.
  getAuthUrl(state: string): string;
  // authorization code → access_token 교환.
  exchangeCode(code: string): Promise<{ accessToken: string }>;
  // access_token으로 프로필(이름/이메일) 조회.
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

// 각 provider 구현이 공유하는 설정. redirectBase로 콜백 절대 URL을 만든다.
export type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectBase: string; // 예: http://localhost:4000
};

// 콜백 redirect_uri — 공급자 콘솔에 등록한 값과 정확히 일치해야 한다.
export function callbackUrl(redirectBase: string, provider: OAuthProviderName): string {
  return `${redirectBase}/api/auth/${provider}/callback`;
}
