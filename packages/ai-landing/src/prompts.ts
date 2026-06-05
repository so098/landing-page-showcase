import fs from "node:fs";
import path from "node:path";
import { agentsDir, rulesDir } from "./paths.js";
import type { LandingGenerationRequest } from "./types.js";

function readOptional(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export function loadQualityRules(): string {
  const full = readOptional(path.join(rulesDir, "landing-quality-rules.md"));
  const mustStart = full.indexOf("## 필수 규칙 (MUST)");
  const gateStart = full.indexOf("## 품질 게이트");
  const excerpt = mustStart >= 0 && gateStart > mustStart ? full.slice(mustStart, gateStart) : full;
  return excerpt.slice(0, 3500);
}

export function loadVisualQaAgent(): string {
  return readOptional(path.join(agentsDir, "visual-qa.md"));
}

export function buildLandingSystemPrompt(): string {
  const rules = loadQualityRules();
  return [
    "너는 한국 소상공인/브랜드용 HTML 랜딩페이지를 제작하는 senior frontend + conversion designer다.",
    "출력은 반드시 JSON 하나만 반환한다. markdown fence를 쓰지 않는다.",
    "JSON shape: {\"html\": string, \"css\": string, \"js\": string, \"notes\": string}",
    "html은 완전한 index.html 문서여야 하며 styles.css와 script.js를 링크한다.",
    "서비스 MVP 테스트용이므로 과도하게 긴 코드를 만들지 않는다. 섹션은 hero, intro, offer/cards, contact 정도로 제한한다.",
    "CSS는 220줄 이하, HTML은 140줄 이하를 목표로 한다.",
    "첫 화면 hero는 실제 이미지 기반이어야 한다. 제공된 imageAssets URL이 있으면 반드시 우선 사용하고, 없으면 안정적인 공개 이미지 URL 하나를 사용한다.",
    "모바일 가독성, 한글 word-break: keep-all, 과한 CTA 금지, 인라인 form 금지를 지킨다.",
    "아래 품질 규칙을 최우선으로 따른다.",
    rules,
  ].filter(Boolean).join("\n\n");
}

export function buildLandingUserPrompt(input: LandingGenerationRequest): string {
  const assets = input.imageAssets.slice(0, 40).map((asset, idx) => ({
    n: idx + 1,
    url: asset.url,
    s3Key: asset.s3Key,
    tags: asset.tags,
    tone: asset.tone,
    category: asset.category,
  }));

  return JSON.stringify({
    task: "Create a production-ready static landing page.",
    constraints: {
      files: ["index.html", "styles.css", "script.js"],
      language: "ko-KR",
      responsive: true,
      noInlineForm: true,
      noHeroButtons: true,
      useProvidedImagesFirst: true,
      outputJsonOnly: true,
    },
    landing: {
      industry: input.industry,
      goal: input.goal,
      brandName: input.brandName,
      templateSlug: input.templateSlug,
      tone: input.tone,
      targetAudience: input.targetAudience,
      cta: input.cta,
    },
    imageAssets: assets,
  }, null, 2);
}

export function buildRepairPrompt(params: {
  previous: string;
  qualityOutput: string;
  input: LandingGenerationRequest;
}): string {
  return [
    "아래 랜딩페이지가 품질 검수에서 실패했다. 같은 JSON shape으로 수정본만 반환해.",
    "실패 원인을 고치되 브랜드/업종/전환 목표는 유지해.",
    "검수 결과:",
    params.qualityOutput,
    "원래 요청:",
    buildLandingUserPrompt(params.input),
    "이전 생성물 JSON:",
    params.previous,
  ].join("\n\n");
}
