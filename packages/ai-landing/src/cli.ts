import { generateLanding } from "./pipeline.js";

const dryRun = process.argv.includes("--dry-run");

const result = await generateLanding({
  industry: "디저트샵",
  goal: "디저트 주문 문의 전환",
  brandName: "멜로우 디저트",
  tone: "warm",
  targetAudience: "인스타그램에서 유입되는 20~30대 여성 고객",
  cta: "카카오톡 주문 문의",
  dryRun,
  runFoldCheck: false,
}, {
  apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY,
  model: process.env.CLAUDE_MODEL,
  outputRoot: process.env.AI_LANDING_OUTPUT_DIR,
});

console.log(JSON.stringify(result, null, 2));
