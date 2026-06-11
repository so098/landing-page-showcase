import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Router } from "express";
import { getObject } from "../lib/s3.js";
import { prisma } from "../lib/prisma.js";
import {
  generateForOrder,
  s3KeyFor,
  SERVED_FILES,
  CONTENT_TYPE,
  JOB_ID_RE,
} from "../services/aiLanding.service.js";

export const aiLandingRouter = Router();

aiLandingRouter.post("/generate", async (req, res, next) => {
  try {
    const { result, previewUrl } = await generateForOrder(req.body);
    res.status(result.status === "failed_quality_gate" ? 422 : 201).json({
      ...result,
      previewUrl,
    });
  } catch (error) {
    next(error);
  }
});

aiLandingRouter.post("/dry-run", async (req, res, next) => {
  try {
    const { result, previewUrl } = await generateForOrder(req.body, { dryRun: true });
    res.status(201).json({
      ...result,
      previewUrl,
    });
  } catch (error) {
    next(error);
  }
});

aiLandingRouter.post("/generated/:jobId/confirm", async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!JOB_ID_RE.test(jobId)) {
      res.status(400).json({ message: "invalid jobId" });
      return;
    }
    const page = await prisma.generatedPage.update({
      where: { jobId },
      data: { status: "confirmed", confirmedAt: new Date() },
      select: { id: true, jobId: true, status: true, confirmedAt: true },
    });
    res.json(page);
  } catch (error) {
    next(error);
  }
});

aiLandingRouter.get("/generated/:jobId/:file", async (req, res, next) => {
  try {
    const { jobId, file } = req.params;
    if (!JOB_ID_RE.test(jobId)) {
      res.status(400).json({ message: "invalid jobId" });
      return;
    }
    if (!SERVED_FILES.includes(file as (typeof SERVED_FILES)[number])) {
      res.status(404).json({ message: "not found" });
      return;
    }
    const obj = await getObject(s3KeyFor(jobId, file));
    if (!obj) {
      res.status(404).json({ message: "not found" });
      return;
    }
    res.setHeader("Content-Type", obj.contentType ?? CONTENT_TYPE[path.extname(file)] ?? "application/octet-stream");
    // 생성물은 jobId별 불변 → 적극 캐시(브라우저/CDN). 반복 조회 시 S3 히트 0.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    // pipeline은 스트림 에러를 전파/정리해 try/catch→next(error)로 안전하게 처리된다.
    await pipeline(obj.body, res);
  } catch (error) {
    next(error);
  }
});
