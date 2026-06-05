import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  AI_LANDING_OUTPUT_DIR: z.string().optional(),
  ASSETS_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default("ap-northeast-2"),
});

export const env = EnvSchema.parse(process.env);
