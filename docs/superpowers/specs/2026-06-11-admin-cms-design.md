# 관리자 CMS 설계

- 작성일: 2026-06-11
- 상태: 설계 승인 대기
- 관련: `docs/superpowers/plans/2026-06-01-post-mvp-roadmap.md`, 결제 설계(`docs/.../payment`), 이미지 에셋 파이프라인

## 1. 목적과 범위

운영자(나)만 접근하는 관리자 CMS를 만든다. 두 가지 목적:

1. **랜딩페이지(쇼케이스) 목록 관리** — 새 쇼케이스 추가 + 목록/수정/삭제 (전체 CRUD). 이미지(데스크톱/모바일/썸네일)는 관리자가 직접 업로드해 S3/MinIO에 올린다.
2. **구매자 확인** — 주문/결제/구매자(User)를 목록·상세로 조회한다 (읽기 전용. 환불 등 액션은 기존 결제 플로우에 남겨둠).

### 비목표 (이번 스코프 아님)
- CMS 내 환불·상태 변경 등 쓰기 액션 (구매자 화면은 읽기 전용)
- 카테고리 CRUD (기존 8개 고정 사용)
- 다중 관리자 권한 등급 (ADMIN 단일 등급)
- 리뷰/채팅 관리 (별도 화면이 이미 있거나 추후)

## 2. 결정 요약

| 항목 | 결정 |
|---|---|
| 관리자 인증 | 이메일 허용목록(`ADMIN_EMAILS`) + `User.role`. 로그인마다 동기화 |
| 이미지 등록 | 관리자 직접 업로드 → presigned URL로 S3/MinIO 직접 PUT |
| 쇼케이스 범위 | 추가 + 목록 + 수정 + 삭제 (전체 CRUD) |
| 구매자 확인 범위 | 주문 목록 + 상세 조회 (읽기 전용) |
| 프론트 렌더링 | 클라이언트(CSR) — 마이페이지/채팅과 동일. 데이터는 Express API + React Query |

## 3. 아키텍처

기존 컨벤션을 그대로 따른다: **`routes → services → prisma`** + web은 `lib/api.ts`로 호출 + shared Zod 스키마가 계약.

```
[브라우저 /admin/*  (CSR, React Query)]
        │  fetch (쿠키 세션)
        ▼
[apps/api  /api/admin/*  (requireAuth → requireAdmin)]
        │
   ┌────┴─────────────┐
   ▼                  ▼
admin.showcase    admin.order
  .service          .service
   │                  │
   ▼                  ▼
        [prisma → PostgreSQL]

이미지 업로드: 브라우저 ──presign 요청──▶ API(서명 발급) ──▶ 브라우저가 S3/MinIO로 직접 PUT
```

핵심 원칙: **UI 가드는 신뢰하지 않는다.** 모든 `/api/admin/*`가 서버에서 독립적으로 `requireAdmin`을 강제하고, web의 `/admin` 가드는 편의용 리다이렉트일 뿐이다.

렌더링 전략표(CLAUDE.md)에 한 줄 추가: `/admin/*` → 클라이언트(CSR, noindex) — 운영 화면.

## 4. 관리자 인증

### 4.1 데이터 모델
`User`에 role 추가:
```prisma
model User {
  // ...기존 필드
  role  String  @default("USER")  // USER | ADMIN
}
```
마이그레이션: `add_user_role`. 기존 행은 기본값 `USER`.

### 4.2 환경변수
`env.ts`에 추가:
```ts
ADMIN_EMAILS: z.string().default(""),  // 쉼표 구분 운영자 이메일 허용목록
```
파싱 헬퍼(`isAdminEmail(email)`)로 소문자/trim 정규화 후 비교.

### 4.3 로그인 시 role 동기화
`upsertUserFromProfile`(`auth.service.ts`)에서 프로필 email로 role을 계산해 upsert의 create/update **양쪽 모두**에 반영한다.
- email이 허용목록 ⊂ → `role: "ADMIN"`, 아니면 `"USER"`.
- **매 로그인 동기화**: 허용목록에서 이메일을 빼면 다음 로그인 때 자동으로 ADMIN 권한이 회수된다 (의도된 동작).
- `AuthUser` 타입과 `toAuthUser()`에 `role` 추가 → `req.user`와 `/api/auth/me` 응답에 자동 노출.

### 4.4 API 게이트
`middleware/requireAdmin.ts` 신설 (`requireAuth` 다음 체인):
```ts
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== "ADMIN") {
    next(new ApiError(403, "FORBIDDEN", "관리자 권한이 필요해요"));
    return;
  }
  next();
}
```
모든 admin 라우트: `router.use(requireAuth, requireAdmin)`.

