import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewForm from "./ReviewForm";
import type { ReviewFormState } from "@/app/actions/reviews";

describe("ReviewForm", () => {
  it("제출 시 액션이 받은 입력으로 호출된다", async () => {
    let received: { authorName: string; body: string } | null = null;
    const action = async (
      _prev: ReviewFormState,
      formData: FormData,
    ): Promise<ReviewFormState> => {
      received = {
        authorName: String(formData.get("authorName")),
        body: String(formData.get("body")),
      };
      return { ok: true };
    };

    render(<ReviewForm action={action} />);
    await userEvent.type(screen.getByLabelText(/이름/), "김민수");
    await userEvent.type(screen.getByLabelText(/내용/), "정말 만족스러운 결과물이었어요.");
    await userEvent.click(screen.getByRole("button", { name: /등록/ }));

    await waitFor(() => expect(received).not.toBeNull());
    expect(received).toEqual({
      authorName: "김민수",
      body: "정말 만족스러운 결과물이었어요.",
    });
  });

  it("필드 검증 에러를 표시한다", async () => {
    const action = async (): Promise<ReviewFormState> => ({
      fieldErrors: { authorName: "이름은 2자 이상이어야 해요" },
    });
    render(<ReviewForm action={action} />);
    await userEvent.type(screen.getByLabelText(/이름/), "김");
    await userEvent.type(screen.getByLabelText(/내용/), "열 글자가 넘는 충분한 내용입니다.");
    await userEvent.click(screen.getByRole("button", { name: /등록/ }));

    expect(await screen.findByText("이름은 2자 이상이어야 해요")).toBeTruthy();
  });

  it("제출 실패 시 안내 메시지를 표시한다", async () => {
    const action = async (): Promise<ReviewFormState> => ({
      error: "잠시 후 다시 시도해 주세요.",
    });
    render(<ReviewForm action={action} />);
    await userEvent.type(screen.getByLabelText(/이름/), "김민수");
    await userEvent.type(screen.getByLabelText(/내용/), "정말 만족스러운 결과물이었어요.");
    await userEvent.click(screen.getByRole("button", { name: /등록/ }));

    expect(await screen.findByText("잠시 후 다시 시도해 주세요.")).toBeTruthy();
  });

  it("성공 시 감사 메시지를 표시한다", async () => {
    const action = async (): Promise<ReviewFormState> => ({ ok: true });
    render(<ReviewForm action={action} />);
    await userEvent.type(screen.getByLabelText(/이름/), "김민수");
    await userEvent.type(screen.getByLabelText(/내용/), "정말 만족스러운 결과물이었어요.");
    await userEvent.click(screen.getByRole("button", { name: /등록/ }));

    expect(await screen.findByText(/소중한 후기/)).toBeTruthy();
  });

  // 허점 1: 검증 실패 시 입력값이 유지돼야 한다 (설계서 §4 "입력값 유지")
  it("검증 실패 시 입력값을 유지한다", async () => {
    // 액션이 에러와 함께 제출값을 그대로 에코해 돌려주는 상황을 모사
    const action = async (
      _prev: ReviewFormState,
      formData: FormData,
    ): Promise<ReviewFormState> => ({
      fieldErrors: { authorName: "이름은 2자 이상이어야 해요" },
      values: {
        authorName: String(formData.get("authorName")),
        body: String(formData.get("body")),
      },
    });
    render(<ReviewForm action={action} />);
    await userEvent.type(screen.getByLabelText(/이름/), "김");
    await userEvent.type(screen.getByLabelText(/내용/), "짧음");
    await userEvent.click(screen.getByRole("button", { name: /등록/ }));

    // 에러 표시 후에도 입력칸이 제출값으로 복원돼 있어야 한다
    expect(await screen.findByText("이름은 2자 이상이어야 해요")).toBeTruthy();
    expect((screen.getByLabelText(/이름/) as HTMLInputElement).value).toBe("김");
    expect((screen.getByLabelText(/내용/) as HTMLTextAreaElement).value).toBe("짧음");
  });

  // 허점 2: 빠른 연타 제출 시 액션이 한 번만 호출돼야 한다 (중복 저장 방지)
  it("연속 클릭해도 액션은 한 번만 호출된다", async () => {
    let callCount = 0;
    // 펜딩 상태가 즉시 리렌더되기 전에 두 번째 클릭이 들어오는 상황을 모사하기 위해
    // 액션이 잠깐 지연되도록 한다.
    const action = async (): Promise<ReviewFormState> => {
      callCount += 1;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true };
    };
    render(<ReviewForm action={action} />);
    await userEvent.type(screen.getByLabelText(/이름/), "김민수");
    await userEvent.type(screen.getByLabelText(/내용/), "정말 만족스러운 결과물이었어요.");

    const button = screen.getByRole("button", { name: /등록/ });
    // 리렌더 사이 없이 동기적으로 두 번 클릭 (연타 시뮬레이션)
    button.click();
    button.click();

    await waitFor(() => expect(callCount).toBeGreaterThan(0));
    // 잠시 더 기다려 두 번째 클릭이 액션을 트리거하지 않았는지 확인
    await new Promise((r) => setTimeout(r, 60));
    expect(callCount).toBe(1);
  });
});
