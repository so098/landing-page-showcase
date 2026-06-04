import { Router } from "express";
import { z } from "zod";
import { ReviewCreateSchema } from "@melstudio/shared";
import { validateQuery, validateBody } from "../middleware/validate.js";
import { listReviews, createReview } from "../services/review.service.js";

export const reviewsRouter = Router();

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(6),
  page: z.coerce.number().min(1).default(1),
});

reviewsRouter.get("/", validateQuery(QuerySchema), async (req, res, next) => {
  try {
    const { limit, page } = (
      req as unknown as { valid: { query: z.infer<typeof QuerySchema> } }
    ).valid.query;
    res.json(await listReviews({ limit, page }));
  } catch (err) {
    next(err);
  }
});

reviewsRouter.post("/", validateBody(ReviewCreateSchema), async (req, res, next) => {
  try {
    const body = (
      req as unknown as { valid: { body: z.infer<typeof ReviewCreateSchema> } }
    ).valid.body;
    res.status(201).json(await createReview(body));
  } catch (err) {
    next(err);
  }
});
