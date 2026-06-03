import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// 외부 의존성 목 — 라우터/쇼케이스 조회/채팅/미리보기는 이 페이지의 환불 흐름과 무관하므로
// 가볍게 대체해 jsdom에서 동작하게 한다.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/queries", () => ({
  useShowcaseBySlug: () => ({ showcase: null }),
}));
vi.mock("@/lib/chat", () => ({
  openChat: vi.fn(),
}));
vi.mock("@/components/PagePreview", () => ({
  default: () => null,
}));
vi.mock("@/components/SiteHeader", () => ({
  default: () => null,
}));

import OrderResultPage from "./page";
import { saveOrder, getRefund } from "@/lib/orderStorage";

// 결과 페이지는 마크업이 무거워 키 입력당 기본 지연이 누적되면 느리다.
// 입력 지연을 없앤 user 인스턴스를 써서 테스트를 빠르게 유지한다.
const user = userEvent.setup({ delay: null });

const sampleOrder = {
  showcaseId: undefined,
  form: {
    businessName: "달콤 베이커리",
    phone: "010-0000-0000",
    email: "a@b.com",
    industry: "food",
    links: "",
    targetProfile: "",
    targetPain: "",
    targetMessage: "갓 구운 빵",
    targetHesitation: "",
    avoidFeel: "",
    referenceSites: "",
    preferredColors: "",
    copyText: "",
  },
  purpose: "홍보",
  selectedInfo: [],
  infoContents: {},
  pages: [],
  moods: [],
  hasBrandColors: null,
};

describe("OrderResultPage 환불", () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveOrder(sampleOrder);
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it("완성된 페이지 화면에 환불하기 버튼을 노출한다", async () => {
    render(<OrderResultPage />);
    // 액션 영역 버튼(환불하기)이 보일 때까지 대기 (loadOrder는 effect에서 실행)
    expect(await screen.findByRole("button", { name: /환불하기/ })).toBeTruthy();
  });

  it("환불하기 버튼을 누르면 확인 모달과 이유 입력란이 열린다", async () => {
    render(<OrderResultPage />);
    await user.click(await screen.findByRole("button", { name: /환불하기/ }));
    const dialog = screen.getByRole("dialog", { name: /환불/ });
    expect(within(dialog).getByText(/진짜 환불하시겠어요/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/환불 이유/)).toBeTruthy();
  });

  it("이유 없이는 환불 확정이 막히고, 이유를 적으면 환불 완료 토스트가 뜬다", async () => {
    render(<OrderResultPage />);
    await user.click(await screen.findByRole("button", { name: /환불하기/ }));
    const dialog = screen.getByRole("dialog", { name: /환불/ });

    // 이유 비어 있을 때 확정 버튼 비활성
    const confirm = within(dialog).getByRole("button", { name: /환불하기/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    await user.type(within(dialog).getByLabelText(/환불 이유/), "결과물이 기대와 달라요");
    await user.click(within(dialog).getByRole("button", { name: /환불하기/ }));

    // 모달이 닫히고 환불 완료 토스트가 뜬다
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /환불/ })).toBeNull());
    expect(await screen.findByText(/환불 요청이 접수되었어요/)).toBeTruthy();

    // 목 환불 기록이 사유와 함께 저장된다
    expect(getRefund()?.reason).toBe("결과물이 기대와 달라요");
  });

  it("환불 완료 후에는 환불하기 버튼 대신 환불 완료 상태를 보여준다", async () => {
    render(<OrderResultPage />);
    await user.click(await screen.findByRole("button", { name: /환불하기/ }));
    const dialog = screen.getByRole("dialog", { name: /환불/ });
    await user.type(within(dialog).getByLabelText(/환불 이유/), "단순 변심");
    await user.click(within(dialog).getByRole("button", { name: /환불하기/ }));

    // 환불 완료 후엔 다시 환불할 버튼이 사라진다 (재환불 방지)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /환불하기/ })).toBeNull(),
    );
    expect(screen.getByText(/환불이 접수되었어요/)).toBeTruthy();
  });
});
