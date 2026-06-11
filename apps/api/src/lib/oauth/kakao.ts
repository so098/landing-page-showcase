import {
  type OAuthProvider,
  type OAuthProfile,
  type ProviderConfig,
  callbackUrl,
} from "./provider.js";

const AUTH_ENDPOINT = "https://kauth.kakao.com/oauth/authorize";
const TOKEN_ENDPOINT = "https://kauth.kakao.com/oauth/token";
const USERINFO_ENDPOINT = "https://kapi.kakao.com/v2/user/me";

// 카카오 로그인 Authorization Code 흐름 구현. 동의항목: 닉네임 + 카카오계정 이메일.
export function createKakaoProvider(config: ProviderConfig): OAuthProvider {
  const redirectUri = callbackUrl(config.redirectBase, "kakao");

  return {
    name: "kakao",

    getAuthUrl(state: string): string {
      const q = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "account_email profile_nickname profile_image",
        state,
      });
      return `${AUTH_ENDPOINT}?${q.toString()}`;
    },

    async exchangeCode(code: string): Promise<{ accessToken: string }> {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          code,
        }),
      });
      if (!res.ok) {
        throw new Error(`kakao token exchange ${res.status}`);
      }
      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) throw new Error("kakao token: access_token 없음");
      return { accessToken: data.access_token };
    },

    async fetchProfile(accessToken: string): Promise<OAuthProfile> {
      const res = await fetch(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`kakao userinfo ${res.status}`);
      }
      const data = (await res.json()) as {
        id: number;
        kakao_account?: {
          email?: string;
          profile?: { nickname?: string; profile_image_url?: string };
        };
      };
      const account = data.kakao_account ?? {};
      const profile = account.profile ?? {};
      return {
        provider: "kakao",
        providerId: String(data.id),
        email: account.email ?? null,
        name: profile.nickname ?? "사용자",
        avatarUrl: profile.profile_image_url ?? null,
      };
    },
  };
}
