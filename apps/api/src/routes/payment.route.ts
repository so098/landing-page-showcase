import { Router } from "express";
import { isPaymentEnabled } from "../lib/payment/registry.js";
import { confirmPayment, handleWebhook } from "../services/payment.service.js";

export const paymentRouter = Router();

// 결제 활성 여부 — web 결제 버튼 활성 판단용.
paymentRouter.get("/enabled", (_req, res) => {
  res.json({ enabled: isPaymentEnabled() });
});

// 브라우저 결제완료 콜백 — 서버 검증 후 확정. 비로그인도 호출 가능(paymentId가 신뢰 경계).
paymentRouter.post("/:paymentId/confirm", async (req, res, next) => {
  try {
    const result = await confirmPayment(req.params.paymentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PG 웹훅 — express.raw로 받은 원문 Buffer를 서명검증에 그대로 넘긴다(JSON 파싱 시 서명 깨짐).
// 검증 실패는 4xx, 처리 실패도 4xx(PG가 재전송하도록). 성공/무관 이벤트는 200.
paymentRouter.post("/webhook", async (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body ?? "");
    await handleWebhook(raw, req.headers);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[payment] 웹훅 처리 실패:", err);
    res.status(400).json({ ok: false });
  }
});
