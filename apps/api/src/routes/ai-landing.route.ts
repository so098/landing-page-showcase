import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { generateLanding, LandingGenerationRequestSchema } from "@melstudio/ai-landing";
import { putObject, getObject } from "../lib/s3.js";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";

export const aiLandingRouter = Router();

type GeneratedResultForDb = Awaited<ReturnType<typeof generateLanding>>;

// 출력 디렉터리에서 S3로 서빙할 파일 목록
const SERVED_FILES = ["index.html", "styles.css", "script.js", "hero.jpg"] as const;
const CONTENT_TYPE: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
};

function s3KeyFor(jobId: string, file: string): string {
  return `generated-landings/${jobId}/${file}`;
}

// 출력 디렉터리의 서빙 대상 파일을 S3로 업로드(없는 파일은 건너뜀 — 스텁은 hero 없음)
async function uploadGeneratedLanding(jobId: string, outputDir: string): Promise<void> {
  for (const file of SERVED_FILES) {
    const local = path.join(outputDir, file);
    if (!existsSync(local)) continue;
    const body = await readFile(local);
    const ext = path.extname(file);
    await putObject(s3KeyFor(jobId, file), body, CONTENT_TYPE[ext] ?? "application/octet-stream");
  }
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function saveGeneratedPage(params: {
  result: GeneratedResultForDb;
  orderSnapshot: unknown;
  previewUrl: string;
}) {
  const orderSnapshot = asJson(params.orderSnapshot);
  const quality = asJson(params.result.quality);
  const notes = asJson(params.result.notes);

  await prisma.generatedPage.upsert({
    where: { jobId: params.result.jobId },
    update: {
      status: params.result.status,
      modelUsed: params.result.modelUsed,
      previewUrl: params.previewUrl,
      outputDir: params.result.outputDir,
      indexHtmlPath: params.result.files.indexHtml,
      stylesCssPath: params.result.files.stylesCss,
      scriptJsPath: params.result.files.scriptJs,
      htmlS3Key: s3KeyFor(params.result.jobId, "index.html"),
      cssS3Key: s3KeyFor(params.result.jobId, "styles.css"),
      jsS3Key: s3KeyFor(params.result.jobId, "script.js"),
      orderSnapshot,
      quality,
      notes,
    },
    create: {
      jobId: params.result.jobId,
      status: params.result.status,
      modelUsed: params.result.modelUsed,
      previewUrl: params.previewUrl,
      outputDir: params.result.outputDir,
      indexHtmlPath: params.result.files.indexHtml,
      stylesCssPath: params.result.files.stylesCss,
      scriptJsPath: params.result.files.scriptJs,
      htmlS3Key: s3KeyFor(params.result.jobId, "index.html"),
      cssS3Key: s3KeyFor(params.result.jobId, "styles.css"),
      jsS3Key: s3KeyFor(params.result.jobId, "script.js"),
      orderSnapshot,
      quality,
      notes,
    },
  });
}

function generatedRoot(): string {
  return env.AI_LANDING_OUTPUT_DIR ?? path.resolve(process.cwd(), "generated", "ai-landings");
}

aiLandingRouter.post("/generate", async (req, res, next) => {
  try {
    const input = LandingGenerationRequestSchema.parse(req.body);
    const result = await generateLanding(input, {
      apiKey: env.ANTHROPIC_API_KEY ?? env.CLAUDE_API_KEY,
      model: env.CLAUDE_MODEL,
      outputRoot: generatedRoot(),
    });
    const previewUrl = `/api/ai-landing/generated/${result.jobId}/index.html`;
    await uploadGeneratedLanding(result.jobId, result.outputDir);
    await saveGeneratedPage({ result, orderSnapshot: input, previewUrl });
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
    const input = LandingGenerationRequestSchema.parse({ ...req.body, dryRun: true });
    const result = await generateLanding(input, {
      outputRoot: generatedRoot(),
    });
    const previewUrl = `/api/ai-landing/generated/${result.jobId}/index.html`;
    await uploadGeneratedLanding(result.jobId, result.outputDir);
    await saveGeneratedPage({ result, orderSnapshot: input, previewUrl });
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
    if (!/^[a-f0-9-]{36}$/i.test(jobId)) {
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
    if (!/^[a-f0-9-]{36}$/i.test(jobId)) {
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
    obj.body.pipe(res);
  } catch (error) {
    next(error);
  }
});
