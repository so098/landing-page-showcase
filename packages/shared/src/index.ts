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
