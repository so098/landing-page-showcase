import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { prisma } from "../lib/prisma";
import type { PaymentGateway, PgPayment } from "../lib/payment/gateway";
import { createOrder } from "./order.service";
import {
  confirmPayment,
  handleWebhook,
  setOnPaidHook,
  type PaidOrder,
} from "./payment.service";

let userId: string;
const onPaid = vi.fn();

// 금액/상태/orderId를 자유롭게 바꿔 위변조 케이스를 만든다.
function fakeGateway(over: Partial<PgPayment> = {}): PaymentGateway {
  return {
    getPayment: async (paymentId): Promise<PgPayment> => ({
      status: "PAID",
      amount: 10000,
      paymentId,
      orderId: null,
      method: "card",
      paidAt: "2026-06-11T00:00:00.000Z",
      raw: { ok: true },
      ...over,
    }),
    cancelPayment: vi.fn(async () => {}),
    verifyWebhook: async () => ({ type: "Transaction.Paid", paymentId: "set-in-test" }),
  };
}

async function makePendingOrder(amount = 10000) {
  // pageCount 1 = 10,000. 다른 금액이 필요하면 추가 페이지로.
  const pageCount = amount / 10000;
  return createOrder({
    userId,
    pricing: { mode: "ai", orderType: "new", pageCount },
    orderName: "주문",
    orderSnapshot: { businessName: "달콤" },
  });
}

beforeEach(async () => {
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  const user = await prisma.user.create({
    data: { provider: "google", providerId: "u-1", name: "사장님", email: null },
  });
  userId = user.id;
  onPaid.mockClear();
  setOnPaidHook(onPaid as (o: PaidOrder) => void);
});

afterEach(() => {
  setOnPaidHook(() => {});
});

describe("confirmPayment", () => {
  it("금액이 일치하면 PAID로 확정하고 생성 훅을 1회 호출한다", async () => {
    const order = await makePendingOrder(10000);
    const res = await confirmPayment(order.paymentId, fakeGateway({ amount: 10000 }));
    expect(res.status).toBe("PAID");
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(onPaid).toHaveBeenCalledWith(
      expect.objectContaining({ id: order.orderId }),
    );
    const row = await prisma.order.findUnique({ where: { id: order.orderId } });
    expect(row?.status).toBe("PAID");
  });

  it("★위변조: PG 금액이 주문 금액과 다르면 거부·FAILED·자동취소한다", async () => {
    const order = await makePendingOrder(10000);
    const gw = fakeGateway({ amount: 999 }); // 위변조된 금액
    await expect(confirmPayment(order.paymentId, gw)).rejects.toMatchObject({
      code: "PAYMENT_VERIFICATION_FAILED",
    });
    const row = await prisma.order.findUnique({ where: { id: order.orderId } });
    expect(row?.status).toBe("FAILED");
    expect(gw.cancelPayment).toHaveBeenCalledWith(order.paymentId, expect.any(String));
    expect(onPaid).not.toHaveBeenCalled();
  });

  it("중복 confirm(이미 PAID)은 멱등 — 훅은 처음 1회만", async () => {
    const order = await makePendingOrder(10000);
    await confirmPayment(order.paymentId, fakeGateway());
    await confirmPayment(order.paymentId, fakeGateway());
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it("존재하지 않는 paymentId는 404", async () => {
    await expect(confirmPayment("nope", fakeGateway())).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("handleWebhook", () => {
  it("Paid 이벤트면 confirmPayment로 위임해 확정한다", async () => {
    const order = await makePendingOrder(10000);
    const gw = fakeGateway();
    gw.verifyWebhook = async () => ({ type: "Transaction.Paid", paymentId: order.paymentId });
    await handleWebhook("{}", {}, gw);
    const row = await prisma.order.findUnique({ where: { id: order.orderId } });
    expect(row?.status).toBe("PAID");
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it("서명 위조면 verifyWebhook이 throw하고 전파된다", async () => {
    const gw = fakeGateway();
    gw.verifyWebhook = async () => {
      throw new Error("위조된 서명");
    };
    await expect(handleWebhook("{}", {}, gw)).rejects.toThrow();
  });

  it("콜백과 웹훅이 둘 다 도착해도 확정은 1회(생성 훅 1회)", async () => {
    const order = await makePendingOrder(10000);
    const gw = fakeGateway();
    gw.verifyWebhook = async () => ({ type: "Transaction.Paid", paymentId: order.paymentId });
    // 콜백 먼저, 그다음 웹훅
    await confirmPayment(order.paymentId, gw);
    await handleWebhook("{}", {}, gw);
    expect(onPaid).toHaveBeenCalledTimes(1);
  });
});
