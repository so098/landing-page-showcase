import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteFooter from "./SiteFooter";

describe("SiteFooter", () => {
  it("contentinfo 랜드마크로 렌더된다 (모든 페이지 공통 푸터)", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("브랜드명과 저작권 문구를 표시한다", () => {
    render(<SiteFooter />);
    expect(screen.getByText("랜딩,픽")).toBeTruthy();
    expect(screen.getByText(/© 2026 멜스튜디오/)).toBeTruthy();
  });

  it("주요 페이지로 가는 내비 링크를 제공한다", () => {
    render(<SiteFooter />);
    const expected: Record<string, string> = {
      쇼케이스: "/showcase",
      "이용 안내": "/guide",
      주문하기: "/order",
      내정보: "/mypage",
    };
    for (const [label, href] of Object.entries(expected)) {
      const link = screen.getByRole("link", { name: label });
      expect(link.getAttribute("href")).toBe(href);
    }
  });
});
