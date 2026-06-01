import { describe, it, expect } from "vitest";
import { ShowcaseSchema, CategorySchema, ShowcaseListSchema, LAYOUTS } from "./index";

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