### 4.5 Web 게이트
- shared `AuthUser` 스키마에 `role: z.enum(["USER","ADMIN"])` 추가 → `lib/auth.ts`/me 응답이 role을 갖는다.
- `app/admin/layout.tsx`(클라이언트): me 조회 → `role !== "ADMIN"`이면 홈으로 리다이렉트, 로딩 중 스켈레톤. `noindex` 메타(서버 레이아웃 분리 — 기존 `admin/chat` 패턴 재사용).
- 기존 `/admin/chat`도 이 가드 레이아웃 아래로 들어와 함께 보호된다(현재 무방비 상태 개선).

## 5. 쇼케이스 CMS

### 5.1 이미지 업로드 (presigned PUT)
- 의존성 추가: `@aws-sdk/s3-request-presigner`.
- `lib/s3.ts`에 `presignPut(key, contentType)` 추가 — `PutObjectCommand` presign(만료 5분).
- 키 규칙: `showcases/{slug}/{kind}.{ext}` (`kind` = desktop|mobile|thumb).
- 흐름:
  1. 관리자가 폼에서 파일 선택 → web이 `POST /api/admin/uploads/presign` 호출 (`{ slug, kind, contentType }`).
  2. API가 키 + presigned PUT URL 반환.
  3. 브라우저가 그 URL로 파일을 **직접 PUT** (API 서버 우회 → 대용량/부하 회피).
  4. 폼 제출 시 반환된 key들을 쇼케이스 생성/수정 본문에 포함.
- 검증: contentType 화이트리스트(image/png|jpeg|webp), kind enum, slug 형식.
- MinIO(dev)/S3(prod) 모두 동일 SDK presign으로 동작. CORS는 버킷에 PUT 허용 설정 필요(인프라 노트에 기재).

### 5.2 API 라우트 (`routes/admin/showcase.route.ts`)
모두 `requireAuth + requireAdmin`.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/showcases` | 관리자용 전체 목록(페이지네이션/카테고리 필터). 퍼블릭 목록과 달리 내부 식별 위해 cuid·키도 포함 |
| GET | `/api/admin/showcases/:slug` | 단건 상세 |
| POST | `/api/admin/showcases` | 생성 |
| PATCH | `/api/admin/showcases/:slug` | 수정 |
| DELETE | `/api/admin/showcases/:slug` | 삭제 |

### 5.3 서비스 (`services/admin/showcase.service.ts`)
- `createShowcase(input)`: slug 중복 검사(`@unique` 위반 시 409 CONFLICT), categoryId는 category slug로 조회해 매핑, 이미지 key 저장.
- `updateShowcase(slug, patch)`: 부분 수정. 존재하지 않으면 404.
- `deleteShowcase(slug)`: 삭제. (주문이 showcaseId=slug로 참조 — FK 아님(문자열)이라 삭제 가능하나, 삭제 시 경고. 소프트삭제는 비목표.)
- 퍼블릭 `showcase.service`(slug→id 변환)는 그대로 두고, admin은 별도 서비스로 분리(관심사 분리 — 내부 필드 노출 범위가 다름).

### 5.4 검증 스키마 (shared)
```ts
CreateShowcaseInput = { slug, title, blurb, accent, layout(enum), category(slug),
                        desktopKey?, mobileKey?, thumbKey? }
UpdateShowcaseInput = CreateShowcaseInput.partial() (slug 제외)
AdminShowcase = Showcase + { cuid, createdAt, desktopKey, mobileKey, thumbKey }
```
`layout`은 `hero|split|grid|minimal` enum, `accent`은 색상 형식 검증.

## 6. 구매자 확인 (읽기 전용)

### 6.1 API 라우트 (`routes/admin/order.route.ts`)
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/orders` | 주문 목록 — User 조인, status 필터, createdAt desc, 커서 페이지네이션 |
| GET | `/api/admin/orders/:id` | 주문 상세 — 구매자/주문 스냅샷/결제(Payment)/생성된 랜딩 연결 |

### 6.2 서비스 (`services/admin/order.service.ts`)
- `listOrdersForAdmin({ status?, cursor?, limit })`: `prisma.order.findMany` + `include: { user, payment }`. 응답엔 구매자 식별(이름/이메일/provider), 금액, status, paidAt, paymentId.
- `getOrderDetailForAdmin(id)`: 단건 + orderSnapshot + payment.rawPayload 요약 + generatedJobId.
- 읽기 전용 — 쓰기 메서드 없음.

### 6.3 스키마 (shared)
```ts
AdminOrderSummary = { id, buyer:{name,email,provider}, orderName, amount,
                      status, paymentId, createdAt, paidAt }
AdminOrderDetail  = AdminOrderSummary + { orderSnapshot, payment, generatedJobId, showcaseId }
AdminOrderList    = { items: AdminOrderSummary[], nextCursor }
```

