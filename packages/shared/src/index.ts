import { z } from "zod";

export const LAYOUTS = ["hero", "split", "grid", "minimal"] as const;
export const LayoutSchema = z.enum(LAYOUTS);
export type MockLayout = (typeof LAYOUTS)[number];

export const CategorySchema = z.object({
  id: z.string(), // 퍼블릭 식별자 = slug ("cafe")
  label: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ShowcaseSchema = z.object({
  id: z.string(), // 퍼블릭 식별자 = slug ("cafe-bloom")
  title: z.string(),
  blurb: z.string(),
  category: z.string(), // category slug
  accent: z.string(),
  layout: LayoutSchema,
  desktop: z.string().nullable(),
  mobile: z.string().nullable(),
  thumb: z.string().nullable(),
});
export type Showcase = z.infer<typeof ShowcaseSchema>;

export const ShowcaseListSchema = z.object({
  items: z.array(ShowcaseSchema),
  nextCursor: z.string().nullable(),
});
export type ShowcaseList = z.infer<typeof ShowcaseListSchema>;

// ── 홈 리뷰 ──

export const ReviewSchema = z.object({
  id: z.string(),
  authorName: z.string(), // 서버에서 마스킹된 이름 ("김*수") — 풀네임은 응답에 노출 안 함
  body: z.string(),
  createdAt: z.string(), // ISO 8601
});
export type Review = z.infer<typeof ReviewSchema>;

export const ReviewListSchema = z.object({
  items: z.array(ReviewSchema),
  total: z.number(), // 전체 리뷰 수 (페이지네이션의 페이지 수 계산용)
});
export type ReviewList = z.infer<typeof ReviewListSchema>;

// POST 입력 검증 — web 폼(Server Action)과 api 라우트가 공유하는 단일 계약
export const ReviewCreateSchema = z.object({
  authorName: z.string().min(2, "이름은 2자 이상이어야 해요").max(10, "이름은 10자 이하여야 해요"),
  body: z.string().min(10, "내용은 10자 이상이어야 해요").max(500, "내용은 500자 이하여야 해요"),
});
export type ReviewCreate = z.infer<typeof ReviewCreateSchema>;

// ── 인증 (구글/카카오 OAuth) ──

export const OAUTH_PROVIDERS = ["google", "kakao"] as const;
export const OAuthProviderSchema = z.enum(OAUTH_PROVIDERS);
export type OAuthProviderName = (typeof OAUTH_PROVIDERS)[number];

// web↔api 계약. 민감정보(providerId, 세션 ID)는 노출하지 않는다.
export const AuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  provider: OAuthProviderSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

// ── ④ 실시간 채팅 ──

export const SENDER_TYPES = ["CUSTOMER", "ADMIN"] as const;
export const SenderTypeSchema = z.enum(SENDER_TYPES);
export type SenderType = (typeof SENDER_TYPES)[number];

export const ChatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderType: SenderTypeSchema,
  body: z.string(),
  createdAt: z.string(), // ISO 8601
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRoomSchema = z.object({
  id: z.string(),
  visitorId: z.string(),
  visitorName: z.string(),
  lastMessage: ChatMessageSchema.nullable(),
  unreadCount: z.number(), // 관리자 기준 미읽음 (고객 메시지 중 readAt null)
  updatedAt: z.string(), // ISO 8601
});
export type ChatRoom = z.infer<typeof ChatRoomSchema>;

// ── ⑤ 주문 / 결제 (PortOne) ──

export const ORDER_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export const OrderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// 주문 종류 — 금액 계산 분기. new=신규 제작, additional=추가 제작(재생성).
export const ORDER_TYPES = ["new", "additional"] as const;
export const OrderTypeSchema = z.enum(ORDER_TYPES);
export type OrderType = (typeof ORDER_TYPES)[number];

// 제작 방식 — ai=AI 생성(온라인 결제), human=사람과 함께(채팅 상담, 온라인 결제 비범위).
export const ORDER_MODES = ["ai", "human"] as const;
export const OrderModeSchema = z.enum(ORDER_MODES);
export type OrderMode = (typeof ORDER_MODES)[number];

// ── 캐노니컬 가격표 (단일 소스, 원) ──
// calcAmount가 위변조 방어의 기준으로 삼는 유일한 금액 출처. UI 표시도 이 값을 import해 렌더.
export const PRICE = {
  BASE: 10000, // 신규 제작 기본(첫 페이지)
  ADDITIONAL_PAGE: 10000, // 페이지 1개 추가당
  AI_REVISION: 50000, // 추가 제작(재생성) 정액
  HUMAN: 300000, // 사람과 함께(채팅 상담 — 온라인 결제 비범위, 참고용)
} as const;

// 금액 계산 입력 — 서버 calcAmount와 web 표시가 공유하는 최소 필드.
export const OrderPricingInputSchema = z.object({
  mode: OrderModeSchema,
  orderType: OrderTypeSchema,
  pageCount: z.number().int().min(1), // 선택한 페이지 수(기본 1)
});
export type OrderPricingInput = z.infer<typeof OrderPricingInputSchema>;

// POST /api/orders 요청 — orderSnapshot은 주문서 전체(목 OrderForm 승격본).
export const OrderCreateSchema = z.object({
  showcaseId: z.string().optional(), // 쇼케이스 선택 주문이면 slug
  mode: OrderModeSchema,
  orderType: OrderTypeSchema,
  pageCount: z.number().int().min(1),
  orderName: z.string().min(1), // 결제창 표시명
  orderSnapshot: z.unknown(), // 주문서 스냅샷(검증은 web Zod, 저장은 Json)
});
export type OrderCreate = z.infer<typeof OrderCreateSchema>;

// POST /api/orders 응답 — 브라우저 결제창 입력값. 금액은 항상 서버 계산값.
export const OrderCreatedSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  amount: z.number().int(),
  orderName: z.string(),
});
export type OrderCreated = z.infer<typeof OrderCreatedSchema>;

// 마이페이지 주문/결제 요약 — 민감정보(PG raw, paymentId) 비노출.
export const OrderSummarySchema = z.object({
  id: z.string(),
  orderName: z.string(),
  amount: z.number().int(),
  status: OrderStatusSchema,
  paidAt: z.string().nullable(), // ISO 8601
  step: z.number().int(), // 진행 단계 1~4 (status/generatedJobId에서 도출)
  generatedJobId: z.string().nullable(),
  createdAt: z.string(), // ISO 8601
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;

export const RefundRequestSchema = z.object({
  reason: z.string().min(1, "환불 사유를 입력해 주세요.").max(200),
});
export type RefundRequest = z.infer<typeof RefundRequestSchema>;
