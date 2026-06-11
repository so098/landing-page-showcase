"use client";

import type { OrderCreated } from "@melstudio/shared";

// PortOne 브라우저 SDK 래퍼.
// 결제창 호출 → 성공 시 서버 confirm으로 검증·확정한다. 시크릿은 web에 없고, 공개 가능한
// storeId/channelKey만 NEXT_PUBLIC_으로 노출한다. 금액 확정 판단은 서버가 한다.
const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type PaymentOutcome = { ok: true } | { ok: false; reason: string };

// 결제창 → 성공 시 confirm. 취소/실패/검증실패는 ok:false + 사유.
export async function startPayment(order: OrderCreated): Promise<PaymentOutcome> {
  // 동적 import — SDK를 클라이언트 청크로 분리(SSR 번들 오염 방지).
  const PortOne = (await import("@portone/browser-sdk/v2")).default;

  const response = await PortOne.requestPayment({
    storeId: STORE_ID,
    channelKey: CHANNEL_KEY,
    paymentId: order.paymentId,
    orderName: order.orderName,
    totalAmount: order.amount,
    currency: "KRW",
    payMethod: "CARD",
    // 서버 교차검증용 — 우리 Order.id.
    customData: { orderId: order.orderId },
  });

  // 결제창이 취소/실패하면 code가 채워진다.
  if (!response || response.code != null) {
    return { ok: false, reason: response?.message ?? "결제가 취소되었어요" };
  }

  // 서버 검증·확정 — 금액/상태를 서버가 PG 단건조회로 대조.
  const res = await fetch(`${API_BASE}/api/payments/${order.paymentId}/confirm`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return { ok: false, reason: "결제 검증에 실패했어요" };
  return { ok: true };
}
