import {
  CategorySchema,
  ShowcaseListSchema,
  ReviewListSchema,
  type Category,
  type ShowcaseList,
  type ReviewList,
} from "@melstudio/shared";

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

export async function fetchReviews(
  params: { limit?: number },
  init?: RequestInit,
): Promise<ReviewList> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 6));
  const res = await fetch(`${BASE}/api/reviews?${q.toString()}`, init);
  if (!res.ok) throw new Error(`reviews ${res.status}`);
  return ReviewListSchema.parse(await res.json());
}
