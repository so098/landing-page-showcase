import express, { type Express } from "express";
import cors from "cors";
import { env } from "./lib/env.js";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
