# 구글/카카오 OAuth 외부 설정 가이드

날짜: 2026-06-11
대상: 사장님(계정 소유자) — 콘솔 가입/키 발급은 코드로 대신할 수 없는 부분이다.

코드 경로(흐름·세션·UI·테스트)는 모두 구현되어 있다. 아래 키만 발급해 `.env`에
넣으면 실제 로그인이 동작한다. **키가 없으면 해당 소셜 버튼은 자동으로 비활성**된다
(부팅 시 `console.warn`).

콜백 URL 규칙 (양쪽 콘솔에 정확히 일치하게 등록):

```
{OAUTH_REDIRECT_BASE}/api/auth/google/callback
{OAUTH_REDIRECT_BASE}/api/auth/kakao/callback
```

- dev: `OAUTH_REDIRECT_BASE=http://localhost:4000`
- prod: ALB/커스텀 도메인의 HTTPS 주소 (예: `https://api.example.com`)

---

## 1. Google Cloud Console

1. https://console.cloud.google.com → 프로젝트 생성(또는 선택).
2. **API 및 서비스 → OAuth 동의 화면**
   - User Type: **외부(External)**.
   - 앱 이름/지원 이메일 입력. 스코프는 `openid`, `email`, `profile`(기본 제공).
   - 테스트 단계에서는 테스트 사용자에 본인 계정 추가(게시 전).
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**.
   - **승인된 리디렉션 URI**에 추가:
     - dev: `http://localhost:4000/api/auth/google/callback`
     - prod: `https://<api-도메인>/api/auth/google/callback`
4. 생성 후 **클라이언트 ID / 클라이언트 보안 비밀**을 복사 →
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## 2. Kakao Developers

1. https://developers.kakao.com → **내 애플리케이션 → 애플리케이션 추가**.
2. **앱 설정 → 앱 키**: **REST API 키** = `KAKAO_CLIENT_ID`.
3. **카카오 로그인 → 활성화 설정** ON.
4. **카카오 로그인 → Redirect URI** 등록:
   - dev: `http://localhost:4000/api/auth/kakao/callback`
   - prod: `https://<api-도메인>/api/auth/kakao/callback`
5. **카카오 로그인 → 보안 → Client Secret** 발급/활성화 → `KAKAO_CLIENT_SECRET`.
6. **카카오 로그인 → 동의항목**: **닉네임**(profile_nickname), **카카오계정(이메일)**
   (account_email) 사용 설정. 이메일은 검수/비즈앱 전환이 필요할 수 있다.

## 3. .env 설정

`.env`(루트, apps/api가 읽음)에 추가 — `.env.example` 참고:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
OAUTH_REDIRECT_BASE=http://localhost:4000
SESSION_COOKIE_SECURE=false   # prod(HTTPS, cross-site)에서는 true
SESSION_TTL_DAYS=7
```

## 4. prod 주의사항

- 세션 쿠키가 cross-site(`*.vercel.app` ↔ `*.elb.amazonaws.com`)로 오가므로
  `SameSite=None; Secure`가 필요하다 → `SESSION_COOKIE_SECURE=true`,
  그리고 **ALB가 HTTPS를 종단**해야 브라우저가 Secure 쿠키를 저장/전송한다.
- API의 CORS는 `WEB_ORIGIN`(웹 도메인)으로 제한되며 `credentials: true`이다.
  웹의 `NEXT_PUBLIC_API_URL`이 API 도메인을 정확히 가리켜야 쿠키가 동봉된다.

---

## 수동 스모크 테스트 절차

자동 테스트(서비스/라우트/웹 lib)는 fake provider로 흐름을 검증한다. 실제 공급자
연동은 키 발급 후 아래로 1회 확인한다.

1. 루트에서 `npm start`(또는 `npm run dev`) — api(4000) + web(3000) 기동.
2. 브라우저로 http://localhost:3000 접속 → 헤더 **로그인** → 모달에서
   **카카오/구글로 시작하기** 클릭(키가 설정돼 있어야 버튼 활성).
3. 공급자 동의 화면 → 동의 → `/mypage`(또는 시작 페이지)로 돌아오고 헤더가
   로그인 상태(내정보/로그아웃)로 바뀌면 성공.
4. **로그아웃** 클릭 → 다시 비로그인 상태로 전환되는지 확인.
5. 실패 케이스: 잘못된 콜백 URL이면 공급자가 거부하거나 web이 `/?error=oauth`
   로 돌아온다. state 변조 시 `/?error=csrf`. 로그는 API 콘솔에서 확인.
