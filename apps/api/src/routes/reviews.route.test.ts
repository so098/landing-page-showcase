import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();

beforeEach(async () => {
  await prisma.review.deleteMany();
});

describe("POST /api/reviews", () => {
  it("유효한 body면 201 + 마스킹된 리뷰를 반환한다", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .send({ authorName: "김민수", body: "디자인이 정말 마음에 들어요. 추천합니다." });
    expect(res.status).toBe(201);
    expect(res.body.authorName).toBe("김*수"); // 응답에 풀네임 노출 안 됨
    expect(res.body.body).toBe("디자인이 정말 마음에 들어요. 추천합니다.");
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("createdAt");
  });

  it("이름이 너무 짧으면 400", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .send({ authorName: "김", body: "열 글자가 넘는 충분한 내용입니다." });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("내용이 너무 짧으면 400", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .send({ authorName: "김민수", body: "짧음" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/reviews", () => {
  it("최신순 목록을 마스킹해 반환한다", async () => {
    await request(app)
      .post("/api/reviews")
      .send({ authorName: "박지영", body: "첫 번째 리뷰 내용입니다 정말로." });
    await request(app)
      .post("/api/reviews")
      .send({ authorName: "최우식", body: "두 번째 리뷰 내용입니다 정말로." });

    const res = await request(app).get("/api/reviews");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.items[0].body).toBe("두 번째 리뷰 내용입니다 정말로.");
    expect(res.body.items[0].authorName).toBe("최*식");
  });

  it("limit으로 개수를 제한하고 total은 전체 수를 반환한다", async () => {
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post("/api/reviews")
        .send({ authorName: "테스터", body: `리뷰 내용 번호 ${i} 입니다.` });
    }
    const res = await request(app).get("/api/reviews?limit=2");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.total).toBe(4); // 페이지 크기와 무관한 전체 수
  });

  it("page로 다음 묶음을 가져온다", async () => {
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post("/api/reviews")
        .send({ authorName: "테스터", body: `리뷰 내용 번호 ${i} 입니다.` });
    }
    const p1 = await request(app).get("/api/reviews?limit=3&page=1");
    const p2 = await request(app).get("/api/reviews?limit=3&page=2");
    expect(p1.body.items.length).toBe(3);
    expect(p2.body.items.length).toBe(1); // 4개 중 나머지 1개
    expect(p1.body.total).toBe(4);
    expect(p2.body.total).toBe(4);
  });

  it("limit이 범위 밖이면 400", async () => {
    const res = await request(app).get("/api/reviews?limit=9999");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("page가 0 이하면 400", async () => {
    const res = await request(app).get("/api/reviews?page=0");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
