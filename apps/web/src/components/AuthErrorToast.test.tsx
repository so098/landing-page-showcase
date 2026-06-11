import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// next/navigation 훅을 가짜로 대체 — 쿼리스트링/라우터를 테스트가 제어한다.
const replaceMock = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => search,
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/",
}));

import AuthErrorToast from "./AuthErrorToast";

beforeEach(() => {
  replaceMock.mockClear();
  search = new URLSearchParams();
});

describe("AuthErrorToast", () => {
  it("error 쿼리가 없으면 아무것도 렌더하지 않는다", () => {
    render(<AuthErrorToast />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("error=csrf면 보안 검증 실패 문구를 토스트로 보여준다", () => {
    search = new URLSearchParams("error=csrf");
    render(<AuthErrorToast />);
    expect(screen.getByRole("status").textContent).toContain("보안 검증");
  });

  it("알 수 없는 error 코드도 일반 실패 문구로 표시한다", () => {
    search = new URLSearchParams("error=weird");
    render(<AuthErrorToast />);
    expect(screen.getByRole("status").textContent).toContain("로그인");
  });

  it("닫으면 URL에서 error 쿼리를 제거한다", () => {
    search = new URLSearchParams("error=oauth");
    render(<AuthErrorToast />);
    act(() => {
      screen.getByRole("button", { name: /닫기/ }).click();
    });
    expect(replaceMock).toHaveBeenCalledWith("/");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
