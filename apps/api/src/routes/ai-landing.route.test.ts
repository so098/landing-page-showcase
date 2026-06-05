import { Readable } from "node:stream";
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";

// S3 모듈 모킹 — 실제 S3 미접근. 실제 시그니처로 타입을 주어 mock.calls가
// 올바른 튜플 타입이 되게 한다(스프레드/인덱싱 타입 에러 방지).
const putObject = vi.fn(async (_key: string, _body: Buffer, _contentType: string) => {});
const getObject = vi.fn(
  async (_key: string): Promise<{ body: Readable; contentType?: string } | null> => null,
);
vi.mock("../lib/s3.js", () => ({
  putObject: (...a: Parameters<typeof putObject>) => putObject(...a),
  getObject: (...a: Parameters<typeof getObject>) => getObject(...a),
  assetsBucket: () => "test-bucket",
}));

// app은 모킹 적용 후 import
const { createApp } = await import("../app");
const app = createApp();

// LandingGenerationRequestSchema 필수: industry(string min 1), 나머지 기본값 있음
// businessName은 스키마에 없으므로 무시됨 — brandName 기본값("브랜드명") 사용
const ORDER = { industry: "cafe", tone: "warm", goal: "방문예약", dryRun: true };

beforeEach(async () => {
  await prisma.generatedPage.deleteMany();
  putObject.mockClear();
});

describe("POST /api/ai-landing/dry-run", () => {
  it("생성 파일을 S3에 업로드하고 RDS에 S3 키를 기록한다", async () => {
    const res = await request(app).post("/api/ai-landing/dry-run").send(ORDER);
    expect(res.status).toBe(201);
    const jobId = res.body.jobId as string;

    const keys = putObject.mock.calls.map((c) => c[0] as string);
    expect(keys).toContain(`generated-landings/${jobId}/index.html`);
    expect(keys).toContain(`generated-landings/${jobId}/styles.css`);
    expect(keys).toContain(`generated-landings/${jobId}/script.js`);

    const row = await prisma.generatedPage.findUnique({ where: { jobId } });
    expect(row?.htmlS3Key).toBe(`generated-landings/${jobId}/index.html`);
    expect(row?.cssS3Key).toBe(`generated-landings/${jobId}/styles.css`);
    expect(row?.jsS3Key).toBe(`generated-landings/${jobId}/script.js`);
  });
});

describe("GET /api/ai-landing/generated/:jobId/:file", () => {
  const JOB = "00000000-0000-4000-8000-000000000000";

  it("S3에서 파일을 스트리밍하고 불변 캐시 헤더를 준다", async () => {
    getObject.mockResolvedValueOnce({
      body: Readable.from([Buffer.from("<html>ok</html>")]),
      contentType: "text/html; charset=utf-8",
    });
    const res = await request(app).get(`/api/ai-landing/generated/${JOB}/index.html`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("ok");
    expect(res.headers["cache-control"]).toContain("immutable");
    expect(getObject).toHaveBeenCalledWith(`generated-landings/${JOB}/index.html`);
  });

  it("S3에 없으면 404", async () => {
    getObject.mockResolvedValueOnce(null);
    const res = await request(app).get(`/api/ai-landing/generated/${JOB}/script.js`);
    expect(res.status).toBe(404);
  });
});
