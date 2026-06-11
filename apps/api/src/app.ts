import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { categoriesRouter } from "./routes/categories.route.js";
import { showcasesRouter } from "./routes/showcases.route.js";
import { reviewsRouter } from "./routes/reviews.route.js";
import { chatRouter } from "./routes/chat.route.js";
import { aiLandingRouter } from "./routes/ai-landing.route.js";
import { authRouter } from "./routes/auth.route.js";
import { errorHandler } from "./middleware/error.js";
import { sessionMiddleware } from "./middleware/session.js";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  // 세션 쿠키 → req.user 부착(전역). 보호는 각 라우트가 판단.
  app.use(sessionMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/showcases", showcasesRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/ai-landing", aiLandingRouter);

  app.use(errorHandler);
  return app;
}
