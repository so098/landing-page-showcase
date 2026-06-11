import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "@melstudio/shared";

// submitReview Server Action을 가짜로 대체 — jsdom에서 실제 네트워크/캐시 무효화를 피한다.
// 기본은 성공 응답. 개별 테스트에서 mockImplementation으로 바꿀 수 있다.
const submitReviewMock = vi.fn(async () => ({ ok: true }));
vi.mock("@/app/actions/reviews", () => ({
  submitReview: (...args: unknown[]) => submitReviewMock(...(args as [])),
}));

// 인증 스토어를 가짜로 대체 — getUser()가 로그인 유저를 반환하도록 한다.
// (실제 /me fetch는 auth.test.ts에서 검증)
const mockUser: AuthUser = {
  id: "u1",
  name: "김민수",
  email: "kim@example.com",
  avatarUrl: null,
  provider: "google",
};
vi.mock("@/lib/auth", () => ({
  getUser: () => mockUser,
  subscribe: () => () => {},
  startLogin: vi.fn(),
  getEnabledProviders: async () => ["google", "kakao"],
}));

// 주문 목록 API를 가짜로 대체 — 완료(step 4) 1건 + 진행 중(step 2) 1건.
import type { OrderSummary } from "@melstudio/shared";
const MOCK_ORDERS: OrderSummary[] = [
  {
    id: "o-done",
    orderName: "달콤 베이커리 랜딩페이지",
    amount: 10000,
    status: "PAID",
    paidAt: "2026-05-12T00:00:00.000Z",
    step: 4, // 오픈 완료 → 리뷰 작성 노출
    generatedJobId: "job-1",
    createdAt: "2026-05-12T00:00:00.000Z",
  },
  {
    id: "o-progress",
    orderName: "온유 한방카페 랜딩페이지",
    amount: 20000,
    status: "PAID",
    paidAt: "2026-05-30T00:00:00.000Z",
    step: 2, // 진행 중 → 리뷰 버튼 없음
    generatedJobId: "job-2",
    createdAt: "2026-05-30T00:00:00.000Z",
  },
];
vi.mock("@/lib/api", () => ({
  fetchMyOrders: async () => MOCK_ORDERS,
}));

import MyPage from "./page";

describe("MyPage 리뷰 작성", () => {
  beforeEach(() => {
    submitReviewMock.mockClear();
    submitReviewMock.mockImplementation(async () => ({ ok: true }));
  });

  it("완료된 주문 카드에만 리뷰 작성 버튼을 노출한다", async () => {
    render(<MyPage />);
    // 주문 로드 대기 — 완료 주문 카드가 뜰 때까지
    await screen.findByText(/달콤 베이커리 랜딩페이지/);
    // step=4(오픈 완료)는 1건뿐 → 리뷰 작성 버튼 1개
    const buttons = screen.getAllByRole("button", { name: /리뷰 작성/ });
    expect(buttons).toHaveLength(1);
  });

  it("리뷰 작성 버튼을 누르면 모달이 열린다", async () => {
    render(<MyPage />);
    await userEvent.click(await screen.findByRole("button", { name: /리뷰 작성/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("모달에서 제출하면 모달이 닫히고 감사 토스트가 뜬다", async () => {
    render(<MyPage />);
    await userEvent.click(await screen.findByRole("button", { name: /리뷰 작성/ }));

    const dialog = screen.getByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText(/내용/),
      "정말 만족스러운 결과물이었어요.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: /등록/ }));

    // 모달이 닫히고
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // 감사 토스트가 보인다
    expect(await screen.findByText(/리뷰를 작성해주셔서 감사합니다/)).toBeTruthy();
    // 실제 액션이 호출됐다
    expect(submitReviewMock).toHaveBeenCalledTimes(1);
  });
});
