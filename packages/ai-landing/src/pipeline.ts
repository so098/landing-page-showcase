import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { callClaudeForLanding, parseGeneratedFiles, type ClaudeConfig } from "./anthropic.js";
import { buildLandingSystemPrompt, buildLandingUserPrompt, buildRepairPrompt } from "./prompts.js";
import { runQualityChecks, summarizeQuality } from "./quality.js";
import { buildStubLanding } from "./stub.js";
import { LandingGenerationRequestSchema, type GeneratedLandingFiles, type LandingGenerationRequest, type LandingGenerationResult } from "./types.js";

export type PipelineConfig = ClaudeConfig & {
  outputRoot?: string;
};

export async function generateLanding(rawInput: unknown, config: PipelineConfig = {}): Promise<LandingGenerationResult> {
  const input = LandingGenerationRequestSchema.parse(rawInput);
  const jobId = crypto.randomUUID();
  const outputRoot = config.outputRoot ?? path.resolve(process.cwd(), "generated", "ai-landings");
  const outputDir = path.join(outputRoot, jobId);
  await fs.mkdir(outputDir, { recursive: true });

  const system = buildLandingSystemPrompt();
  const user = buildLandingUserPrompt(input);
  const notes: string[] = [];
  let modelUsed = input.dryRun || !config.apiKey ? "dry-run-stub" : (config.model ?? "claude-3-5-sonnet-latest");
  let files: GeneratedLandingFiles;
  let rawClaudeJson = "";

  if (input.dryRun || !config.apiKey) {
    files = buildStubLanding(input);
    notes.push(config.apiKey ? "dryRun=true라 Claude API를 호출하지 않았습니다." : "Claude API key가 없어 stub 생성으로 파이프라인만 검증했습니다.");
  } else {
    const response = await callClaudeForLanding({ system, user, config });
    modelUsed = response.model;
    rawClaudeJson = response.text;
    files = parseGeneratedFiles(response.text);
  }

  await writeLandingFiles(outputDir, files);
  let quality = await runQualityChecks({ indexHtml: path.join(outputDir, "index.html"), cwd: outputDir, runFoldCheck: input.runFoldCheck });

  let attempts = 0;
  while (!quality.every((q) => q.ok) && attempts < input.repairAttempts && config.apiKey && !input.dryRun) {
    attempts += 1;
    notes.push(`quality gate failed; running Claude repair attempt ${attempts}/${input.repairAttempts}`);
    const repairPrompt = buildRepairPrompt({
      input,
      qualityOutput: summarizeQuality(quality),
      previous: rawClaudeJson || JSON.stringify(files),
    });
    const repaired = await callClaudeForLanding({ system, user: repairPrompt, config });
    modelUsed = repaired.model;
    rawClaudeJson = repaired.text;
    files = parseGeneratedFiles(repaired.text);
    await writeLandingFiles(outputDir, files);
    quality = await runQualityChecks({ indexHtml: path.join(outputDir, "index.html"), cwd: outputDir, runFoldCheck: input.runFoldCheck });
  }

  await fs.writeFile(path.join(outputDir, "request.json"), JSON.stringify(input, null, 2), "utf8");
  await fs.writeFile(path.join(outputDir, "prompt-preview.txt"), `${system}\n\n--- USER ---\n${user}`, "utf8");
  await fs.writeFile(path.join(outputDir, "quality.json"), JSON.stringify(quality, null, 2), "utf8");

  const allOk = quality.every((q) => q.ok);
  return {
    jobId,
    status: input.dryRun || !config.apiKey ? "dry_run" : allOk ? "generated" : "failed_quality_gate",
    outputDir,
    files: {
      indexHtml: path.join(outputDir, "index.html"),
      stylesCss: path.join(outputDir, "styles.css"),
      scriptJs: path.join(outputDir, "script.js"),
    },
    promptPreview: `${system.slice(0, 2500)}\n\n--- USER ---\n${user.slice(0, 2500)}`,
    modelUsed,
    quality,
    notes: files.notes ? [...notes, files.notes] : notes,
  };
}

async function writeLandingFiles(outputDir: string, files: GeneratedLandingFiles): Promise<void> {
  await Promise.all([
    fs.writeFile(path.join(outputDir, "index.html"), files.html, "utf8"),
    fs.writeFile(path.join(outputDir, "styles.css"), files.css, "utf8"),
    fs.writeFile(path.join(outputDir, "script.js"), files.js ?? "", "utf8"),
  ]);

  // Dry-run stub용 로컬 이미지. 실제 서비스에서는 S3/RDS에서 받은 imageAssets URL을 사용한다.
  if (files.html.includes("./hero.jpg") || files.css.includes("./hero.jpg")) {
    const tinyJpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z",
      "base64",
    );
    await fs.writeFile(path.join(outputDir, "hero.jpg"), tinyJpeg);
  }
}
