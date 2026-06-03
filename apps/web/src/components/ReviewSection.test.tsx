import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Review } from "@melstudio/shared";
import ReviewSection from "./ReviewSection";

const review = (id: string, authorName: string, body: string, createdAt: string): Review => ({
  id,
  authorName,
  body,
  createdAt,
});

describe("ReviewSection", () => {
  it("마스킹된 이름과 포맷된 날짜를 렌더한다", () => {
    render(
      <ReviewSection
        reviews={[review("1", "김*수", "디자인이 정말 마음에 들어요.", "2026-05-28T00:00:00.000Z")]}
      />,
    );
    expect(screen.getByText("디자인이 정말 마음에 들어요.")).toBeTruthy();
    expect(screen.getByText(/김\*수/)).toBeTruthy();
    expect(screen.getByText(/2026\.05\.28/)).toBeTruthy();
  });

  it("리뷰가 여러 개면 모두 렌더한다", () => {
    render(
      <ReviewSection
        reviews={[
          review("1", "김*수", "첫 번째 후기입니다.", "2026-05-28T00:00:00.000Z"),
          review("2", "이*영", "두 번째 후기입니다.", "2026-05-27T00:00:00.000Z"),
        ]}
      />,
    );
    expect(screen.getByText("첫 번째 후기입니다.")).toBeTruthy();
    expect(screen.getByText("두 번째 후기입니다.")).toBeTruthy();
  });

  it("리뷰가 없으면 아무것도 렌더하지 않는다 (섹션 숨김)", () => {
    const { container } = render(<ReviewSection reviews={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("작성 폼이 함께 렌더된다", () => {
    render(<ReviewSection reviews={[review("1", "김*수", "후기입니다 정말로.", "2026-05-28T00:00:00.000Z")]} />);
    expect(screen.getByRole("button", { name: /등록/ })).toBeTruthy();
  });
});
