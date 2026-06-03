import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Toast from "./Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("메시지를 status 역할로 표시한다 (스크린리더 알림)", () => {
    render(<Toast message="리뷰를 작성해주셔서 감사합니다" onDismiss={() => {}} />);
    const toast = screen.getByRole("status");
    expect(toast.textContent).toContain("리뷰를 작성해주셔서 감사합니다");
  });

  it("지정한 시간이 지나면 onDismiss를 호출한다", () => {
    const onDismiss = vi.fn();
    render(<Toast message="안녕" duration={2000} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("닫기 버튼을 누르면 onDismiss를 호출한다", () => {
    const onDismiss = vi.fn();
    render(<Toast message="안녕" onDismiss={onDismiss} />);
    act(() => {
      screen.getByRole("button", { name: /닫기/ }).click();
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
