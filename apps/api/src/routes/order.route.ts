import { Router } from "express";
import { OrderCreateSchema, RefundRequestSchema } from "@melstudio/shared";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { createOrder, getOrdersForUser } from "../services/order.service.js";
import { refundOrder } from "../services/payment.service.js";

export const orderRouter = Router();

// 주문 생성 — 로그인 필요. 금액은 서버가 계산(클라 금액 불신).
orderRouter.post("/", requireAuth, validateBody(OrderCreateSchema), async (req, res, next) => {
  try {
    const body = (
      req as unknown as { valid: { body: import("@melstudio/shared").OrderCreate } }
    ).valid.body;
    const created = await createOrder({
      userId: req.user!.id,
      pricing: { mode: body.mode, orderType: body.orderType, pageCount: body.pageCount },
      showcaseId: body.showcaseId,
      orderName: body.orderName,
      orderSnapshot: body.orderSnapshot,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// 마이페이지 — 내 주문/결제/진행단계 목록.
orderRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    res.json({ items: await getOrdersForUser(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

// 전액 환불 — 내 주문만.
orderRouter.post(
  "/:id/refund",
  requireAuth,
  validateBody(RefundRequestSchema),
  async (req, res, next) => {
    try {
      const { reason } = (
        req as unknown as { valid: { body: import("@melstudio/shared").RefundRequest } }
      ).valid.body;
      await refundOrder(req.params.id, req.user!.id, reason);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
