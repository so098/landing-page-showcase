import { describe, it, expect, beforeAll } from "vitest";
import { listCategories, listShowcases } from "./showcase.service";
import { prisma } from "../lib/prisma";

beforeAll(async () => {
  // 시드가 적용된 로컬 DB를 가정 (npm run db:seed 선행)
  const count = await prisma.showcase.count();
  if (count === 0) throw new Error("DB가 비어있음. 먼저 db:seed 실행 필요");
});

describe("listCategories", () => {
  it("order 순으로 카테고리를 반환한다", async () => {
    const cats = await listCategories();
    expect(cats.length).toBe(8);
    expect(cats[0].id).toBe("cafe"); // order=1
    expect(cats[0]).toHaveProperty("label");
  });
});

describe("listShowcases", () => {
  it("limit 만큼 반환하고 nextCursor를 준다", async () => {
    const page = await listShowcases({ limit: 5 });
    expect(page.items.length).toBe(5);
    expect(typeof page.nextCursor).toBe("string");
    expect(page.items[0]).toMatchObject({
      desktop: null,
      mobile: null,
      thumb: null,
    });
    expect(page.items[0].id).toBeTypeOf("string"); // slug
  });

  it("cursor로 다음 페이지를 이어받아 중복이 없다", async () => {
    const p1 = await listShowcases({ limit: 5 });
    const p2 = await listShowcases({ limit: 5, cursor: p1.nextCursor! });
    const ids1 = new Set(p1.items.map((i) => i.id));
    for (const it of p2.items) expect(ids1.has(it.id)).toBe(false);
  });

  it("category로 필터링한다", async () => {
    const page = await listShowcases({ limit: 100, category: "cafe" });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((i) => i.category === "cafe")).toBe(true);
  });

  it("마지막 페이지는 nextCursor가 null", async () => {
    const page = await listShowcases({ limit: 2000 });
    expect(page.nextCursor).toBeNull();
  });
});
