import { ApiError } from "../middleware/validate.js";
import { prisma } from "../lib/prisma.js";
import type { PaymentGateway } from "../lib/payment/gateway.js";
import { getGateway } from "../lib/payment/registry.js";
import {
  getOrderByPaymentId,
  markPaid,
  markFailed,
  markRefunded,
} from "./order.service.js";

// 결제 확정 후 호출되는 훅(생성 트리거). **비동기 fire-and-forget** — 확정 응답/웹훅 200을
// 막지 않는다(웹훅 타임아웃 방지). 기본은 no-op이고, 서버 기동(index.ts)에서 실제 생성
// 트리거를 주입한다. 전이 승자일 때만 호출되어 이중 생성을 막는다.
export type PaidOrder = { id: string; orderSnapshot: unknown };
type OnPaidHook = (order: PaidOrder) => void;
let onPaid: OnPaidHook = () => {};
export function setOnPaidHook(hook: OnPaidHook): void {
  onPaid = hook;
}

// PortOne 결제완료 이벤트 타입.
function isPaidEvent(type: string): boolean {
  return type === "Transaction.Paid";
}

export type ConfirmResult = { orderId: string; status: "PAID" };

// 콜백·웹훅 공통 진입점. 서버 단건조회로 금액/상태를 교차검증하고 원자적으로 확정한다.
export async function confirmPayment(
  paymentId: string,
  gateway: PaymentGateway | null = getGateway(),
): Promise<ConfirmResult> {
  if (!gateway) throw new ApiError(503, "PAYMENT_DISABLED", "결제가 비활성화되어 있어요");

  const order = await getOrderByPaymentId(paymentId);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "주문을 찾을 수 없어요");

  // 멱등: 이미 확정된 주문은 단건조회 없이 즉시 반환.
  if (order.status === "PAID") return { orderId: order.id, status: "PAID" };

  // 서버 사이드 검증 — PG가 PAID라 말해도 우리 DB 금액과 단건조회 금액이 같을 때만 확정.
  const pg = await gateway.getPayment(paymentId);
  const amountMatches = pg.amount === order.amount;
  const statusPaid = pg.status === "PAID";
  // customData의 orderId가 있으면 함께 대조(없으면 paymentId 매핑만으로 신뢰).
  const orderIdMatches = pg.orderId === null || pg.orderId === order.id;

  if (!statusPaid || !amountMatches || !orderIdMatches) {
    await markFailed(
      order.id,
      `검증 실패 pgStatus=${pg.status} pgAmount=${pg.amount} expected=${order.amount}`,
    );
    // 위변조/불일치 → 자동 취소 시도(실패는 무시, 상태는 이미 FAILED).
    try {
      await gateway.cancelPayment(paymentId, "결제 금액 검증 실패");
    } catch (err) {
      console.error("[payment] 자동 취소 실패:", err);
    }
    throw new ApiError(400, "PAYMENT_VERIFICATION_FAILED", "결제 검증에 실패했어요");
  }

  const { transitioned } = await markPaid(order.id, pg);
  if (transitioned) {
    // 전이 승자만 생성 비동기 트리거(확정 응답을 막지 않음).
    onPaid({ id: order.id, orderSnapshot: order.orderSnapshot });
  }
  return { orderId: order.id, status: "PAID" };
}

// 웹훅 — 서명검증 후 paymentId 추출 → confirmPayment 위임.
// verifyWebhook이 throw하면(서명 위조) 그대로 전파(라우트가 4xx).
export async function handleWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  gateway: PaymentGateway | null = getGateway(),
): Promise<void> {
  if (!gateway) throw new ApiError(503, "PAYMENT_DISABLED", "결제가 비활성화되어 있어요");
  const event = await gateway.verifyWebhook(rawBody, headers);
  if (event.paymentId && isPaidEvent(event.type)) {
    await confirmPayment(event.paymentId, gateway);
  }
}

// 전액 환불 — 소유자 확인 → PG 취소 → REFUNDED 전이. PG 취소가 실패하면 상태를 바꾸지 않는다.
export async function refundOrder(
  orderId: string,
  userId: string,
  reason: string,
  gateway: PaymentGateway | null = getGateway(),
): Promise<void> {
  if (!gateway) throw new ApiError(503, "PAYMENT_DISABLED", "결제가 비활성화되어 있어요");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  // 소유자가 아니어도 존재 여부를 숨기기 위해 404로 통일.
  if (!order || order.userId !== userId) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "주문을 찾을 수 없어요");
  }
  if (order.status !== "PAID") {
    throw new ApiError(409, "NOT_REFUNDABLE", "환불할 수 없는 상태예요");
  }

  // PG 취소 먼저 — 실패하면 throw되어 상태 전이 없음(상태 불일치 방지).
  await gateway.cancelPayment(order.paymentId, reason);
  await markRefunded(orderId);
}
