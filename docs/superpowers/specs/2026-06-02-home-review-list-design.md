# 홈 리뷰 리스트 — 설계서

- 작성일: 2026-06-02
- 상태: 설계 승인됨
- 상위 문서: [2026-06-01-post-mvp-roadmap.md](../plans/2026-06-01-post-mvp-roadmap.md) — 1순위 "홈 리뷰 리스트 신규" 항목
- 선행 작업: 홈 RSC/ISR 마이그레이션 완료, 프론트 테스트 환경(Vitest + RTL) 구축 완료

---

## 1. 목표

홈(`/`)에 고객 리뷰 섹션을 추가한다. 리뷰는 **ISR + on-demand revalidation**으로 제공되어
평소에는 정적 HTML로 빠르게 서빙되고, 새 리뷰가 작성되면 즉시 갱신된다.

**범위 (이번 단계)**
- Prisma `Review` 모델 + 시드 데이터 10개
- Express `GET /api/reviews` (목록, 서버 측 이름 마스킹) + `POST /api/reviews` (작성)
- `@melstudio/shared`에 `ReviewSchema` 추가
- 홈 리뷰 섹션 (서버 컴포넌트) — 리뷰 내용 + 마스킹된 이름 + 작성일
- 리뷰 작성 폼 (클라이언트 컴포넌트) + Server Action → `revalidateTag("reviews")`
- API/웹 테스트 (기존 패턴 유지)

**범위 제외 (다음 단계)**
- 별점
- 리뷰 페이지네이션 / 전체 리뷰 페이지
- 로그인 연동 (작성자 인증) — 4순위 카카오 OAuth 이후
- 리뷰 수정/삭제

---

## 2. 사용자 흐름

```
홈(/) 접속
   → 쇼케이스 아래 "고객 리뷰" 섹션 (최신 6개, 정적 HTML에 포함)
   → 카드: 리뷰 내용 + "김*수 · 2026.05.28"

리뷰 작성:
   → 섹션 하단 폼에 이름/내용 입력 → 제출
   → Server Action: Express에 저장 → revalidateTag("reviews")
   → 제출 직후 자기 리뷰가 리스트 맨 앞에 표시됨
   → 다른 방문자도 다음 요청부터 새 리뷰가 포함된 페이지를 받음
```

---

## 3. 아키텍처

### 3.1 데이터 모델 (apps/api)

```prisma
model Review {
  id         String   @id @default(cuid())
  authorName String   // 풀네임 저장 — 응답 시에만 마스킹
  body       String
  createdAt  DateTime @default(now())

  @@index([createdAt])
}
```

**시드** — `apps/api/src/data/seed-data.ts`에 `SEED_REVIEWS` 10개 추가
- 실제 후기 느낌의 한국어 문구 (업종 다양하게)
- 작성일은 기준일로부터 결정적으로 분산 (난수 금지 — 시드 멱등성 유지)
- `prisma/seed.ts`에서 기존 패턴대로 deleteMany → create

### 3.2 공유 스키마 (packages/shared)

```ts
export const ReviewSchema = z.object({
  id: z.string(),
  authorName: z.string(),   // 마스킹된 이름 ("김*수")
  body: z.string(),
  createdAt: z.string(),    // ISO 8601
});
export type Review = z.infer<typeof ReviewSchema>;

export const ReviewListSchema = z.object({
  items: z.array(ReviewSchema),
});
export type ReviewList = z.infer<typeof ReviewListSchema>;

// POST 입력 검증 (web 폼과 api 라우트가 공유)
export const ReviewCreateSchema = z.object({
  authorName: z.string().min(2).max(10),
  body: z.string().min(10).max(500),
});
export type ReviewCreate = z.infer<typeof ReviewCreateSchema>;
```

### 3.3 API (apps/api)

**`review.service.ts`**
- `maskName(name)`: 두 번째 글자를 `*`로 치환
  - `김민수` → `김*수`, `남궁민수` → `남*민수`, `이준` → `이*`, 1글자 → `*`
- `listReviews({ limit })`: 최신순(createdAt desc) 조회 → 마스킹 적용 후 반환
- `createReview({ authorName, body })`: 저장 → 마스킹된 결과 반환

**`reviews.route.ts`**
- `GET /api/reviews?limit=` (기본 6, 최대 50) — `{ items: Review[] }`
- `POST /api/reviews` — body를 `ReviewCreateSchema`로 검증 (실패 시 400) → 201 + 생성된 리뷰(마스킹)
- `app.ts`에 `/api/reviews` 마운트

**마스킹 위치가 서버인 이유**: API 응답에 풀네임이 아예 노출되지 않음.
클라이언트 마스킹은 네트워크 탭에서 원본이 보이므로 마스킹의 의미가 없다.

### 3.4 웹 (apps/web)

