import { describe, it, expect } from "vitest";
import { LAYOUTS } from "@melstudio/shared";
import {
  SEED_CATEGORIES,
  SEED_SHOWCASES,
  generateShowcases,
  ALL_SEED_SHOWCASES,
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
