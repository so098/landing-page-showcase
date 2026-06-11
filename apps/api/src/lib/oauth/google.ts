import {
  type OAuthProvider,
  type OAuthProfile,
  type ProviderConfig,
  callbackUrl,
} from "./provider.js";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

// 구글 OAuth 2.0 Authorization Code 흐름 구현. 스코프: openid email profile.
export function createGoogleProvider(config: ProviderConfig): OAuthProvider {
  const redirectUri = callbackUrl(config.redirectBase, "google");

  return {
    name: "google",

    getAuthUrl(state: string): string {
      const q = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
      });
      return `${AUTH_ENDPOINT}?${q.toString()}`;
    },

    async exchangeCode(code: string): Promise<{ accessToken: string }> {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      if (!res.ok) {
        throw new Error(`google token exchange ${res.status}`);
      }
      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) throw new Error("google token: access_token 없음");
      return { accessToken: data.access_token };
    },

    async fetchProfile(accessToken: string): Promise<OAuthProfile> {
      const res = await fetch(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`google userinfo ${res.status}`);
      }
      const data = (await res.json()) as {
        id: string;
        email?: string;
        name?: string;
        picture?: string;
      };
      return {
        provider: "google",
        providerId: data.id,
        email: data.email ?? null,
        // 이름이 비어 오면 이메일 로컬파트로 폴백.
        name: data.name ?? data.email?.split("@")[0] ?? "사용자",
        avatarUrl: data.picture ?? null,
      };
    },
  };
}
