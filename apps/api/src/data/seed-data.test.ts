import { describe, it, expect } from "vitest";
import { LAYOUTS } from "@melstudio/shared";
import {
  SEED_CATEGORIES,
  SEED_SHOWCASES,
  generateShowcases,
  ALL_SEED_SHOWCASES,
} from "./seed-data";

describe("generateShowcases", () => {
  it("카테고리당 15개씩 생성한다 (8 x 15 = 120개)", () => {
    expect(generateShowcases().length).toBe(SEED_CATEGORIES.length * 15);
  });

  it("전체 시드는 원본 39 + 생성 120 = 159개다", () => {
    expect(ALL_SEED_SHOWCASES.length).toBe(SEED_SHOWCASES.length + 120);
    expect(ALL_SEED_SHOWCASES.length).toBe(159);
  });

  it("slug가 전체에서 유일하다", () => {
    const slugs = ALL_SEED_SHOWCASES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
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