## 7. Web 관리자 UI (CSR)

`apps/web/src/app/admin/` 하위:

```
admin/
  layout.tsx          # 서버: noindex 메타
  AdminGuard.tsx      # 클라이언트: role 확인 + 리다이렉트 + 사이드바 네비
  page.tsx            # 대시보드(요약: 쇼케이스 수, 최근 주문 N건) — 가벼운 진입점
  showcases/
    page.tsx          # 목록 테이블 + 추가 버튼
    ShowcaseForm.tsx   # 생성/수정 폼 (이미지 업로드 포함)
  orders/
    page.tsx          # 주문 목록 테이블 + status 필터
    [id]/page.tsx      # 주문 상세
```

- 데이터: `lib/queries.ts`에 admin 훅 추가(`useAdminShowcases`, `useAdminOrders` 등). 변경(생성/수정/삭제)은 `useMutation` + 쿼리 무효화.
- `lib/api.ts`에 admin fetch 함수 추가 — 응답을 shared 스키마로 `parse()`(런타임 검증 유지).
- 폼: 직접 구현(기존 컨벤션 — 폼 라이브러리 미사용). 이미지 업로드는 presign→PUT→key 수집 흐름의 작은 훅(`useS3Upload`)으로 분리.
- 디자인: 기존 토큰(ink/accent/canvas) 재사용, 운영 화면이므로 간결한 테이블 중심.

## 8. 파일 변경 목록

**apps/api**
- `prisma/schema.prisma` — User.role 추가 + 마이그레이션
- `src/lib/env.ts` — ADMIN_EMAILS
- `src/lib/s3.ts` — presignPut 추가
- `src/services/auth.service.ts` — role 동기화 + AuthUser.role
- `src/middleware/requireAdmin.ts` — 신설
- `src/routes/admin/showcase.route.ts` (+ `.test.ts`) — 신설
- `src/routes/admin/order.route.ts` (+ `.test.ts`) — 신설
- `src/routes/admin/upload.route.ts` (+ `.test.ts`) — presign 신설
- `src/services/admin/showcase.service.ts` (+ `.test.ts`) — 신설
- `src/services/admin/order.service.ts` (+ `.test.ts`) — 신설
- `src/app.ts` — admin 라우터 마운트
- `package.json` — `@aws-sdk/s3-request-presigner`

**packages/shared**
- `src/index.ts` (+ `.test.ts`) — AuthUser.role, Create/UpdateShowcaseInput, AdminShowcase, AdminOrder* 스키마

**apps/web**
- `src/app/admin/layout.tsx`, `AdminGuard.tsx`, `page.tsx`
- `src/app/admin/showcases/*`, `src/app/admin/orders/*`
- `src/lib/api.ts`, `src/lib/queries.ts` — admin 함수/훅
- `src/hooks/useS3Upload.ts` — presign 업로드 훅
- 기존 `admin/chat`을 가드 레이아웃 하위로 정리

## 9. 테스트 전략 (TDD)

각 기능은 테스트 먼저 작성한다.

- **서비스 단위**: showcase CRUD(중복 slug 409, 404, 부분수정), order 조회(조인/필터/커서), role 동기화(허용목록 in/out).
- **라우트(supertest)**: 비로그인 401, 비관리자 403, 관리자 200. presign 발급, 잘못된 contentType 거부.
- **shared**: 새 스키마 parse 성공/실패 케이스.
- **web**: AdminGuard(비관리자 리다이렉트), ShowcaseForm 검증, useS3Upload 흐름(presign mock).
- **수동 검증**: MinIO에 실제 업로드 → 쇼케이스 추가 → 퍼블릭 목록 노출 확인. 주문 상세 조회.

## 10. 보안 노트

- 모든 admin API는 서버에서 `requireAdmin` 강제 (UI 가드 우회해도 차단).
- presign 만료 5분, contentType/kind/slug 화이트리스트. 키는 서버가 생성(클라이언트 입력 키 신뢰 안 함).
- admin 응답에만 cuid/이메일 등 내부 필드 노출 — 퍼블릭 엔드포인트는 기존대로 slug만.
- `ADMIN_EMAILS` 미설정 시 관리자 0명(안전한 기본값).

## 11. 미해결 / 추후

- S3/MinIO 버킷 CORS(PUT) 설정 — 인프라(terraform) 반영 필요.
- 이미지 삭제 시 S3 오브젝트 정리(고아 방지) — 추후.
- 쇼케이스 소프트삭제/발행상태(draft) — 비목표, 추후.
- CMS 내 환불 액션 — 결제 플로우에 있음, CMS 편입은 추후 결정.
