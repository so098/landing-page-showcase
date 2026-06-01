import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
import { validateQuery } from "./validate";
import { errorHandler } from "./error";

function appWith() {
  const app = express();
  app.get(
    "/t",
    validateQuery(z.object({ limit: z.coerce.number().min(1).max(50) })),
    (req, res) => res.json({ limit: (req as any).valid.query.limit }),
  );
  app.use(errorHandler);
  return app;
}

describe("validateQuery + errorHandler", () => {
  it("유효 쿼리는 통과시키고 파싱값을 넣는다", async () => {
    const res = await request(appWith()).get("/t?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
  });

  it("유효하지 않으면 400 + 에러 형식", async () => {
    const res = await request(appWith()).get("/t?limit=999");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
