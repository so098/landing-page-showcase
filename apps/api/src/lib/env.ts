import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
});

export const env = EnvSchema.parse(process.env);
