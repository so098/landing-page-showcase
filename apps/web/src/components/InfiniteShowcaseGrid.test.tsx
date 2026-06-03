import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { Showcase } from "@melstudio/shared";
import InfiniteShowcaseGrid from "./InfiniteShowcaseGrid";

// 1,000개 더미 아이템
const ITEMS: Showcase[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `item-${i}`,
  title: `쇼케이스 ${i}`,
  blurb: `설명 ${i}`,
  category: "cafe",
  accent: "#C2410C",
  layout: "hero",
  desktop: null,
  mobile: null,
  thumb: null,
}));

const defaultProps = {
  items: ITEMS,
  labelOf: () => "카페·베이커리",
  onOpen: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  onLoadMore: vi.fn(),
};

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { writable: true, value: y });
}

describe("InfiniteShowcaseGrid (가상화)", () => {
  beforeEach(() => {
    setScrollY(0);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("1,000개를 줘도 화면 분량만 렌더한다", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} />);
    const cards = screen.getAllByRole("button", { name: /미리보기 열기/ });
    // jsdom 뷰포트(768px) + overscan → 수십 개 수준. 1,000개 전부가 아님을 확인.
    expect(cards.length).toBeLessThan(100);
    expect(cards.length).toBeGreaterThan(0);
  });

  it("스크롤하면 다른 아이템들이 렌더된다 (아이템 교체)", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} />);
    // 처음에는 item-0이 있고 item-500은 없다
    expect(screen.getByLabelText("쇼케이스 0 미리보기 열기")).toBeTruthy();
    expect(screen.queryByLabelText("쇼케이스 500 미리보기 열기")).toBeNull();

    // 중간으로 스크롤 (2열 × 행 추정높이 기준 대략 중간 지점)
    act(() => {
      setScrollY(80_000);
      window.dispatchEvent(new Event("scroll"));
    });

    // item-0은 사라지고 중간 아이템이 보인다
    expect(screen.queryByLabelText("쇼케이스 0 미리보기 열기")).toBeNull();
    const cards = screen.getAllByRole("button", { name: /미리보기 열기/ });
    expect(cards.length).toBeLessThan(100);
  });

  it("마지막 행 근처에 도달하면 onLoadMore를 호출한다", () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteShowcaseGrid
        {...defaultProps}
        items={ITEMS.slice(0, 24)} // 2열 → 12행
        hasNextPage={true}
        onLoadMore={onLoadMore}
      />,
    );

    // 끝까지 스크롤
    act(() => {
      setScrollY(100_000);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(onLoadMore).toHaveBeenCalled();
  });

  it("hasNextPage=false면 '전부 봤어요'를 표시한다", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} hasNextPage={false} />);
    expect(screen.getByText(/전부 봤어요/)).toBeTruthy();
  });

  it("로딩 중이면 스피너 문구를 표시한다", () => {
    render(
      <InfiniteShowcaseGrid
        {...defaultProps}
        hasNextPage={true}
        isFetchingNextPage={true}
      />,
    );
    expect(screen.getByText(/불러오는 중/)).toBeTruthy();
  });

  it("행 그리드가 columns 단일 소스에서 gridTemplateColumns를 도출한다", () => {
    const { container } = render(<InfiniteShowcaseGrid {...defaultProps} />);
    // jsdom matchMedia 기본 → useColumnCount=2열
    const rowGrid = container.querySelector('[style*="grid-template-columns"]') as HTMLElement | null;
    expect(rowGrid).not.toBeNull();
    expect(rowGrid!.style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("빈 목록이면 빈 상태 UI를 보여준다", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} items={[]} />);
    expect(screen.getByText(/준비된 페이지가 없어요/)).toBeTruthy();
  });

  it("isFetchingNextPage=true인 동안에는 onLoadMore를 호출하지 않는다", () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteShowcaseGrid
        {...defaultProps}
        items={ITEMS.slice(0, 24)}
        hasNextPage={true}
        isFetchingNextPage={true}
        onLoadMore={onLoadMore}
      />,
    );

    act(() => {
      setScrollY(100_000);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
