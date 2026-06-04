import { describe, it, expect, beforeEach } from "vitest";
import { maskName, listReviews, createReview } from "./review.service";
import { prisma } from "../lib/prisma";

beforeEach(async () => {
  // 리뷰 테스트는 자체적으로 데이터를 만들어 검증 (시드와 독립)
  await prisma.review.deleteMany();
});

describe("maskName", () => {
  it("3자 이름은 두 번째 글자를 마스킹한다", () => {
    expect(maskName("김민수")).toBe("김*수");
  });

  it("4자 이름은 두 번째 글자만 마스킹한다", () => {
    expect(maskName("남궁민수")).toBe("남*민수");
  });

  it("2자 이름은 두 번째 글자를 마스킹한다", () => {
    expect(maskName("이준")).toBe("이*");
  });

  it("1자(외자) 이름은 통째로 마스킹한다", () => {
    expect(maskName("김")).toBe("*");
  });
});

describe("createReview", () => {
  it("저장 후 마스킹된 이름을 반환한다", async () => {
    const review = await createReview({ authorName: "박지영", body: "정말 마음에 들어요. 감사합니다." });
    expect(review.authorName).toBe("박*영");
    expect(review.body).toBe("정말 마음에 들어요. 감사합니다.");
    expect(typeof review.id).toBe("string");
    expect(typeof review.createdAt).toBe("string"); // ISO
  });
});

describe("listReviews", () => {
  it("최신순(createdAt desc)으로 반환하고 이름을 마스킹한다", async () => {
    await createReview({ authorName: "김하나", body: "첫 번째 리뷰입니다 정말로." });
    await createReview({ authorName: "이두리", body: "두 번째 리뷰입니다 정말로." });
    const { items } = await listReviews({ limit: 6 });
    expect(items.length).toBe(2);
    // 나중에 만든 리뷰가 맨 앞
    expect(items[0].body).toBe("두 번째 리뷰입니다 정말로.");
    expect(items[0].authorName).toBe("이*리");
    expect(items[1].authorName).toBe("김*나");
  });

  it("limit 만큼만 반환한다", async () => {
    for (let i = 0; i < 5; i++) {
      await createReview({ authorName: "테스터", body: `리뷰 내용 번호 ${i} 입니다.` });
    }
    const { items } = await listReviews({ limit: 3 });
    expect(items.length).toBe(3);
  });

  it("리뷰가 없으면 빈 배열 + total 0을 반환한다", async () => {
    const { items, total } = await listReviews({ limit: 6 });
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it("total은 페이지 크기와 무관하게 전체 리뷰 수다", async () => {
    for (let i = 0; i < 7; i++) {
      await createReview({ authorName: "테스터", body: `리뷰 내용 번호 ${i} 입니다.` });
    }
    const { items, total } = await listReviews({ limit: 5 });
    expect(items.length).toBe(5);
    expect(total).toBe(7);
  });

  it("page로 건너뛴다 (page 2는 다음 묶음)", async () => {
    // i=0..6 순서로 생성 → 최신순이면 6,5,4,3,2,1,0
    for (let i = 0; i < 7; i++) {
      await createReview({ authorName: "테스터", body: `리뷰 내용 번호 ${i} 입니다.` });
    }
    const page1 = await listReviews({ limit: 5, page: 1 });
    const page2 = await listReviews({ limit: 5, page: 2 });
    expect(page1.items.length).toBe(5);
    expect(page2.items.length).toBe(2); // 7개 중 나머지 2개
    // 페이지 간 중복 없음
    const ids = new Set([...page1.items, ...page2.items].map((r) => r.id));
    expect(ids.size).toBe(7);
  });
});
