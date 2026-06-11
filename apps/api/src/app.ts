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
import { orderRouter } from "./routes/order.route.js";
import { paymentRouter } from "./routes/payment.route.js";
import { errorHandler } from "./middleware/error.js";
import { sessionMiddleware } from "./middleware/session.js";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  // 웹훅은 서명검증을 위해 원문(raw) Buffer가 필요 — json 파싱보다 먼저 등록한다.
  // (body-parser가 _body 플래그를 세워, 뒤의 express.json()은 이 경로를 건너뛴다)
  app.use("/api/payments/webhook", express.raw({ type: "*/*" }));
  app.use(express.json());
  app.use(cookieParser());
  // 세션 쿠키 → req.user 부착(전역). 보호는 각 라우트가 판단.
  app.use(sessionMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/showcases", showcasesRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/ai-landing", aiLandingRouter);

  app.use(errorHandler);
  return app;
}
