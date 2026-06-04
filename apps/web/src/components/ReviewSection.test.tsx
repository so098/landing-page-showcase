import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Review } from "@melstudio/shared";
import ReviewSection from "./ReviewSection";

// 페이지 전환 시 클라이언트가 호출하는 fetchReviews를 목으로 대체
vi.mock("@/lib/api", () => ({ fetchReviews: vi.fn() }));
import { fetchReviews } from "@/lib/api";

const review = (id: string, authorName: string, body: string, createdAt: string): Review => ({
  id,
  authorName,
  body,
  createdAt,
});

const page1 = [
  review("1", "김*수", "첫 번째 후기입니다 정말로.", "2026-05-28T00:00:00.000Z"),
  review("2", "이*영", "두 번째 후기입니다 정말로.", "2026-05-27T00:00:00.000Z"),
];

beforeEach(() => {
  vi.mocked(fetchReviews).mockReset();
});

describe("ReviewSection (테이블 + 페이지네이션)", () => {
  it("마스킹된 이름·내용·포맷된 날짜를 테이블 행으로 렌더한다", () => {
    render(<ReviewSection initialItems={page1} total={2} pageSize={5} />);
    // 테이블 헤더
    expect(screen.getByRole("columnheader", { name: "작성자" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "내용" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "날짜" })).toBeTruthy();
    // 행 내용
    expect(screen.getByText("첫 번째 후기입니다 정말로.")).toBeTruthy();
    expect(screen.getByText(/김\*수/)).toBeTruthy();
    expect(screen.getByText(/2026\.05\.28/)).toBeTruthy();
  });

  it("리뷰가 없으면(total 0) 섹션을 숨긴다", () => {
    const { container } = render(<ReviewSection initialItems={[]} total={0} pageSize={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("작성 폼(후기 등록 버튼)을 더 이상 렌더하지 않는다", () => {
    render(<ReviewSection initialItems={page1} total={2} pageSize={5} />);
    expect(screen.queryByRole("button", { name: /등록/ })).toBeNull();
  });

  it("total/pageSize로 페이지 버튼 수를 계산한다 (40개·5개씩 → 8페이지)", () => {
    render(<ReviewSection initialItems={page1} total={40} pageSize={5} />);
    const nav = screen.getByRole("navigation", { name: "리뷰 페이지" });
    const buttons = within(nav).getAllByRole("button");
    expect(buttons.length).toBe(8);
  });

  it("페이지가 1개뿐이면 페이지네이션을 렌더하지 않는다", () => {
    render(<ReviewSection initialItems={page1} total={2} pageSize={5} />);
    expect(screen.queryByRole("navigation", { name: "리뷰 페이지" })).toBeNull();
  });

  it("페이지 번호 클릭 시 해당 페이지를 fetch해 행을 교체한다", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReviews).mockResolvedValue({
      items: [review("6", "박*훈", "여섯 번째 후기입니다 정말로.", "2026-05-20T00:00:00.000Z")],
      total: 40,
    });
    render(<ReviewSection initialItems={page1} total={40} pageSize={5} />);

    await user.click(screen.getByRole("button", { name: "2페이지" }));

    // 올바른 page/limit으로 호출
    expect(fetchReviews).toHaveBeenCalledWith({ limit: 5, page: 2 });
    // 새 행으로 교체, 이전 행은 사라짐
    expect(await screen.findByText("여섯 번째 후기입니다 정말로.")).toBeTruthy();
    expect(screen.queryByText("첫 번째 후기입니다 정말로.")).toBeNull();
    // 2페이지 버튼이 현재 페이지로 표시됨
    expect(
      screen.getByRole("button", { name: "2페이지" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("같은 페이지를 다시 누르면 fetch하지 않는다", async () => {
    const user = userEvent.setup();
    render(<ReviewSection initialItems={page1} total={40} pageSize={5} />);
    await user.click(screen.getByRole("button", { name: "1페이지" }));
    expect(fetchReviews).not.toHaveBeenCalled();
  });

  it("fetch 실패 시 에러 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReviews).mockRejectedValue(new Error("network"));
    render(<ReviewSection initialItems={page1} total={40} pageSize={5} />);

    await user.click(screen.getByRole("button", { name: "3페이지" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    // 기존 행은 유지 (교체 실패)
    expect(screen.getByText("첫 번째 후기입니다 정말로.")).toBeTruthy();
  });
});
