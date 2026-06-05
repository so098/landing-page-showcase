import { z } from "zod";

export const LandingGenerationRequestSchema = z.object({
  industry: z.string().min(1).describe("업종/카테고리, 예: 디저트샵, 피부과, 공유오피스"),
  goal: z.string().min(1).default("상담/주문 전환"),
  brandName: z.string().min(1).default("브랜드명"),
  templateSlug: z.string().optional(),
  tone: z.string().optional().describe("premium, warm, trust, energetic, clean_tech 등"),
  targetAudience: z.string().optional(),
  cta: z.string().optional().default("상담 문의하기"),
  imageAssets: z.array(z.object({
    id: z.string().optional(),
    url: z.string().optional(),
    s3Key: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tone: z.string().optional(),
    category: z.string().optional(),
  })).default([]),
  dryRun: z.boolean().default(false),
  runFoldCheck: z.boolean().default(false),
  repairAttempts: z.number().int().min(0).max(3).default(1),
});

export type LandingGenerationRequest = z.infer<typeof LandingGenerationRequestSchema>;

export type GeneratedLandingFiles = {
  html: string;
  css: string;
  js: string;
  notes?: string;
};

export type QualityCheckResult = {
  name: "score_landing" | "check_fold";
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

export type LandingGenerationResult = {
  jobId: string;
  status: "generated" | "dry_run" | "failed_quality_gate";
  outputDir: string;
  files: {
    indexHtml: string;
    stylesCss: string;
    scriptJs: string;
  };
  promptPreview: string;
  modelUsed: string;
  quality: QualityCheckResult[];
  notes: string[];
};
