# 구글/카카오 OAuth 로그인 설계

날짜: 2026-06-11
상태: 승인 대기 → 구현 예정

## 배경 / 목표

현재 인증은 목(mock)이다. `apps/web/src/lib/auth.ts`가 localStorage에 `{ name }`만
저장하고, `SiteHeader.tsx`의 로그인 모달은 카카오/구글 버튼 모두 `login("사장님")`만
호출한다. 채팅 `visitorName`과 마이페이지가 이 목 인증에 의존한다. DB에는 User 모델이
없고, API에는 auth 라우트/서비스가 없다.

이 작업은 실제 구글·카카오 소셜 로그인을 붙인다. 이 레포의 핵심 테마("라이브러리 대신
직접 구현 → 면접 설명 포인트")에 맞춰 **NextAuth 같은 라이브러리 없이 OAuth 2.0
Authorization Code 흐름을 Express API에서 직접 구현**한다.

## 결정 사항 (브레인스토밍 확정)

- **구현 방식**: 직접 구현, 백엔드(Express API) 주도 Authorization Code 흐름. 시크릿은
  API에만 존재하고 브라우저는 세션 쿠키만 본다.
- **세션**: DB 세션(Postgres) + httpOnly 쿠키. 세션 ID를 쿠키로 내리고 서버에서 즉시
  무효화(로그아웃/만료 시 row 삭제) 가능.
- **도메인/쿠키**: 아직 커스텀 도메인 없음. dev는 localhost(web:3000 ↔ api:4000,
  same-site → `SameSite=Lax`), prod는 `*.vercel.app ↔ *.elb.amazonaws.com`
  (cross-site → `SameSite=None; Secure`). env로 분기.
- **범위**: 전체 통합 — OAuth 흐름 + 세션 + 로그인 UI에 더해 목 인증 완전 제거,
  채팅 `visitorName`·마이페이지를 실제 유저로 연결.
- **동의항목**: 이름 + 이메일.

## 전체 흐름

```
[Web 로그인 버튼] → window.location = {API}/api/auth/google?redirect=/mypage
       │
[API] GET /api/auth/:provider
       · CSRF용 state 생성 → 짧은 httpOnly 쿠키(oauth_state)에 저장
       · redirect 경로도 state에 인코딩(또는 쿠키)
       · 공급자 동의 URL로 302
[공급자 동의 화면] (구글/카카오)
[API] GET /api/auth/:provider/callback?code&state
       · 쿠키 state == 쿼리 state 검증 (불일치 → 거부)
       · code → access_token 교환 (provider별 토큰 엔드포인트)
       · access_token으로 프로필 조회 (이름, 이메일)
       · User upsert (provider + providerId 유니크)
       · Session 생성 → melstudio_session 쿠키 Set-Cookie
       · oauth_state 쿠키 제거 → Web의 redirect 경로로 302
[Web] 이후 모든 API 호출에 쿠키 자동 동봉(credentials: include)
       · GET /api/auth/me → 현재 유저 조회 (401이면 비로그인)
```

## 컴포넌트 경계

각 단위는 한 가지 책임, 명확한 인터페이스, 독립 테스트 가능.

### API (`apps/api`)

**`src/lib/oauth/provider.ts`** — provider 추상화
- 인터페이스 `OAuthProvider`:
  - `getAuthUrl(state: string): string`
  - `exchangeCode(code: string): Promise<{ accessToken: string }>`
  - `fetchProfile(accessToken: string): Promise<OAuthProfile>`
  - `OAuthProfile = { provider, providerId, email?, name, avatarUrl? }`
- `google.ts`, `kakao.ts` — 각 공급자 엔드포인트/파라미터 구현.
- **추상화 이유**: 라우트 콜백 로직을 실제 구글/카카오 콘솔·네트워크 없이 테스트하기 위함.
  테스트에서 fake provider를 주입한다.
- env에서 해당 provider의 client id/secret이 없으면 `null` 반환(부팅 시 경고, 버튼 비활성).

**`src/services/auth.service.ts`** — provider 무관, Prisma 접근 전담
- `upsertUserFromProfile(profile): Promise<User>` — `(provider, providerId)` upsert.
  이메일 받으면 함께 저장(동일 식별/병합 판단용).
- `createSession(userId): Promise<{ id, expiresAt }>` — 만료(예: 7일) 포함.
- `getSessionUser(sessionId): Promise<User | null>` — 만료 검사, 만료 시 row 삭제 후 null.
- `revokeSession(sessionId): Promise<void>`.

**`src/routes/auth.route.ts`**
- `GET /api/auth/:provider` — state 쿠키 발급 후 동의 URL로 302. 미지원/미설정 provider → 안내.
- `GET /api/auth/:provider/callback` — 위 흐름. 성공 시 세션 쿠키 + web으로 302.
- `GET /api/auth/me` — `req.user`(세션 미들웨어)에서 `AuthUser` 반환, 없으면 401.
- `POST /api/auth/logout` — 세션 폐기 + 쿠키 제거.

**`src/middleware/session.ts`**
- `melstudio_session` 쿠키 → `getSessionUser` → `req.user` 부착. 없으면 통과(라우트가 401 판단).

**쿠키 / 인프라**
- `cookie-parser` 의존성 추가, `app.ts`에 등록.
- 세션 쿠키: `httpOnly`, `SameSite`(dev `Lax`/prod `None`), `Secure`(prod), `Path=/`,
  `Max-Age`=세션 만료와 동기.
- CORS는 이미 `credentials: true` + `origin: WEB_ORIGIN`.
- `lib/env.ts`에 추가: `GOOGLE_CLIENT_ID/SECRET`, `KAKAO_CLIENT_ID/SECRET`,
  `OAUTH_REDIRECT_BASE`(콜백 절대 URL 구성), `SESSION_COOKIE_SECURE`(bool, prod true),
  `SESSION_TTL_DAYS`(기본 7).

### DB (Prisma)

```prisma
model User {
  id         String    @id @default(cuid())
  provider   String    // google | kakao
  providerId String    // 공급자 측 고유 ID
  email      String?
  name       String
  avatarUrl  String?
  sessions   Session[]
  createdAt  DateTime  @default(now())

  @@unique([provider, providerId])
  @@index([email])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

마이그레이션 생성/적용. 시드는 변경 없음(User는 로그인으로 생성).

### Shared (`packages/shared`)

`AuthUser` Zod 스키마 추가 — web↔api 계약:
```ts
AuthUser = { id, name, email: string | null, avatarUrl: string | null, provider }
```
민감정보(providerId, 세션) 비노출.

### Web (`apps/web`)

**`src/lib/auth.ts` 재작성** — localStorage 제거, API 기반.
- `getUser()`/`subscribe()` 시그니처는 유지(소비처 변경 최소화)하되 내부는
  `GET /api/auth/me`(`credentials: "include"`) 기반. React Query로 캐시·무효화.
- `login(name)` 제거. 대신 `startLogin(provider, redirect?)` = `window.location` 이동.
- `logout()` = `POST /api/auth/logout` 후 캐시 무효화.
- `User` 타입은 shared `AuthUser`로 승격(기존 mock 도메인 → shared 승격 패턴대로).

**`src/components/SiteHeader.tsx`** — 모달 카카오/구글 버튼이 각각
`startLogin("kakao")`, `startLogin("google")` 호출(현재 위치를 redirect로 전달).
"데모 단계" 안내 문구 제거. 미설정 provider 버튼은 비활성 처리.

**`src/app/mypage/page.tsx`** — `login("사장님")` 제거, 로그인 버튼이 `startLogin` 호출.
로그인 상태는 `/me`로 판단.

**`src/lib/chat.ts`** — `visitorName`을 로그인 유저 이름으로. 비로그인은 기존 "방문자" 유지.

## 에러 처리

- state 불일치/만료 → web `/?error=csrf`로 302 (서버는 로깅만).
- code 교환/프로필 조회 실패 → web `/?error=oauth`로 302. 시크릿/원문 응답은 로그에만, 사용자엔 일반 메시지.
- 세션 만료 → `/me` 401 → web 비로그인 처리(자동).
- provider env 미설정 → 부팅 시 `console.warn`, 해당 버튼 비활성 + 안내.
- web의 `?error=` 쿼리는 로그인 모달/페이지에서 토스트/문구로 표시.

## 테스트 (TDD: 테스트 먼저)

- `apps/api/src/services/auth.service.test.ts` — upsert(신규/기존, 이메일 갱신), 세션
  생성/만료(만료 시 null + 삭제)/폐기. 실제 prisma test DB.
- `apps/api/src/routes/auth.route.test.ts` — fake `OAuthProvider` 주입으로 콜백 전체
  흐름(세션 쿠키 Set-Cookie 확인), state 불일치 거부, `/me` 인증/비인증, `/logout` 후 `/me` 401.
- `apps/web/src/lib/auth.test.ts` — `/me` fetch 모킹으로 로그인/비로그인 전이, `logout` 흐름.
- 실제 구글/카카오 연동은 수동 스모크 테스트(아래 외부 설정 후), 절차를 docs에 기록.

## 외부 설정 (사장님 수행 — 별도 문서로 정리)

구현은 코드 경로 전체를 완성하되, 아래는 사장님 계정으로만 가능하므로 문서로 안내:

1. **Google Cloud Console**: OAuth 동의화면(외부) + OAuth 클라이언트(웹) 생성.
   승인된 redirect URI: `{OAUTH_REDIRECT_BASE}/api/auth/google/callback`
   (dev `http://localhost:4000/...`, prod ALB/도메인). 스코프: `openid email profile`.
2. **Kakao Developers**: 앱 생성 → 카카오 로그인 활성화 → Redirect URI 등록
   (`{OAUTH_REDIRECT_BASE}/api/auth/kakao/callback`) → 동의항목(닉네임, 카카오계정 이메일).
   REST API 키 = client id, 보안의 client secret 발급.
3. `.env`에 `GOOGLE_CLIENT_ID/SECRET`, `KAKAO_CLIENT_ID/SECRET`, `OAUTH_REDIRECT_BASE`,
   `SESSION_COOKIE_SECURE`, `SESSION_TTL_DAYS` 추가. `.env.example`/README 갱신.
4. prod: ALB가 HTTPS 종단이어야 `Secure` 쿠키 동작. Vercel 환경변수에 `NEXT_PUBLIC_API_URL` 확인.

## 비범위 (YAGNI)

- 이메일/비밀번호 로그인, 회원가입 폼.
- 토큰 리프레시/공급자 access_token 보관(프로필만 1회 조회, 이후 자체 세션).
- 권한/역할(RBAC), 관리자 분리 — 채팅 ADMIN은 현행 유지.
- 계정 병합 UI(이메일 같아도 provider 다르면 별도 계정. 추후 과제).
