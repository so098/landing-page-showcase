import { z } from "zod";

// ③ 단계: 주문(결제 연동 제외) — 플랜 + 주문 폼.
// 백엔드 연동 전이라 검증은 클라이언트에서 수행한다.
// (API 연동 단계에서 packages/shared 로 승격 예정)
export const PLANS = ["basic", "pro", "premium"] as const;
export type Plan = (typeof PLANS)[number];

export const OrderInputSchema = z.object({
  showcaseId: z.string().min(1, "쇼케이스를 선택해 주세요."),
  plan: z.enum(PLANS),
  name: z
    .string()
    .trim()
    .min(2, "이름을 2자 이상 입력해 주세요.")
    .max(40, "이름이 너무 길어요."),
  phone: z
    .string()
    .trim()
    .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 휴대폰 번호를 입력해 주세요."),
  email: z.string().trim().email("올바른 이메일을 입력해 주세요."),
  message: z
    .string()
    .trim()
    .max(1000, "요청사항은 1000자 이내로 입력해 주세요.")
    .optional(),
});
export type OrderInput = z.infer<typeof OrderInputSchema>;
