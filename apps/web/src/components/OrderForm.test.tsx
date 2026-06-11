import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "@melstudio/shared";

// 라우터/미리보기/채팅은 결제 흐름과 무관 → 가볍게 대체.
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./PagePreview", () => ({ default: () => null }));
vi.mock("@/lib/chat", () => ({ openChat: vi.fn() }));

// 결제/주문/생성/인증 의존성 목.
const fetchPaymentEnabled = vi.fn(async () => true);
const createOrder = vi.fn(async () => ({
  orderId: "o1",
  paymentId: "pay_1",
  amount: 20000,
  orderName: "달콤 베이커리 랜딩페이지",
}));
const generateAiLandingFromOrder = vi.fn(async () => ({
  jobId: "job-1",
  status: "generated" as const,
  previewUrl: "/p",
  modelUsed: "m",
  quality: [],
  notes: [],
}));
vi.mock("@/lib/api", () => ({
  fetchPaymentEnabled: () => fetchPaymentEnabled(),
  createOrder: (...a: unknown[]) => createOrder(...(a as [])),
  generateAiLandingFromOrder: (...a: unknown[]) => generateAiLandingFromOrder(...(a as [])),
}));

const startPayment = vi.fn(async () => ({ ok: true }) as { ok: true });
vi.mock("@/lib/payment", () => ({ startPayment: (...a: unknown[]) => startPayment(...(a as [])) }));

const user: AuthUser = {
  id: "u1", name: "사장님", email: null, avatarUrl: null, provider: "google",
};
const getUser = vi.fn<() => AuthUser | null>(() => user);
const startLogin = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUser: () => getUser(),
  startLogin: (...a: unknown[]) => startLogin(...(a as [])),
}));

import OrderForm from "./OrderForm";

beforeEach(() => {
  sessionStorage.clear();
  push.mockClear();
  createOrder.mockClear();
  startPayment.mockClear();
  generateAiLandingFromOrder.mockClear();
  startLogin.mockClear();
  fetchPaymentEnabled.mockResolvedValue(true);
  getUser.mockReturnValue(user);
});

describe("OrderForm 결제 흐름", () => {
  it("결제 활성 + 로그인 시: 주문 생성 → 결제 → 생성 → 결과로 이동", async () => {
    render(<OrderForm showcase={null} categoryLabel="" mode="ai" />);
    await userEvent.click(screen.getByRole("button", { name: "생성하기" }));

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "ai", orderType: "new", pageCount: 2 }),
    );
    await waitFor(() => expect(startPayment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(generateAiLandingFromOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/order/result"));
  });

  it("결제 활성 + 비로그인 시: 결제·생성 없이 로그인을 유도한다", async () => {
    getUser.mockReturnValue(null);
    render(<OrderForm showcase={null} categoryLabel="" mode="ai" />);
    await userEvent.click(screen.getByRole("button", { name: "생성하기" }));

    await waitFor(() => expect(startLogin).toHaveBeenCalled());
    expect(createOrder).not.toHaveBeenCalled();
    expect(generateAiLandingFromOrder).not.toHaveBeenCalled();
  });

  it("결제 취소 시: 생성하지 않고 안내 문구를 보여준다", async () => {
    startPayment.mockResolvedValue({ ok: false, reason: "사용자가 취소했어요" } as never);
    render(<OrderForm showcase={null} categoryLabel="" mode="ai" />);
    await userEvent.click(screen.getByRole("button", { name: "생성하기" }));

    await waitFor(() => expect(startPayment).toHaveBeenCalled());
    expect(generateAiLandingFromOrder).not.toHaveBeenCalled();
    expect(await screen.findByText(/결제가 완료되지 않았어요/)).toBeTruthy();
  });

  it("결제 비활성 시: 결제 없이 바로 생성한다(폴백)", async () => {
    fetchPaymentEnabled.mockResolvedValue(false);
    render(<OrderForm showcase={null} categoryLabel="" mode="ai" />);
    await userEvent.click(screen.getByRole("button", { name: "생성하기" }));

    await waitFor(() => expect(generateAiLandingFromOrder).toHaveBeenCalledTimes(1));
    expect(createOrder).not.toHaveBeenCalled();
    expect(startPayment).not.toHaveBeenCalled();
  });
});
