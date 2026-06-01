import { Router } from "express";
import { listCategories } from "../services/showcase.service.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listCategories());
  } catch (err) {
    next(err);
  }
});
