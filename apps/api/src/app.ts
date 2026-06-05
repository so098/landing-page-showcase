import express, { type Express } from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { categoriesRouter } from "./routes/categories.route.js";
import { showcasesRouter } from "./routes/showcases.route.js";
import { reviewsRouter } from "./routes/reviews.route.js";
import { chatRouter } from "./routes/chat.route.js";
import { aiLandingRouter } from "./routes/ai-landing.route.js";
import { errorHandler } from "./middleware/error.js";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/categories", categoriesRouter);
  app.use("/api/showcases", showcasesRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/ai-landing", aiLandingRouter);

  app.use(errorHandler);
  return app;
}
