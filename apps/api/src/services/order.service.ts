import { Prisma } from "@prisma/client";
import {
  PRICE,
  type OrderPricingInput,
  type OrderSummary,
  type OrderStatus,
} from "@melstudio/shared";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type { PgPayment } from "../lib/payment/gateway.js";

// ── 금액 계산 (위변조 방어의 단일 소스) ──
// 클라가 보낸 금액은 절대 사용하지 않고, 항상 이 함수가 가격표(PRICE)로 재계산한다.
export function calcAmount(input: OrderPricingInput): number {
  if (input.mode === "human") {
    // 사람과 함께는 채팅 상담 — 온라인 결제 비범위. 결제 주문으로 들어오면 안 됨.
    throw new Error("human 주문은 온라인 결제 대상이 아닙니다");
  }
  if (input.orderType === "additional") return PRICE.AI_REVISION;
  // 신규: 기본가 + 추가 페이지 단가
  const additional = Math.max(0, input.pageCount - 1) * PRICE.ADDITIONAL_PAGE;
  return PRICE.BASE + additional;
}

type OrderRow = {
  id: string;
  orderName: string;
  amount: number;
  status: string;
  paidAt: Date | null;
  generatedJobId: string | null;
  createdAt: Date;
};

// 진행 단계 도출 — 결제/생성 상태에서 1~4 스텝을 계산.
// 호스팅·도메인·오픈(3·4)은 자동화 범위 밖이라 현재 데이터로는 최대 2(AI 생성 완료).
function deriveStep(status: string, generatedJobId: string | null): number {
  if (status === "PAID" && generatedJobId) return 2; // AI 생성 완료
  return 1; // 주문 접수
}

function toOrderSummary(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    orderName: row.orderName,
    amount: row.amount,
    status: row.status as OrderStatus,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    step: deriveStep(row.status, row.generatedJobId),
    generatedJobId: row.generatedJobId,
    createdAt: row.createdAt.toISOString(),
  };
}

// 주문 생성 — amount는 서버 계산, status PENDING, paymentId(고유) 발급.
export async function createOrder(args: {
  userId: string;
  pricing: OrderPricingInput;
  showcaseId?: string;
  orderName: string;
  orderSnapshot: unknown;
}): Promise<{ orderId: string; paymentId: string; amount: number; orderName: string }> {
  const amount = calcAmount(args.pricing);
  const paymentId = `pay_${randomUUID()}`;
  const order = await prisma.order.create({
    data: {
      userId: args.userId,
      showcaseId: args.showcaseId,
      orderSnapshot: (args.orderSnapshot ?? {}) as Prisma.InputJsonValue,
      orderName: args.orderName,
      amount,
      status: "PENDING",
      paymentId,
    },
  });
  return { orderId: order.id, paymentId, amount, orderName: order.orderName };
}

// paymentId로 주문 조회(콜백/웹훅 진입점에서 사용).
export async function getOrderByPaymentId(paymentId: string) {
  return prisma.order.findUnique({ where: { paymentId } });
}

// 마이페이지 — 유저의 주문/결제/진행단계 요약 목록(최신순).
export async function getOrdersForUser(userId: string): Promise<OrderSummary[]> {
  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrderSummary);
}

// 결제 확정 — 원자적 조건부 전이(PENDING→PAID). 동시(콜백+웹훅) 진입에서도 단 하나만 승자.
// transitioned=true면 이번 호출이 전이를 일으킨 승자(생성 트리거 대상), false면 이미 처리됨(멱등 no-op).
export async function markPaid(
  orderId: string,
  pg: PgPayment,
): Promise<{ transitioned: boolean }> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (updated.count === 1) {
      // 승자만 Payment를 기록한다(이중 기록 방지).
      await tx.payment.create({
        data: {
          orderId,
          pgPaymentId: pg.paymentId,
          method: pg.method,
          amount: pg.amount,
          status: "PAID",
          rawPayload: (pg.raw ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      });
    }
    return { transitioned: updated.count === 1 };
  });
}

// 검증 실패(위변조 등) → FAILED. PENDING일 때만 전이.
export async function markFailed(orderId: string, reason: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "FAILED" },
  });
  console.warn(`[payment] 주문 실패 처리 orderId=${orderId} reason=${reason}`);
}

// 전액 환불 — PAID일 때만 REFUNDED로 전이하고 Payment를 CANCELLED로.
export async function markRefunded(orderId: string): Promise<{ refunded: boolean }> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PAID" },
      data: { status: "REFUNDED" },
    });
    if (updated.count === 1) {
      await tx.payment.updateMany({
        where: { orderId },
        data: { status: "CANCELLED" },
      });
    }
    return { refunded: updated.count === 1 };
  });
}

// 결제 확정 후 생성된 GeneratedPage.jobId를 주문에 연결(비동기 생성 완료 시).
export async function linkGeneratedJob(orderId: string, jobId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { generatedJobId: jobId },
  });
}
