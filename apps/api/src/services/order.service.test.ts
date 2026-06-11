import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../lib/prisma";
import type { PgPayment } from "../lib/payment/gateway";
import {
  calcAmount,
  createOrder,
  getOrdersForUser,
  markPaid,
  markRefunded,
} from "./order.service";

let userId: string;

beforeEach(async () => {
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  const user = await prisma.user.create({
    data: { provider: "google", providerId: "u-1", name: "사장님", email: null },
  });
  userId = user.id;
});

function pgFor(amount: number, paymentId = "pay-x"): PgPayment {
  return {
    status: "PAID",
    amount,
    paymentId,
    orderId: null,
    method: "card",
    paidAt: "2026-06-11T00:00:00.000Z",
    raw: { ok: true },
  };
}

describe("calcAmount", () => {
  it("신규 1페이지 = 기본가 10,000", () => {
    expect(calcAmount({ mode: "ai", orderType: "new", pageCount: 1 })).toBe(10000);
  });
  it("신규 3페이지 = 기본 + 추가 2장 = 30,000", () => {
    expect(calcAmount({ mode: "ai", orderType: "new", pageCount: 3 })).toBe(30000);
  });
  it("추가 제작 = 정액 50,000 (페이지 수 무관)", () => {
    expect(calcAmount({ mode: "ai", orderType: "additional", pageCount: 5 })).toBe(50000);
  });
  it("human 모드는 온라인 결제 대상이 아니므로 throw", () => {
    expect(() => calcAmount({ mode: "human", orderType: "new", pageCount: 1 })).toThrow();
  });
});

describe("createOrder", () => {
  it("PENDING 주문을 서버 계산 금액으로 만들고 고유 paymentId를 발급한다", async () => {
    const created = await createOrder({
      userId,
      pricing: { mode: "ai", orderType: "new", pageCount: 2 },
      orderName: "달콤 베이커리 랜딩페이지",
      orderSnapshot: { businessName: "달콤" },
    });
    expect(created.amount).toBe(20000); // 기본 10,000 + 추가 1장 10,000
    expect(created.paymentId).toMatch(/^pay_/);
    const row = await prisma.order.findUnique({ where: { id: created.orderId } });
    expect(row?.status).toBe("PENDING");
    expect(row?.amount).toBe(20000);
  });
});

describe("markPaid (원자적 멱등)", () => {
  it("첫 호출은 전이 승자(PAID + Payment 생성), 둘째 호출은 멱등 no-op", async () => {
    const created = await createOrder({
      userId,
      pricing: { mode: "ai", orderType: "new", pageCount: 1 },
      orderName: "주문",
      orderSnapshot: {},
    });

    const first = await markPaid(created.orderId, pgFor(10000));
    expect(first.transitioned).toBe(true);

    const second = await markPaid(created.orderId, pgFor(10000));
    expect(second.transitioned).toBe(false); // 이미 PAID

    const order = await prisma.order.findUnique({ where: { id: created.orderId } });
    expect(order?.status).toBe("PAID");
    expect(order?.paidAt).not.toBeNull();
    // Payment는 정확히 1건만(이중 기록 없음)
    expect(await prisma.payment.count({ where: { orderId: created.orderId } })).toBe(1);
  });
});

describe("getOrdersForUser", () => {
  it("유저 주문을 요약으로 반환하며 민감정보(paymentId)는 비노출", async () => {
    await createOrder({
      userId,
      pricing: { mode: "ai", orderType: "new", pageCount: 1 },
      orderName: "주문A",
      orderSnapshot: {},
    });
    const list = await getOrdersForUser(userId);
    expect(list.length).toBe(1);
    expect(list[0].orderName).toBe("주문A");
    expect(list[0].status).toBe("PENDING");
    expect(list[0]).not.toHaveProperty("paymentId");
    expect(list[0]).not.toHaveProperty("orderSnapshot");
  });
});

describe("markRefunded", () => {
  it("PAID 주문만 REFUNDED로 전이하고 Payment를 CANCELLED로", async () => {
    const created = await createOrder({
      userId,
      pricing: { mode: "ai", orderType: "new", pageCount: 1 },
      orderName: "주문",
      orderSnapshot: {},
    });
    await markPaid(created.orderId, pgFor(10000));

    const res = await markRefunded(created.orderId);
    expect(res.refunded).toBe(true);

    const order = await prisma.order.findUnique({ where: { id: created.orderId } });
    const payment = await prisma.payment.findUnique({ where: { orderId: created.orderId } });
    expect(order?.status).toBe("REFUNDED");
    expect(payment?.status).toBe("CANCELLED");

    // 이미 환불된 건 재환불 no-op
    const again = await markRefunded(created.orderId);
    expect(again.refunded).toBe(false);
  });
});