**데이터 fetch** — `lib/api.ts`에 추가
```ts
fetchReviews(params, init?)  // GET /api/reviews, ReviewListSchema.parse
```

**홈 page.tsx**
```ts
fetchReviews({ limit: 6 }, { next: { tags: ["reviews"] } })
```
- `tags: ["reviews"]` → `revalidateTag("reviews")`가 호출될 때까지 fetch 캐시 유지
- 페이지 자체의 `revalidate = 60`(ISR)은 그대로 — 60초마다 페이지가 재생성돼도
  리뷰 fetch는 태그가 무효화되지 않는 한 캐시된 데이터를 재사용
- 기존 `loadHomeData()` 패턴대로 API 다운 시 빈 배열 (리뷰 섹션 숨김)

**컴포넌트**
```
ReviewSection (서버 컴포넌트) — 쇼케이스 섹션 아래, 푸터 위
 ├─ 섹션 헤더 ("고객 리뷰")
 ├─ 리뷰 카드 그리드 (모바일 1열 / 태블릿 2열 / 데스크탑 3열)
 │   └─ 카드: 리뷰 내용 + "김*수 · 2026.05.28"
 └─ ReviewForm (클라이언트 컴포넌트, "use client")
     ├─ 이름 입력 (2~10자) / 내용 입력 (10~500자)
     ├─ useActionState로 제출 상태 관리 (제출 중 비활성화 / 필드 에러 / 성공)
     └─ 제출 → submitReview Server Action
```

**Server Action** — `app/actions/reviews.ts` (`"use server"`)
```ts
export async function submitReview(prevState, formData) {
  // 1. ReviewCreateSchema.safeParse → 실패 시 필드 에러 반환
  // 2. Express POST /api/reviews 호출 → 실패 시 에러 메시지 반환
  // 3. 성공 시 revalidateTag("reviews") → { ok: true }
}
```

**날짜 포맷**: `2026.05.28` (Intl.DateTimeFormat ko-KR 기반, 서버에서 포맷)

**디자인**: 기존 홈 디자인 시스템(cream/rose/crimson 팔레트, font-display, shadow-soft) 유지

### 3.5 데이터 흐름 (on-demand revalidation)

```
사용자 폼 제출
  → Server Action (Next.js 서버)
      ① zod 검증
      ② Express POST /api/reviews → Postgres 저장
      ③ 성공 시 revalidateTag("reviews")
  → 폼이 속한 페이지가 재렌더 → 새 리뷰 포함된 HTML
  → 이후 모든 방문자: 갱신된 정적 페이지 수신
```

웹훅 방식(Express → Next.js revalidate 호출)은 채택하지 않음 —
리뷰 쓰기가 항상 Next.js(폼 → Server Action)를 거치므로 같은 프로세스에서
`revalidateTag`를 직접 호출하는 것이 더 단순하고 사용자 경험도 좋다.

---

## 4. 에러 처리

| 상황 | 처리 |
|---|---|
| 빌드/재생성 시 API 다운 | 리뷰 빈 배열 → 섹션 숨김 (홈 전체는 정상 렌더, 기존 apiDown 패턴) |
| 폼 검증 실패 (이름/내용 길이) | 필드별 에러 메시지, 입력값 유지 |
| Server Action에서 Express 호출 실패 | "잠시 후 다시 시도해 주세요" 에러 메시지 |
| POST에 잘못된 body (API 직접 호출) | zod 검증 → 400 + 에러 상세 |

---

## 5. 테스트

| 파일 | 검증 내용 |
|---|---|
| `apps/api/src/services/review.service.test.ts` | maskName(2자/3자/4자/외자), 생성, 최신순 정렬, limit |
| `apps/api/src/routes/reviews.route.test.ts` | GET 목록/limit/마스킹 응답, POST 성공 201, 검증 실패 400 |
| `apps/web/src/components/ReviewSection.test.tsx` | 마스킹된 이름·날짜 렌더, 빈 목록 시 숨김 |
| `apps/web/src/components/ReviewForm.test.tsx` | 입력 검증 에러, 제출 중 비활성화, 성공/실패 상태 |
| `packages/shared/src/index.test.ts` | ReviewSchema/ReviewCreateSchema 검증 추가 |

API 테스트는 기존 Vitest + supertest 패턴, 웹은 Vitest + RTL 패턴을 따른다.

---

## 6. 사람이 확인할 것

1. 홈에서 리뷰 섹션이 보이고, 이름이 `김*수` 형식으로 마스킹되어 있는지
2. 페이지 소스 보기에서 리뷰 데이터가 HTML에 포함돼 있는지 (정적 렌더 증거)
3. 리뷰 작성 → 제출 직후 리스트 맨 앞에 내 리뷰가 보이는지
4. 다른 브라우저(시크릿 창)에서 새로고침 → 방금 쓴 리뷰가 보이는지 (on-demand revalidation 증거)
