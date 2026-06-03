import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewModal from "./ReviewModal";
import type { ReviewFormState } from "@/app/actions/reviews";

// 항상 성공하는 가짜 액션 — Server Action 네트워크 호출을 대체한다
const okAction = async (): Promise<ReviewFormState> => ({ ok: true });

describe("ReviewModal", () => {
  it("open=false면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <ReviewModal
        open={false}
        pageName="달콤 베이커리 랜딩페이지"
        authorName="사장님"
        onClose={() => {}}
        onSubmitted={() => {}}
        action={okAction}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("open=true면 대상 페이지명을 담은 다이얼로그를 연다", () => {
    render(
      <ReviewModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        authorName="사장님"
        onClose={() => {}}
        onSubmitted={() => {}}
        action={okAction}
      />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/달콤 베이커리 랜딩페이지/)).toBeTruthy();
  });

  it("로그인 사용자 이름을 이름칸에 미리 채운다", () => {
    render(
      <ReviewModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        authorName="김민수"
        onClose={() => {}}
        onSubmitted={() => {}}
        action={okAction}
      />,
    );
    expect((screen.getByLabelText(/이름/) as HTMLInputElement).value).toBe("김민수");
  });

  it("닫기 버튼을 누르면 onClose를 호출한다", async () => {
    const onClose = vi.fn();
    render(
      <ReviewModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        authorName="사장님"
        onClose={onClose}
        onSubmitted={() => {}}
        action={okAction}
      />,
    );
    await userEvent.click(screen.getAllByRole("button", { name: /닫기/ })[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("제출이 성공하면 onSubmitted를 호출한다 (모달 닫기 + 토스트용)", async () => {
    const onSubmitted = vi.fn();
    render(
      <ReviewModal
        open
        pageName="달콤 베이커리 랜딩페이지"
        authorName="김민수"
        onClose={() => {}}
        onSubmitted={onSubmitted}
        action={okAction}
      />,
    );
    await userEvent.clear(screen.getByLabelText(/내용/));
    await userEvent.type(screen.getByLabelText(/내용/), "정말 만족스러운 결과물이었어요.");
    await userEvent.click(screen.getByRole("button", { name: /등록/ }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  });
});
