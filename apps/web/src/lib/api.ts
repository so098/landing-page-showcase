import {
  CategorySchema,
  ShowcaseListSchema,
  type Category,
  type ShowcaseList,
} from "@melstudio/shared";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE}/api/categories`);
  if (!res.ok) throw new Error(`categories ${res.status}`);
  return CategorySchema.array().parse(await res.json());
}

export async function fetchShowcases(params: {
  limit?: number;
  cursor?: string | null;
  category?: string | null;
}): Promise<ShowcaseList> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 100));
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.category && params.category !== "all") q.set("category", params.category);
  const res = await fetch(`${BASE}/api/showcases?${q.toString()}`);
  if (!res.ok) throw new Error(`showcases ${res.status}`);
  return ShowcaseListSchema.parse(await res.json());
}
