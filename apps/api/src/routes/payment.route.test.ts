import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import type { PaymentGateway, PgPayment } from "../lib/payment/gateway";
import { setGatewayForTest, resetGatewayForTest } from "../lib/payment/registry";
import { setOnPaidHook } from "../services/payment.service";

const app = createApp();

function fakeGateway(over: Partial<PgPayment> = {}): PaymentGateway {
  return {
    getPayment: async (paymentId): Promise<PgPayment> => ({
      status: "PAID",
      amount: 20000,
      paymentId,
      orderId: null,
      method: "card",
      paidAt: "2026-06-11T00:00:00.000Z",
      raw: {},
      ...over,
    }),
    cancelPayment: vi.fn(async () => {}),
    verifyWebhook: async () => ({ type: "Transaction.Paid", paymentId: "x" }),
  };
}

let cookie: string;

// 세션 쿠키를 직접 발급해 인증 상태를 만든다.
async function login(): Promise<void> {
  const user = await prisma.user.create({
    data: { provider: "google", providerId: `owner-${Date.now()}-${Math.random()}`, name: "사장님", email: null },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 86400000) },
  });
  cookie = `melstudio_session=${session.id}`;
}

beforeEach(async () => {
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  resetGatewayForTest();
  setGatewayForTest(fakeGateway());
  setOnPaidHook(() => {});
  await login();
});

afterAll(() => {
  resetGatewayForTest();
  setOnPaidHook(() => {});
});

// 주문 생성 헬퍼(인증 포함). 기본 2페이지 = 20,000.
async function createOrderViaApi(pageCount = 2) {
  return request(app)
    .post("/api/orders")
    .set("Cookie", cookie)
    .send({
      mode: "ai",
      orderType: "new",
      pageCount,
      orderName: "달콤 베이커리 랜딩페이지",
      orderSnapshot: { businessName: "달콤" },
    });
}

describe("POST /api/orders", () => {
  it("비로그인이면 401", async () => {
    const res = await request(app).post("/api/orders").send({
      mode: "ai",
      orderType: "new",
      pageCount: 1,
      orderName: "x",
      orderSnapshot: {},
    });
    expect(res.status).toBe(401);
  });

  it("로그인 시 서버 계산 금액으로 PENDING 주문을 만든다", async () => {
    const res = await createOrderViaApi(2);
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(20000); // 기본 10,000 + 추가 1장
    expect(res.body.paymentId).toMatch(/^pay_/);
  });

  it("클라가 금액을 보내도 무시하고 서버가 재계산한다(위변조 방어)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({
        mode: "ai",
        orderType: "new",
        pageCount: 1,
        orderName: "x",
        orderSnapshot: {},
        amount: 1, // 무시돼야 함
      });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(10000);
  });
});

describe("POST /api/payments/:paymentId/confirm", () => {
  it("금액 일치 시 PAID로 확정한다", async () => {
    const order = await createOrderViaApi(2);
    setGatewayForTest(fakeGateway({ amount: 20000 }));
    const res = await request(app).post(`/api/payments/${order.body.paymentId}/confirm`).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PAID");
  });

  it("위변조(금액 불일치) 시 400", async () => {
    const order = await createOrderViaApi(2);
    setGatewayForTest(fakeGateway({ amount: 1 }));
    const res = await request(app).post(`/api/payments/${order.body.paymentId}/confirm`).send();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PAYMENT_VERIFICATION_FAILED");
  });
});

describe("POST /api/payments/webhook", () => {
  it("Paid 이벤트면 확정하고 200", async () => {
    const order = await createOrderViaApi(2);
    const gw = fakeGateway({ amount: 20000 });
    gw.verifyWebhook = async () => ({
      type: "Transaction.Paid",
      paymentId: order.body.paymentId,
    });
    setGatewayForTest(gw);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ any: "thing" }));
    expect(res.status).toBe(200);

    const row = await prisma.order.findUnique({ where: { id: order.body.orderId } });
    expect(row?.status).toBe("PAID");
  });

  it("서명 위조면 400", async () => {
    const gw = fakeGateway();
    gw.verifyWebhook = async () => {
      throw new Error("위조");
    };
    setGatewayForTest(gw);
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({}));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/orders/mine & 환불", () => {
  it("내 주문 목록을 반환한다", async () => {
    await createOrderViaApi(1);
    const res = await request(app).get("/api/orders/mine").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0]).not.toHaveProperty("paymentId");
  });

  it("PAID 주문을 전액 환불하면 REFUNDED가 된다", async () => {
    const order = await createOrderViaApi(2);
    setGatewayForTest(fakeGateway({ amount: 20000 }));
    await request(app).post(`/api/payments/${order.body.paymentId}/confirm`).send();

    const res = await request(app)
      .post(`/api/orders/${order.body.orderId}/refund`)
      .set("Cookie", cookie)
      .send({ reason: "단순 변심" });
    expect(res.status).toBe(200);
    const row = await prisma.order.findUnique({ where: { id: order.body.orderId } });
    expect(row?.status).toBe("REFUNDED");
  });

  it("남의 주문 환불은 404", async () => {
    const order = await createOrderViaApi(2);
    // 다른 유저로 로그인 교체
    await login();
    const res = await request(app)
      .post(`/api/orders/${order.body.orderId}/refund`)
      .set("Cookie", cookie)
      .send({ reason: "x" });
    expect(res.status).toBe(404);
  });
});
