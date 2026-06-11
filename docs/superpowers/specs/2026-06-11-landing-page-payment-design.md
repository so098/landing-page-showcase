# 랜딩페이지 결제(온라인 주문/결제) 설계

날짜: 2026-06-11
상태: **구현 완료**(2026-06-11). 외부 설정 가이드: `docs/payments/portone-setup.md`.

> 구현 노트(MVP 경계): 결제 검증·멱등·웹훅·환불·마이페이지 실데이터는 모두 서버에서
> 구현·테스트했다. **AI 생성 트리거는 결제 확정 직후 web이 호출**(즉시 결과 표시)하는
> 방식으로 두었다 — 웹훅은 결제 확정만 하므로 여전히 빠르게 200을 반환한다.
> "브라우저 종료 시에도 웹훅만으로 생성 보장"은 후속 과제이며, 그 seam(`setOnPaidHook`
> + `generateForOrder`)은 이미 준비돼 있어 `index.ts`에서 주입만 하면 된다.
> 결제가 비활성(키 미설정)이면 주문서는 결제 없이 바로 생성으로 폴백한다.
선행: 구글/카카오 OAuth 로그인 **구현 완료**(결정 #1 해소).

**확정된 결정 (사장님 승인 2026-06-11)**
- #2 PG: **PortOne**.
- #3 가격표: **확정** — 신규 AI = `BASE 10,000 + 추가페이지수 × 10,000`, 추가 제작 AI = `50,000`(flat), 사람과 함께 = `300,000`(채팅 상담 — 온라인 결제 비범위, 현행 유지). `calcAmount`는 snapshot의 `mode`(ai|human)·`orderType`(new|additional)·`pages.length`를 읽는다.
- #4 환불: **전액 환불만**.
- #5 결제-생성: **비동기**(웹훅 빠른 200 + 백그라운드 생성 잡 + web 폴링).

## 배경 / 목표

현재 주문/결제는 전부 목(mock)이다.

- 주문서(`apps/web/src/components/OrderForm.tsx`)는 검증 통과 시 `saveOrder()`로
  주문 내용을 **sessionStorage**(`apps/web/src/lib/orderStorage.ts`)에 넣고,
  결제 없이 곧장 AI 생성 API(`POST /api/ai-landing/generate`)를 호출해 `/order/result`로 간다.
- 결과 페이지(`apps/web/src/app/order/result/page.tsx`)의 **환불**도 sessionStorage 기록만 한다.
  코드 주석에 이미 명시돼 있다: *"실제 환불 처리는 5순위 결제 연동 시 백엔드 API와 함께 붙인다."*
- 마이페이지(`apps/web/src/app/mypage/page.tsx`)의 결제 내역은 `MOCK_PAYMENTS` 하드코딩이다.
- DB(`apps/api/prisma/schema.prisma`)에 `Order`/`Payment` 모델이 없고, API에 결제 라우트/서비스가 없다.
- "이대로 완료하기" 모달에는 이미 금액 문구(추가 페이지 수정 50,000원 / 신규 제작 300,000원 등)가 노출돼 있으나, 결제로 이어지지 않는다.

이 작업은 실제 **온라인 주문·결제**를 붙인다. 로드맵 5순위(`docs/superpowers/plans/2026-06-01-post-mvp-roadmap.md`)의
**PortOne(구 아임포트) 테스트모드** 방향을 따른다. 수익화 방향은 광고가 아니라 **온라인 주문 매출 + 포트폴리오 겸용**이다(`docs/superpowers/specs/2026-06-04-monetization-deployment-design.md`).

이 레포의 핵심 테마는 "라이브러리 대신 직접 구현 → 면접 설명 포인트"이지만, **결제는 보안·인증 책임이 큰 영역이라 PG 결제창/SDK 자체는 검증된 것을 쓴다.** 대신 면접에서 설명할 직접 구현 포인트는 PG 바깥에 둔다 — **서버 사이드 결제 검증(위변조 금액 거부), 주문 상태머신, 멱등 웹훅 처리**. 이 절충안이 이 문서의 핵심 결정이다.

## 결정 사항 (브레인스토밍 확정 / 결정 필요는 맨 끝)

- **결제 방식**: PG는 **PortOne(아임포트) v2**를 1순위로 둔다. 사유: ① 토스페이먼츠·카카오페이·네이버페이 등 **여러 결제수단을 단일 연동으로** 커버(가맹점이 결제수단을 늘려도 코드 변경 최소) ② 테스트 채널 제공 ③ 서버 검증 API + 위변조 검증 가능한 웹훅 SDK 제공. (단일 PG 직연동인 토스페이먼츠와의 트레이드오프는 "PG 비교"와 "결정 필요 사항" 참조.)
- **직접 구현 vs SDK 경계**: 결제창 호출·결제수단 인증은 **PG SDK**(브라우저 `@portone/browser-sdk`), **서버 사이드 금액 검증 + 주문 상태머신 + 멱등 웹훅은 직접 구현**. PG가 "결제됨"이라 말해도 **우리 DB의 주문 금액과 PG 단건조회 금액이 일치할 때만** 주문을 확정한다.
- **신뢰 경계**: 금액·결제 확정 판단은 **절대 클라이언트를 믿지 않는다.** 브라우저는 `paymentId`/`orderId`만 서버에 넘기고, 서버가 PG REST API로 단건 조회해 교차검증한다.
- **확정 트리거 이중화**: ① 브라우저 결제완료 콜백(`POST /api/payments/:id/confirm`) ② PG 웹훅(`POST /api/payments/webhook`). **둘 중 먼저 도착한 것이 확정**하고, 나머지는 멱등 처리로 무시한다(와이파이 끊김·새로고침 대비 — PortOne 권장 패턴).
- **동시성 가드(핵심)**: 콜백·웹훅이 **동시에** `confirmPayment`에 진입할 수 있다. `@unique`만으론 *read-then-write 경합*(둘 다 PENDING을 읽고 둘 다 PAID 기록 → 생성 2회)을 못 막는다. → `markPaid`는 **원자적 조건부 업데이트**(`updateMany({ where: { id, status: "PENDING" }, ... })`) 후 **affected count로 "전이 승자" 판정**, **AI 생성 트리거는 승자(count===1)일 때만** 호출한다. (아래 payment.service 참조)
- **결제 시점**: 주문서 제출 → 결제 → **결제 확정 후에 AI 생성/제작 진행**. 현재는 결제 없이 바로 생성하지만, 결제를 생성 **앞단**에 끼운다. 기존 2단계 생성 흐름(`POST /api/ai-landing/generate` → `POST /api/ai-landing/generated/:jobId/confirm`)과의 순서는 **주문 생성(PENDING) → 결제 확정 → generate → confirm**으로 둔다(결제가 generate **앞**).
- **생성 비동기화(핵심)**: PG 웹훅은 빠른 200을 기대하고 늦으면 **재전송**한다. `confirmPayment`가 수십 초짜리 Claude 생성을 인라인으로 돌리면 웹훅 타임아웃→재전송 폭주. → **결제 확정(빠름)과 AI 생성(느림)을 분리**: 확정은 즉시 200, 생성은 **백그라운드 잡**으로 트리거하고 web은 결과를 폴링한다. (결정 #5를 비동기로 확정)
- **인증 연계**: 결제/주문은 **로그인 사용자에 귀속**한다(OAuth 설계의 `req.user`). 마이페이지 결제 내역이 실데이터가 되려면 주문이 유저에 묶여야 한다. → OAuth 설계가 **선행 의존**(아래 비범위/결정 참조).
- **범위**: 주문 생성 + 결제 + 서버 검증 + 상태머신 + 웹훅 + 마이페이지 결제 내역 실데이터화 + 환불 1건(전액). 부분환불·정산·세금계산서는 비범위.

## 전체 흐름

```
[Web 주문서 제출] (OrderForm)
   · 클라 Zod 검증 통과 → POST /api/orders { showcaseId?, orderSnapshot, mode }
   ·   서버가 금액을 계산(클라가 보낸 금액은 신뢰하지 않음) → Order(PENDING) 생성
   ·   응답: { orderId, paymentId, amount, orderName }
[Web 결제창] PortOne.requestPayment({ paymentId, orderName, totalAmount, ... })
   · 사용자 결제수단 인증/승인 (PG 호스팅 결제창)
   ┌── (A) 브라우저 콜백: 성공 시 POST /api/payments/:paymentId/confirm
   └── (B) PG 웹훅:        POST /api/payments/webhook  (Webhook.verify로 위조 검증)
        ↓ (A·B 공통 → 서버 검증 로직 1개로 수렴)
[API] 서버 사이드 검증 (payment.service)
   · PG 단건조회: GET PG /payments/{paymentId}  (서버 시크릿)
   · 검증: pgStatus == PAID  &&  pgAmount == order.amount  &&  pgOrderId == order.id
   ·   불일치(위변조) → Order(FAILED) + 결제취소 시도 + 거부 로그
   · 멱등: 이미 PAID면 그대로 반환(중복 콜백/웹훅 무시)
   · 일치 → markPaid 원자적 전이(PENDING→PAID) + Payment(PAID) (트랜잭션)
   · 전이 승자(affected===1)만 → AI 생성 잡 **비동기** 트리거(generate→confirm 경로).
   ·   확정은 즉시 반환(웹훅 빠른 200), 생성은 백그라운드.
[Web] /order/result 로 이동 (결제 성공) — 생성 결과는 폴링. 결제 실패/취소는 주문서로 복귀 + 안내
[Web] 마이페이지 GET /api/orders/mine → 유저의 주문/결제/진행단계 실데이터
[환불] 결과 페이지 "환불하기" → POST /api/orders/:id/refund { reason }
   · 서버: PG 결제취소 API 호출 → 성공 시 Order(REFUNDED) + Payment(CANCELLED)
```

## 컴포넌트 경계

각 단위는 한 가지 책임, 명확한 인터페이스, 독립 테스트 가능.

### API (`apps/api`)

**`src/lib/payment/gateway.ts`** — PG 추상화 (OAuth의 `OAuthProvider`와 동일 패턴)
- 인터페이스 `PaymentGateway`:
  - `getPayment(paymentId): Promise<PgPayment>` — PG 단건조회 (`{ status, amount, orderId, method?, paidAt? }`).
  - `cancelPayment(paymentId, reason): Promise<void>` — 결제취소/환불.
  - `verifyWebhook(rawBody: string, headers): PgWebhookEvent` — 위조 검증 후 이벤트 파싱.
- `portone.ts` — PortOne v2 REST API(`@portone/server-sdk`) 구현. 시크릿은 서버에만.
- **추상화 이유**: 라우트/서비스 로직을 실제 PG 콘솔·네트워크 없이 테스트하기 위함. 테스트에서 fake gateway 주입. PG 교체(PortOne↔토스 직연동) 시에도 이 한 파일만 갈아끼움.
- env에 PG 키가 없으면 `null` 반환(부팅 시 경고, 결제 버튼 비활성).

**`src/services/order.service.ts`** — 주문/금액 계산, Prisma 접근 전담 (PG 무관)
- `calcAmount(orderSnapshot): number` — **서버가 단일 소스로 금액 계산**. **캐노니컬 price table 상수**(아래)를 읽어 `mode`(ai/human) · 신규 vs 수정 · 페이지 수로 금액을 정한다. 클라가 보낸 금액은 절대 사용하지 않음. **이 함수가 위변조 방어의 핵심.** → 입력으로 읽는 snapshot 필드(`mode`, 신규/수정 구분, `pages` 길이)를 결정 #3에서 못박는다.
- `createOrder({ userId, showcaseId?, orderSnapshot }): Promise<Order>` — `amount = calcAmount(...)`, status `PENDING`, `paymentId`(고유) 발급.
- `getOrdersForUser(userId): Promise<OrderSummary[]>` — 마이페이지용.
- `markPaid(orderId, pgPayment): Promise<{ order: Order; transitioned: boolean }>` — **원자적 조건부 업데이트**: `updateMany({ where: { id, status: "PENDING" }, data: { status: "PAID", ... } })` + Payment upsert를 **하나의 트랜잭션**으로. `affected === 1`이면 `transitioned: true`(이번 호출이 PENDING→PAID 승자), `0`이면 이미 처리됨(`transitioned: false`, 멱등 no-op). **AI 생성 트리거는 `transitioned === true`일 때만**(이중 생성 방지).
- `markFailed(orderId, reason)`, `markRefunded(orderId, reason)`.

**`src/services/payment.service.ts`** — 검증/확정 로직 (gateway 주입)
- `confirmPayment(paymentId): Promise<Order>` — 콜백·웹훅 공통 진입점.
  1. Order 조회(`paymentId`로). 없으면 거부.
  2. 이미 PAID면 즉시 반환(멱등).
  3. `gateway.getPayment(paymentId)` 조회.
  4. **검증**: `pg.status===PAID && pg.amount===order.amount && pg.orderId===order.id`.
  5. 불일치 → `markFailed` + `gateway.cancelPayment`(자동취소) + 위변조 로그 → throw.
  6. 일치 → `markPaid`(원자적). **`transitioned === true`일 때만 AI 생성 잡을 비동기 트리거**(웹훅 타임아웃 방지 — 확정은 즉시 반환, 생성은 백그라운드). 패자/중복 호출은 생성 안 함. → Order 반환.
- `handleWebhook(rawBody, headers)` — `gateway.verifyWebhook` 후 paymentId 추출 → `confirmPayment` 위임. **생성을 인라인으로 await하지 않으므로** 웹훅은 빠르게 200 반환.

**`src/routes/payment.route.ts` / `order.route.ts`**
- `POST /api/orders` — `req.user` 필요. orderSnapshot 검증(shared) → `createOrder` → `{ orderId, paymentId, amount, orderName }`.
- `GET /api/orders/mine` — `req.user`의 주문/결제/진행단계 목록.
- `POST /api/payments/:paymentId/confirm` — 브라우저 결제완료 콜백. `confirmPayment` 호출, 결과 반환.
- `POST /api/payments/webhook` — **raw body** 필요(서명검증). `express.raw()` 적용. `handleWebhook` 호출, 200/4xx.
- `POST /api/orders/:id/refund` — `req.user` 소유 확인 → PG 취소 → `markRefunded`.

**웹훅 raw body 주의**
- `app.ts`는 전역 `express.json()`을 쓴다. **웹훅 라우트만** `express.raw({ type: "*/*" })`로 등록해 원문 문자열을 서명검증에 넘긴다(JSON 파싱하면 서명 깨짐 — PortOne SDK 요구사항). json 미들웨어보다 **먼저** 마운트하거나 라우트 단위로 분기.

**`lib/env.ts` 추가**
- `PORTONE_API_SECRET`(V2 API 시크릿, 서버 전용), `PORTONE_STORE_ID`,
  `PORTONE_CHANNEL_KEY`(브라우저 결제창용 — `NEXT_PUBLIC_`로 web에도 노출),
  `PORTONE_WEBHOOK_SECRET`(웹훅 서명검증). 미설정 시 gateway `null` + 부팅 경고.

### DB (Prisma)

```prisma
model Order {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  showcaseId    String?   // 쇼케이스 선택 주문이면 채움 (slug 아님, 내부 cuid 참조는 결정사항)
  orderSnapshot Json      // 주문서 전체 스냅샷 (mock orderStorage 승격본)
  orderName     String    // 결제창 표시명 (예: "○○ 랜딩페이지 제작")
  amount        Int       // 서버가 계산한 확정 금액(원). 위변조 비교 기준.
  status        String    // PENDING | PAID | FAILED | REFUNDED
  paymentId     String    @unique // PG에 넘기는 고유 결제 ID (멱등 키 겸용)
  payment       Payment?
  generatedJobId String?  // 결제 확정 후 생성된 GeneratedPage.jobId 연결
  createdAt     DateTime  @default(now())
  paidAt        DateTime?

  @@index([userId, createdAt])
  @@index([status])
}

model Payment {
  id         String   @id @default(cuid())
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  pgPaymentId String  // PG 측 결제 식별자
  method     String?  // card | kakaopay | naverpay ... (PG 응답)
  amount     Int
  status     String   // PAID | CANCELLED
  rawPayload Json?    // PG 단건조회 원문(감사/디버깅용)
  createdAt  DateTime @default(now())

  @@index([orderId])
}
```

- `User` 모델은 OAuth 설계에서 추가됨(선행 의존). 마이그레이션 생성/적용.
- 상태값은 enum 대신 String + shared의 Zod enum으로 계약(기존 `GeneratedPage.status` 패턴과 동일).
- 시드 변경 없음(주문은 결제 흐름으로 생성).

### Shared (`packages/shared`)

web↔api 계약 Zod 스키마 추가. 기존 mock(`apps/web/src/lib/order.ts`의 `OrderFormSchema`)을 shared로 **승격**(레포 컨벤션: "API 연동 시 shared로 승격").
```ts
OrderStatus = z.enum(["PENDING","PAID","FAILED","REFUNDED"])
OrderCreateSchema = { showcaseId?, orderSnapshot, mode }     // POST /api/orders 요청
OrderCreatedSchema = { orderId, paymentId, amount, orderName } // 응답(결제창 입력)
OrderSummarySchema = { id, orderName, amount, status, paidAt, step, generatedJobId? } // 마이페이지
RefundRequestSchema = { reason }
```
민감정보(PG 시크릿, rawPayload) 비노출. 금액은 항상 서버 응답값을 사용(클라 표시는 참고용).

**캐노니컬 price table (단일 소스)** — 현재 가격은 *모순*이 아니라 **상품 티어**인데, 표시 문자열로 흩어져 있다(`guide/page.tsx`, `order/result/page.tsx`, `mypage`의 mock, `order.ts:40`). `calcAmount`가 읽을 단일 상수로 모은다(예: `shared` 또는 `order.service`):
```ts
PRICE = {
  BASE: 10000,            // 기본(첫 페이지) 제작
  ADDITIONAL_PAGE: 10000, // 추가 페이지/장 (기존 ADDITIONAL_PAGE_PRICE 승격)
  AI_REVISION: 50000,     // AI 수정 제작
  HUMAN: 300000,          // 사람과 함께 제작(현재 mode==="human"은 결제 전 상담 — 결정 #4 참조)
}
```
흩어진 표시 문자열은 이 상수를 import해 렌더(중복 제거). **가격 확정 = 결정 #3.**

### Web (`apps/web`)

**`src/lib/payment.ts` 신규** — PortOne 브라우저 SDK 래퍼
- `startPayment(created: OrderCreated)`:
  - `import("@portone/browser-sdk/v2")` → `PortOne.requestPayment({ storeId, channelKey, paymentId, orderName, totalAmount: amount, currency: "KRW", payMethod, redirectUrl })`.
  - 결제완료(콜백) → `POST /api/payments/:paymentId/confirm`(`credentials: "include"`) → 성공 시 `/order/result`.
  - 실패/취소(`code` 존재) → 주문서 복귀 + 사유 표시.
- 키(`storeId/channelKey`)는 공개 가능 값만 `NEXT_PUBLIC_`로. 시크릿은 web에 절대 없음.

**`src/components/OrderForm.tsx` 수정** — 제출 흐름 변경
- 현재: `saveOrder()` → 곧장 `generateAiLandingFromOrder()`.
- 변경: `saveOrder()` → `POST /api/orders` → `startPayment()`. **결제 성공 시에만** 생성으로 진행(생성 트리거는 서버가 결제 확정 후 수행하므로 web은 결과 폴링/이동만). 비로그인 시 로그인 유도(OAuth `startLogin`).
- `mode==="human"`(사람에게 주문) 분기는 결제 전 상담이므로 **현행 유지**(결제는 AI 제작 확정 시).

**`src/app/order/result/page.tsx` 수정** — 환불 실연동
- `saveRefund()`(sessionStorage) → `POST /api/orders/:id/refund`로 교체. 성공 시 토스트.
- "이대로 완료하기"의 금액 문구는 서버 `amount` 기준으로 정합.

**`src/app/mypage/page.tsx` 수정** — `MOCK_PAYMENTS` 제거
- `GET /api/orders/mine`로 실데이터. `Payment` 타입 → shared `OrderSummary` 승격. 진행단계(`STEPS`)는 `status`/`generatedJobId`에서 도출.

**`src/lib/orderStorage.ts` 정리**
- `RefundState`/`saveRefund`/`getRefund` 등 결제·환불 목 레이어 제거(주석에 예고된 대로). 주문서 → 결과 데이터 전달용 `SavedOrderState`만 유지(또는 서버 주문 ID 기반 조회로 단계적 대체).

## 에러 / 멱등성 처리

- **위변조 금액**(`pg.amount !== order.amount`) → `markFailed` + PG 자동취소 + 거부 로그. 사용자엔 일반 메시지("결제 검증에 실패했어요"). 금액/원문은 로그에만.
- **콜백·웹훅 중복/동시 도착**(둘 다 도착, 재전송, 또는 **동시 진입**) → `markPaid`의 **원자적 조건부 업데이트**(`WHERE status="PENDING"`)로 단 하나만 전이 성공. 이미 PAID면 no-op. **AI 생성은 전이 승자만 트리거** → 이중 확정/이중 생성 방지. (`@unique`만으론 read-then-write 경합을 못 막으므로 원자적 가드가 필수)
- **브라우저 콜백 유실**(와이파이 끊김/새로고침) → 웹훅이 확정을 보장(이중 트리거의 존재 이유).
- **웹훅 서명 위조** → `verifyWebhook` 실패 시 4xx, 처리 안 함.
- **PG 단건조회 실패/타임아웃** → 확정 보류(PENDING 유지), 재시도 가능. 웹훅 재전송으로 복구.
- **환불 PG 실패** → Order 상태 그대로 + 에러 반환(상태 불일치 방지).
- **PG env 미설정** → 부팅 `console.warn`, 결제 버튼 비활성 + 안내(OAuth 미설정 패턴과 동일).
- **결제 취소(사용자가 결제창 닫음)** → Order PENDING 유지(미결제), 주문서 복귀.

## 직접 구현 vs 라이브러리 — 면접 설명 포인트

| 영역 | 선택 | 이유(면접 답변) |
|---|---|---|
| 결제창 / 카드·간편결제 인증 | **PG SDK** | PCI-DSS·인증·민감정보 — 직접 구현은 보안 부채. 검증된 것을 쓰는 게 옳은 엔지니어링 판단. |
| 서버 사이드 금액 검증 | **직접 구현** | "PG가 PAID라 해도 우리 DB 금액과 PG 단건조회 금액이 같을 때만 확정" — 위변조 방어를 직접 설계. |
| 주문 상태머신 | **직접 구현** | PENDING→PAID/FAILED/REFUNDED 전이 규칙·가드를 직접. 잘못된 전이 차단. |
| 멱등 처리(콜백+웹훅) | **직접 구현** | 분산 환경 중복 이벤트를 `@unique`+status 가드로 방어 — 결제 실무 단골 주제. |

핵심 메시지: **"보안 책임이 큰 PG는 SDK를 쓰되, 신뢰 경계(검증·상태·멱등)는 직접 설계했다."** 무조건 직접 구현이 아니라 **트레이드오프를 판단**했다는 것이 더 강한 시그널.

## PG 비교 (조사 결과 요약)

| 항목 | PortOne(아임포트) v2 | 토스페이먼츠 직연동 | 카카오페이/네이버페이 |
|---|---|---|---|
| 통합 범위 | **여러 PG·결제수단 단일 연동**(통합 게이트웨이) | 토스 단일(위젯 UX 우수) | 단일 간편결제 직연동 |
| 서버 검증 | 단건조회 API + 우리 DB 금액 대조 (3단계) | confirm API(서버 승인) + 단건조회 | 각 사 승인/조회 API |
| 위변조 검증 | `@portone/server-sdk`의 `Webhook.verify`(원문 문자열) | 멱등키(`Idempotency-Key`) + 시크릿 헤더 | 사별 상이 |
| 테스트 환경 | 테스트 채널 키 | 테스트 클라이언트/시크릿 키 | 테스트 가맹점 |
| 멱등성 | 우리가 status 가드로 구현 | POST에 멱등키 헤더 지원(409 처리) | 사별 상이 |
| 이 프로젝트 적합성 | **1순위** — 결제수단 확장 자유 + 로드맵 명시 | 2순위 — 단일 PG면 UX 최상 | 보조(PortOne 경유로 커버) |

> 결론: **PortOne을 기본**으로 하되, gateway 추상화로 토스 직연동 전환 비용을 낮춰둔다.
> (둘 다 공통 원칙은 동일: **클라 금액 불신 + 서버 단건조회 대조 + 멱등**.)

## 테스트 (TDD: 테스트 먼저)

- `apps/api/src/services/order.service.test.ts` — `calcAmount` 금액 계산(추가 페이지 등),
  `createOrder`(PENDING+amount 고정), `markPaid` 멱등(2회 호출 1회 효과), 상태 전이 가드.
  실제 prisma test DB.
- `apps/api/src/services/payment.service.test.ts` — **fake PaymentGateway 주입**:
  - 정상(금액 일치) → PAID + 생성 트리거.
  - **위변조 금액**(pg.amount ≠ order.amount) → FAILED + cancelPayment 호출 + throw. ★핵심 케이스
  - 중복 confirm(이미 PAID) → 멱등 no-op.
  - 웹훅 서명 위조 → 거부.
- `apps/api/src/routes/payment.route.test.ts` (supertest) — `POST /api/orders` 인증 필요(비로그인 401),
  `POST /api/payments/:id/confirm` 성공/위변조, `POST /api/payments/webhook` raw body 서명검증,
  콜백·웹훅 중복 도착 시 단일 확정.
- `apps/web/src/lib/payment.test.ts` — `requestPayment` 모킹으로 성공→confirm 호출, 실패/취소 분기.
- `apps/web/src/app/mypage/page.test.tsx` 갱신 — `/api/orders/mine` 모킹, 상태별 카드 렌더.
- 실제 PortOne 테스트 결제는 수동 스모크(외부 설정 후), 절차를 docs에 기록.

## 외부 설정 (사장님 수행 — 별도 문서로 정리)

구현은 코드 경로 전체를 완성하되, 아래는 사장님 계정으로만 가능하므로 문서로 안내:

1. **PortOne 가입** → 콘솔에서 **테스트 채널** 생성(카드 PG 연결 — 테스트 가맹점). `Store ID`, `Channel Key` 확보.
2. **V2 API Secret** 발급(콘솔 > 연동정보 > V2 API). 서버 전용.
3. **웹훅 등록**: 콘솔에서 엔드포인트 `{API}/api/payments/webhook` 등록 → 웹훅 시크릿 확보.
   prod는 `https://api.landingpick.com/...`, dev는 ngrok 등으로 외부 노출 필요(로컬 4000은 PG가 못 부름).
4. `.env`에 `PORTONE_API_SECRET`, `PORTONE_STORE_ID`, `PORTONE_WEBHOOK_SECRET` 추가(API),
   `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`(web). `.env.example`/README 갱신.
5. prod: ECS 태스크 환경변수 + SSM SecureString(시크릿)으로 주입(`DATABASE_URL` 패턴과 동일).
   Vercel 환경변수에 `NEXT_PUBLIC_PORTONE_*` 확인.
6. 실서비스 전환 시 가맹점 심사·정산계좌·이용약관/PG 계약 필요(테스트모드는 불필요).

## 비범위 (YAGNI)

- **부분 환불·정산·세금계산서·현금영수증** — 환불은 전액 1건만.
- **정기결제/구독·빌링키** — 1회성 제작비만.
- **결제수단 세분 UI**(카드 할부 개월 선택 등) — PG 기본 결제창 위임.
- **주문→메일 알림**(Resend) — 로드맵 후순위. Order가 DB에 생기면 그 위에 얹기만 하면 됨(이 작업 후 가능).
- **다중 PG 동시 운영** — gateway 추상화만 열어두고 구현은 PortOne 1개.
- **OAuth 로그인** — 본 설계의 **선행 의존**(별도 문서). 주문이 유저에 묶이려면 인증이 먼저.

## 결정 필요 사항

1. **선행 의존 순서**: 이 설계는 `User`/`req.user`(OAuth)를 전제한다. OAuth 구현을 먼저 완료하고 결제를 붙일지, 아니면 결제를 임시로 "로그인 사용자 또는 게스트(이메일 기반)"로 시작할지. → **권장: OAuth 먼저**(로드맵 4→5 순서와 일치).
2. **PG 최종 선택**: PortOne(다결제수단·로드맵 명시) vs 토스페이먼츠 직연동(위젯 UX·멱등키 표준). gateway 추상화로 전환 비용은 낮지만 1차 구현 대상은 하나여야 함. → **권장: PortOne**.
3. **가격 정책 확정**: `calcAmount`의 단일 소스가 되려면 **기본 제작비 / 추가 페이지 단가 / 수정·신규 제작비**를 코드 상수(위 price table)로 못박아야 함. 현재 값들은 *모순은 아니고* **상품 티어**(첫/추가 10,000 · AI 수정 50,000 · 사람 300,000)지만 **표시 문자열로 흩어져 단일 소스가 없다.** → ① 정식 가격표 상수화 ② `calcAmount`가 읽는 snapshot 입력 필드(`mode`/신규·수정 구분/`pages` 길이) 확정.
4. **환불 정책 범위**: 전액 환불만(현재 권장) vs 진행 단계별 차등 환불. AI 생성 비용이 이미 발생한 경우의 처리.
5. **결제-생성 결합도**: → **비동기로 확정**(위 "생성 비동기화" 결정 반영). 웹훅이 수십 초 생성을 인라인으로 돌리면 타임아웃→재전송. 결제 확정은 즉시 200, 생성은 백그라운드 잡 + web 폴링. (남은 세부: 잡 큐를 어디에 둘지 — 우선 단순 in-process 비동기 + 상태 폴링, 추후 큐로 승격)
6. **`showcaseId` 참조 방식**: 주문이 가리키는 쇼케이스를 public `slug`로 저장할지 내부 `cuid`로 저장할지(레포 규칙: 외부 노출은 slug, 내부 FK는 cuid).
```

출처(조사):
- [PortOne v2 결제검증 API (서버)](https://portone.gitbook.io/docs/v2-payment/v2-payment/3) · [PortOne 웹훅 연동](https://portone.gitbook.io/docs/v2-payment/webhook) · [@portone/server-sdk](https://portone-io.github.io/server-sdk/js/) · [PortOne 결제완료 처리(클라이언트)](https://portone.gitbook.io/docs/v2-payment/v2-payment/4)
- [토스페이먼츠 멱등키 가이드](https://docs.tosspayments.com/guides/using-api/idempotency-key) · [토스페이먼츠 결제위젯 연동](https://docs.tosspayments.com/guides/payment-widget/integration)
