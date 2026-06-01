import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("GET /api/categories", () => {
  it("8개 카테고리를 반환한다", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(8);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("label");
  });
});

describe("GET /api/showcases", () => {
  it("기본 limit으로 목록과 nextCursor를 반환한다", async () => {
    const res = await request(app).get("/api/showcases?limit=5");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(5);
    expect(res.body).toHaveProperty("nextCursor");
  });

  it("category 필터가 동작한다", async () => {
    const res = await request(app).get("/api/showcases?category=cafe&limit=100");
    expect(res.status).toBe(200);
    expect(
      res.body.items.every((i: { category: string }) => i.category === "cafe"),
    ).toBe(true);
  });

  it("limit 범위 밖이면 400", async () => {
    const res = await request(app).get("/api/showcases?limit=9999");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
