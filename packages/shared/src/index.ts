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
});
export type ReviewList = z.infer<typeof ReviewListSchema>;

// POST 입력 검증 — web 폼(Server Action)과 api 라우트가 공유하는 단일 계약
export const ReviewCreateSchema = z.object({
  authorName: z.string().min(2, "이름은 2자 이상이어야 해요").max(10, "이름은 10자 이하여야 해요"),
  body: z.string().min(10, "내용은 10자 이상이어야 해요").max(500, "내용은 500자 이하여야 해요"),
});
export type ReviewCreate = z.infer<typeof ReviewCreateSchema>;

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
