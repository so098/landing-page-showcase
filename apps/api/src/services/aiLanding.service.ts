import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { generateLanding, LandingGenerationRequestSchema } from "@melstudio/ai-landing";
import { putObject } from "../lib/s3.js";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";

// AI 랜딩 생성 + S3 업로드 + RDS 기록의 단일 소스.
// 라우트(POST /generate, /dry-run)와 결제 확정 후 생성 트리거가 함께 사용한다.

type GeneratedResult = Awaited<ReturnType<typeof generateLanding>>;

// jobId는 UUID. 경로/키 주입 방지 + 의도(불변 UUID)를 명확히.
export const JOB_ID_RE =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// 출력 디렉터리에서 S3로 서빙할 파일 목록.
export const SERVED_FILES = ["index.html", "styles.css", "script.js", "hero.jpg"] as const;
export const CONTENT_TYPE: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
};

export function s3KeyFor(jobId: string, file: string): string {
  return `generated-landings/${jobId}/${file}`;
}

// 출력 디렉터리의 서빙 대상 파일을 S3로 업로드(없는 파일은 건너뜀 — 스텁은 hero 없음).
async function uploadGeneratedLanding(jobId: string, outputDir: string): Promise<Set<string>> {
  const uploaded = new Set<string>();
  for (const file of SERVED_FILES) {
    const local = path.join(outputDir, file);
    if (!existsSync(local)) continue;
    const body = await readFile(local);
    const ext = path.extname(file);
    await putObject(s3KeyFor(jobId, file), body, CONTENT_TYPE[ext] ?? "application/octet-stream");
    uploaded.add(file);
  }
  return uploaded;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function saveGeneratedPage(params: {
  result: GeneratedResult;
  orderSnapshot: unknown;
  previewUrl: string;
  uploaded: Set<string>;
}) {
  const orderSnapshot = asJson(params.orderSnapshot);
  const quality = asJson(params.result.quality);
  const notes = asJson(params.result.notes);

  // 실제로 S3에 업로드된 파일만 키를 기록(없으면 null).
  const s3Key = (file: string): string | null =>
    params.uploaded.has(file) ? s3KeyFor(params.result.jobId, file) : null;

  const data = {
    status: params.result.status,
    modelUsed: params.result.modelUsed,
    previewUrl: params.previewUrl,
    outputDir: params.result.outputDir,
    indexHtmlPath: params.result.files.indexHtml,
    stylesCssPath: params.result.files.stylesCss,
    scriptJsPath: params.result.files.scriptJs,
    htmlS3Key: s3Key("index.html"),
    cssS3Key: s3Key("styles.css"),
    jsS3Key: s3Key("script.js"),
    orderSnapshot,
    quality,
    notes,
  };

  await prisma.generatedPage.upsert({
    where: { jobId: params.result.jobId },
    update: data,
    create: { jobId: params.result.jobId, ...data },
  });
}

function generatedRoot(): string {
  return env.AI_LANDING_OUTPUT_DIR ?? path.resolve(process.cwd(), "generated", "ai-landings");
}

// 주문 스냅샷으로 랜딩을 생성·업로드·기록한다.
// dryRun=true면 실제 LLM 호출 없이 스텁 생성(테스트/미리보기).
export async function generateForOrder(
  rawInput: unknown,
  opts: { dryRun?: boolean } = {},
): Promise<{ result: GeneratedResult; previewUrl: string }> {
  const dryRun = opts.dryRun ?? false;
  const input = LandingGenerationRequestSchema.parse(
    dryRun ? { ...(rawInput as object), dryRun: true } : rawInput,
  );
  const result = await generateLanding(
    input,
    dryRun
      ? { outputRoot: generatedRoot() }
      : {
          apiKey: env.ANTHROPIC_API_KEY ?? env.CLAUDE_API_KEY,
          model: env.CLAUDE_MODEL,
          outputRoot: generatedRoot(),
        },
  );
  const previewUrl = `/api/ai-landing/generated/${result.jobId}/index.html`;
  const uploaded = await uploadGeneratedLanding(result.jobId, result.outputDir);
  await saveGeneratedPage({ result, orderSnapshot: input, previewUrl, uploaded });
  return { result, previewUrl };
}
