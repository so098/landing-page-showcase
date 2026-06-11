import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OrderCreated } from "@melstudio/shared";

// PortOne 브라우저 SDK를 가짜로 대체.
const requestPayment = vi.fn();
vi.mock("@portone/browser-sdk/v2", () => ({
  default: { requestPayment: (...a: unknown[]) => requestPayment(...a) },
}));

import { startPayment } from "./payment";

const order: OrderCreated = {
  orderId: "o1",
  paymentId: "pay_1",
  amount: 20000,
  orderName: "달콤 베이커리 랜딩페이지",
};

beforeEach(() => {
  requestPayment.mockReset();
  vi.unstubAllGlobals();
});

describe("startPayment", () => {
  it("결제창 성공 시 서버 confirm을 호출하고 ok:true를 반환한다", async () => {
    requestPayment.mockResolvedValue({ paymentId: "pay_1" }); // code 없음 = 성공
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await startPayment(order);
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/payments/pay_1/confirm"),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("결제창이 취소/실패(code 존재)면 confirm 없이 ok:false", async () => {
    requestPayment.mockResolvedValue({ code: "USER_CANCEL", message: "사용자가 취소했어요" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await startPayment(order);
    expect(result).toEqual({ ok: false, reason: "사용자가 취소했어요" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("서버 confirm이 실패하면 ok:false", async () => {
    requestPayment.mockResolvedValue({ paymentId: "pay_1" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false }) as Response));

    const result = await startPayment(order);
    expect(result.ok).toBe(false);
  });
});
