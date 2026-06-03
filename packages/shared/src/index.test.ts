import { describe, it, expect } from "vitest";
import {
  ShowcaseSchema,
  CategorySchema,
  ShowcaseListSchema,
  LAYOUTS,
  ReviewSchema,
  ReviewListSchema,
  ReviewCreateSchema,
} from "./index";

describe("shared schemas", () => {
  it("LAYOUTS 4종을 노출한다", () => {
    expect(LAYOUTS).toEqual(["hero", "split", "grid", "minimal"]);
  });

  it("유효한 Showcase를 통과시킨다", () => {
    const ok = ShowcaseSchema.parse({
      id: "cafe-bloom",
      title: "블룸 로스터스",
      blurb: "스페셜티 원두 구독 브랜드",
      category: "cafe",
      accent: "#C2410C",
      layout: "hero",
      desktop: null,
      mobile: null,
      thumb: null,
    });
    expect(ok.id).toBe("cafe-bloom");
  });

  it("잘못된 layout을 거부한다", () => {
    expect(() =>
      ShowcaseSchema.parse({
        id: "x", title: "x", blurb: "x", category: "cafe",
        accent: "#000", layout: "weird", desktop: null, mobile: null, thumb: null,
      }),
    ).toThrow();
  });

  it("Category와 목록 응답을 검증한다", () => {
    expect(CategorySchema.parse({ id: "cafe", label: "카페·베이커리" }).id).toBe("cafe");
    const list = ShowcaseListSchema.parse({ items: [], nextCursor: null });
    expect(list.nextCursor).toBeNull();
  });
});

describe("review schemas", () => {
  it("유효한 Review(마스킹된 이름)를 통과시킨다", () => {
    const ok = ReviewSchema.parse({
      id: "ckxxx",
      authorName: "김*수",
      body: "디자인이 정말 마음에 들어요. 빠르게 제작해주셔서 감사합니다.",
      createdAt: "2026-05-28T00:00:00.000Z",
    });
    expect(ok.authorName).toBe("김*수");
  });

  it("ReviewList 응답을 검증한다", () => {
    const list = ReviewListSchema.parse({ items: [] });
    expect(list.items).toEqual([]);
  });

  it("ReviewCreate: 이름 2~10자, 내용 10~500자를 통과시킨다", () => {
    const ok = ReviewCreateSchema.parse({
      authorName: "김민수",
      body: "정말 빠르고 친절하게 만들어 주셨어요. 추천합니다.",
    });
    expect(ok.authorName).toBe("김민수");
  });

  it("ReviewCreate: 이름이 1자면 거부한다", () => {
    expect(() =>
      ReviewCreateSchema.parse({ authorName: "김", body: "열글자넘는내용입니다정말로" }),
    ).toThrow();
  });

  it("ReviewCreate: 내용이 10자 미만이면 거부한다", () => {
    expect(() =>
      ReviewCreateSchema.parse({ authorName: "김민수", body: "짧아요" }),
    ).toThrow();
  });
});
