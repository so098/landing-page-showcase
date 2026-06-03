import { describe, it, expect } from "vitest";
import { LAYOUTS, ReviewCreateSchema } from "@melstudio/shared";
import {
  SEED_CATEGORIES,
  SEED_SHOWCASES,
  generateShowcases,
  ALL_SEED_SHOWCASES,
  SEED_REVIEWS,
} from "./seed-data";

describe("generateShowcases", () => {
  it("카테고리당 125개씩 생성한다 (8 x 125 = 1,000개)", () => {
    expect(generateShowcases().length).toBe(SEED_CATEGORIES.length * 125);
  });

  it("전체 시드는 원본 39 + 생성 1,000 = 1,039개다", () => {
    expect(ALL_SEED_SHOWCASES.length).toBe(SEED_SHOWCASES.length + 1000);
    expect(ALL_SEED_SHOWCASES.length).toBe(1039);
  });

  it("slug가 전체에서 유일하다", () => {
    const slugs = ALL_SEED_SHOWCASES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("제목이 반복 주기를 넘어가면 'N호점'으로 구분된다", () => {
    const gen = generateShowcases();
    // 카테고리당 첫 15개는 호점 없음, 16번째(인덱스 15)부터 2호점
    expect(gen[0].title).not.toMatch(/호점$/);
    expect(gen[15].title).toMatch(/2호점$/);
    expect(gen[30].title).toMatch(/3호점$/);
  });

  it("모든 항목의 category가 유효한 카테고리 slug다", () => {
    const valid = new Set(SEED_CATEGORIES.map((c) => c.slug));
    for (const s of ALL_SEED_SHOWCASES) {
      expect(valid.has(s.category), `invalid category: ${s.slug}`).toBe(true);
    }
  });

  it("모든 항목의 layout이 유효하다", () => {
    const valid = new Set<string>(LAYOUTS);
    for (const s of ALL_SEED_SHOWCASES) {
      expect(valid.has(s.layout), `invalid layout: ${s.slug}`).toBe(true);
    }
  });

  it("같은 입력이면 같은 결과를 낸다 (결정적)", () => {
    expect(generateShowcases()).toEqual(generateShowcases());
  });
});

describe("SEED_REVIEWS", () => {
  it("리뷰 10개를 노출한다", () => {
    expect(SEED_REVIEWS.length).toBe(10);
  });

  it("모든 리뷰가 ReviewCreateSchema(이름 2~10자, 내용 10~500자)를 통과한다", () => {
    for (const r of SEED_REVIEWS) {
      expect(
        ReviewCreateSchema.safeParse({ authorName: r.authorName, body: r.body }).success,
        `invalid review: ${r.authorName}`,
      ).toBe(true);
    }
  });

  it("daysAgo가 결정적(난수 아님)으로 분산돼 있다", () => {
    // 난수였다면 두 번 import해도 같을 수 없음 — 상수 배열이므로 항상 동일
    const days = SEED_REVIEWS.map((r) => r.daysAgo);
    expect(days.every((d) => Number.isInteger(d) && d > 0)).toBe(true);
    expect(new Set(days).size).toBe(days.length); // 모두 서로 다른 날짜
  });
});
