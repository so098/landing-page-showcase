import type { Category, Showcase, ShowcaseList } from "@melstudio/shared";
import { prisma } from "../lib/prisma.js";

export async function listCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({ orderBy: { order: "asc" } });
  return rows.map((c) => ({ id: c.slug, label: c.label }));
}

type ListArgs = {
  limit: number;
  cursor?: string | null; // showcase.id (DB cuid)
  category?: string | null; // category slug
};

export async function listShowcases(args: ListArgs): Promise<ShowcaseList> {
  const { limit, cursor, category } = args;

  const where = category ? { category: { slug: category } } : {};

  // limit+1개를 받아 다음 페이지 존재 여부 판단
  const rows = await prisma.showcase.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { category: true },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: Showcase[] = page.map((r) => ({
    id: r.slug,
    title: r.title,
    blurb: r.blurb,
    category: r.category.slug,
    accent: r.accent,
    layout: r.layout as Showcase["layout"],
    desktop: null, // ② 단계에서 키→URL 매핑
    mobile: null,
    thumb: null,
  }));

  return {
    items,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
