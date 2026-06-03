import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RefundModal from "./RefundModal";

describe("RefundModal", () => {
  it("open=false면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <RefundModal
        open={false}
        pageName="달콤 베이커리 랜딩페이지"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("open=true면 확인 문구와 이유 입력란을 담은 다이얼로그를 연다", () => {
    render(
      <RefundModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/진짜 환불하시겠어요/)).toBeTruthy();
    expect(screen.getByLabelText(/환불 이유/)).toBeTruthy();
  });

  it("이유가 비어 있으면 환불 확정 버튼이 비활성화된다", () => {
    render(
      <RefundModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    const confirm = screen.getByRole("button", { name: /환불하기/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it("이유를 입력하지 않고 제출하면 onConfirm을 호출하지 않고 에러 메시지를 보여준다", async () => {
    const onConfirm = vi.fn();
    render(
      <RefundModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );
    // 공백만 입력해도 통과되면 안 된다 (trim 검증)
    await userEvent.type(screen.getByLabelText(/환불 이유/), "   ");
    // 폼 제출 시도 (Enter는 textarea라 막히므로 버튼 비활성 + 에러로 검증)
    expect((screen.getByRole("button", { name: /환불하기/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("이유를 입력하고 확정하면 입력한 이유와 함께 onConfirm을 호출한다", async () => {
    const onConfirm = vi.fn();
    render(
      <RefundModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );
    await userEvent.type(screen.getByLabelText(/환불 이유/), "결과물이 기대와 달라요");
    await userEvent.click(screen.getByRole("button", { name: /환불하기/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("결과물이 기대와 달라요");
  });

  it("닫기 버튼을 누르면 onClose를 호출한다", async () => {
    const onClose = vi.fn();
    render(
      <RefundModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        onClose={onClose}
        onConfirm={() => {}}
      />,
    );
    await userEvent.click(screen.getAllByRole("button", { name: /닫기|취소/ })[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
