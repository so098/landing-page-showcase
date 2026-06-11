import {
  CategorySchema,
  ShowcaseListSchema,
  ReviewListSchema,
  OrderCreatedSchema,
  OrderSummarySchema,
  type Category,
  type Showcase,
  type ShowcaseList,
  type ReviewList,
  type OrderCreate,
  type OrderCreated,
  type OrderSummary,
} from "@melstudio/shared";
import type { OrderForm } from "./order";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// init: 서버 컴포넌트에서 ISR 캐시 옵션(next.revalidate 등)을 넘길 때 사용.
// 클라이언트(React Query)에서는 생략하면 된다.
export async function fetchCategories(init?: RequestInit): Promise<Category[]> {
  const res = await fetch(`${BASE}/api/categories`, init);
  if (!res.ok) throw new Error(`categories ${res.status}`);
  return CategorySchema.array().parse(await res.json());
}

export async function fetchShowcases(
  params: {
    limit?: number;
    cursor?: string | null;
    category?: string | null;
  },
  init?: RequestInit,
): Promise<ShowcaseList> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 100));
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.category && params.category !== "all") q.set("category", params.category);
  const res = await fetch(`${BASE}/api/showcases?${q.toString()}`, init);
  if (!res.ok) throw new Error(`showcases ${res.status}`);
  return ShowcaseListSchema.parse(await res.json());
}

// slug(=Showcase.id)로 단일 쇼케이스 조회. 전용 단건 엔드포인트가 아직 없어
// 목록을 재사용한다 (queries.ts의 useShowcaseBySlug와 같은 전략). 서버에서
// generateMetadata가 호출하므로 ISR 캐시 옵션을 넘길 수 있다.
export async function fetchShowcaseBySlug(
  slug: string,
  init?: RequestInit,
): Promise<Showcase | null> {
  const { items } = await fetchShowcases({ limit: 100 }, init);
  return items.find((s) => s.id === slug) ?? null;
}

export async function fetchReviews(
  params: { limit?: number; page?: number },
  init?: RequestInit,
): Promise<ReviewList> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 6));
  if (params.page) q.set("page", String(params.page));
  const res = await fetch(`${BASE}/api/reviews?${q.toString()}`, init);
  if (!res.ok) throw new Error(`reviews ${res.status}`);
  return ReviewListSchema.parse(await res.json());
}

export type AiLandingGenerationResult = {
  jobId: string;
  status: "generated" | "dry_run" | "failed_quality_gate";
  previewUrl?: string;
  modelUsed: string;
  quality: Array<{ name: string; ok: boolean; stdout: string; stderr: string }>;
  notes: string[];
};

// ── 주문 / 결제 ──
// 모두 세션 쿠키가 필요하므로 credentials: "include".

// 주문 생성 — 서버가 금액을 계산. 응답은 결제창 입력값.
export async function createOrder(input: OrderCreate): Promise<OrderCreated> {
  const res = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create order ${res.status}`);
  return OrderCreatedSchema.parse(await res.json());
}

// 마이페이지 — 내 주문/결제/진행단계 목록.
export async function fetchMyOrders(): Promise<OrderSummary[]> {
  const res = await fetch(`${BASE}/api/orders/mine`, { credentials: "include" });
  if (!res.ok) throw new Error(`my orders ${res.status}`);
  const data = (await res.json()) as { items: unknown };
  return OrderSummarySchema.array().parse(data.items);
}

// 전액 환불.
export async function refundOrder(orderId: string, reason: string): Promise<void> {
  const res = await fetch(`${BASE}/api/orders/${orderId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`refund ${res.status}`);
}

// 결제 활성 여부 — PG 키 미설정 시 false(결제 버튼 비활성/대체 흐름).
export async function fetchPaymentEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/payments/enabled`, { credentials: "include" });
    if (!res.ok) return false;
    const data = (await res.json()) as { enabled?: boolean };
    return Boolean(data.enabled);
  } catch {
    return false;
  }
}

export async function confirmGeneratedLanding(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/ai-landing/generated/${jobId}/confirm`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`confirm generated landing ${res.status}`);
}

export async function generateAiLandingFromOrder(order: OrderForm): Promise<AiLandingGenerationResult> {
  const infoText = order.infoSections
    ? Object.entries(order.infoSections)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    : "";

  const request = {
    industry: order.industry,
    goal: [
      order.purpose,
      order.targetMessage && `핵심 메시지: ${order.targetMessage}`,
      order.targetPain && `고객 고민: ${order.targetPain}`,
      order.targetHesitation && `망설임: ${order.targetHesitation}`,
      infoText && `포함 정보:\n${infoText}`,
      order.copyText && `직접 작성 문구: ${order.copyText}`,
    ].filter(Boolean).join("\n"),
    brandName: order.businessName,
    templateSlug: order.showcaseId,
    tone: order.moods?.join(", "),
    targetAudience: [order.targetProfile, order.links && `참고 링크: ${order.links}`].filter(Boolean).join("\n"),
    cta: order.purpose,
    dryRun: false,
    runFoldCheck: false,
    repairAttempts: 1,
    imageAssets: [],
  };

  const res = await fetch(`${BASE}/api/ai-landing/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`ai landing ${res.status}`);
  const data = await res.json() as AiLandingGenerationResult;
  if (data.previewUrl?.startsWith("/")) {
    data.previewUrl = `${BASE}${data.previewUrl}`;
  }
  return data;
}
