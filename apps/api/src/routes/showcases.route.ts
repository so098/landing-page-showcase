import { Router } from "express";
import { z } from "zod";
import { validateQuery } from "../middleware/validate.js";
import { listShowcases } from "../services/showcase.service.js";

export const showcasesRouter = Router();

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(12),
  cursor: z.string().optional(),
  category: z.string().optional(),
});

showcasesRouter.get("/", validateQuery(QuerySchema), async (req, res, next) => {
  try {
    const { limit, cursor, category } = (
      req as unknown as { valid: { query: z.infer<typeof QuerySchema> } }
    ).valid.query;
    res.json(await listShowcases({ limit, cursor, category }));
  } catch (err) {
    next(err);
  }
});
