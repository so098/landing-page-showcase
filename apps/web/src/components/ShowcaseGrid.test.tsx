import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Showcase } from "@melstudio/shared";
import ShowcaseGrid from "./ShowcaseGrid";

// ShowcaseGrid는 PAGE_SIZE=5로 슬라이더 페이지네이션한다.
const sc = (id: string): Showcase => ({
  id,
  title: `${id} 타이틀`,
  blurb: `${id} 설명`,
  category: "cafe",
  accent: "#E11D48",
  layout: "hero",
  desktop: null,
  mobile: null,
  thumb: null,
});

// 12개 → 3페이지 (5 + 5 + 2)
const makeItems = (n: number) => Array.from({ length: n }, (_, i) => sc(`item-${i}`));

const defaultProps = {
  labelOf: () => "카페·베이커리",
  onOpen: vi.fn(),
};

/** 화면에 보이는 카드 제목들을 수집한다 (PagePreview 내부 텍스트 제외 위해 heading role 사용) */
function visibleTitles() {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent);
}

/** 화살표 버튼들: md용/모바일용으로 각 방향이 2개씩 렌더된다 */
function nextButtons() {
  return screen.getAllByRole("button", { name: "다음" });
}
function prevButtons() {
  return screen.getAllByRole("button", { name: "이전" });
}

describe("ShowcaseGrid (슬라이더 페이지네이션)", () => {
  it("페이지당 PAGE_SIZE(5)개만 렌더한다", () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    const titles = visibleTitles();
    expect(titles).toHaveLength(5);
    expect(titles).toEqual([
      "item-0 타이틀",
      "item-1 타이틀",
      "item-2 타이틀",
      "item-3 타이틀",
      "item-4 타이틀",
    ]);
  });

  it("아이템 12개 → 페이지 도트 3개 + 인디케이터 '1 / 3'", () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    // 페이지 도트: aria-label "N페이지"
    expect(screen.getByRole("button", { name: "1페이지" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2페이지" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "3페이지" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "4페이지" })).toBeNull();
    // 텍스트 인디케이터
    expect(screen.getByText(/\/ 3/)).toBeTruthy();
  });

  it("다음 버튼을 누르면 다음 페이지 아이템으로 교체된다", async () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    await userEvent.click(nextButtons()[0]);

    const titles = visibleTitles();
    expect(titles).toEqual([
      "item-5 타이틀",
      "item-6 타이틀",
      "item-7 타이틀",
      "item-8 타이틀",
      "item-9 타이틀",
    ]);
  });

  it("이전 버튼은 다음 페이지로 이동한 뒤 원래 페이지로 되돌린다", async () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    await userEvent.click(nextButtons()[0]); // page 1
    await userEvent.click(prevButtons()[0]); // page 0

    expect(visibleTitles()[0]).toBe("item-0 타이틀");
  });

  it("마지막 페이지는 남은 아이템만 렌더한다 (12개의 3페이지 = 2개)", async () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "3페이지" }));

    const titles = visibleTitles();
    expect(titles).toEqual(["item-10 타이틀", "item-11 타이틀"]);
  });

  it("첫 페이지에서 이전 버튼은 비활성화된다", () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    prevButtons().forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
    // 첫 페이지에서 다음은 활성
    nextButtons().forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("마지막 페이지에서 다음 버튼은 비활성화된다", async () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "3페이지" }));

    nextButtons().forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
    prevButtons().forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("비활성 이전 버튼을 클릭해도 페이지는 첫 페이지에 머문다", async () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    // disabled 버튼이라 클릭은 무시되어야 한다
    await userEvent.click(prevButtons()[0]);
    expect(visibleTitles()[0]).toBe("item-0 타이틀");
  });

  it("페이지 도트 클릭으로 임의 페이지로 점프한다", async () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "2페이지" }));

    expect(visibleTitles()[0]).toBe("item-5 타이틀");
    expect(screen.getByText(/^2/)).toBeTruthy();
  });

  it("아이템이 PAGE_SIZE 이하면 도트는 1개, 양쪽 화살표 모두 비활성", () => {
    render(<ShowcaseGrid items={makeItems(3)} {...defaultProps} />);
    expect(screen.getByRole("button", { name: "1페이지" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "2페이지" })).toBeNull();

    [...prevButtons(), ...nextButtons()].forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("빈 목록이면 빈 상태 UI를 보여주고 화살표/도트를 렌더하지 않는다", () => {
    render(<ShowcaseGrid items={[]} {...defaultProps} />);
    expect(screen.getByText(/준비된 페이지가 없어요/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "다음" })).toBeNull();
    expect(screen.queryByRole("button", { name: "1페이지" })).toBeNull();
  });

  it("카드 클릭 시 onOpen을 해당 아이템으로 호출한다", async () => {
    const onOpen = vi.fn();
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} onOpen={onOpen} />);
    await userEvent.click(
      screen.getByRole("button", { name: "item-2 타이틀 미리보기 열기" }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].id).toBe("item-2");
  });

  it("두 번째 페이지에서 카드 클릭 시 그 페이지의 아이템으로 onOpen을 호출한다", async () => {
    const onOpen = vi.fn();
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} onOpen={onOpen} />);
    await userEvent.click(nextButtons()[0]);
    await userEvent.click(
      screen.getByRole("button", { name: "item-6 타이틀 미리보기 열기" }),
    );
    expect(onOpen.mock.calls[0][0].id).toBe("item-6");
  });

  it("items 목록이 바뀌면 첫 페이지로 리셋한다 (카테고리 전환)", async () => {
    const { rerender } = render(
      <ShowcaseGrid items={makeItems(12)} {...defaultProps} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "3페이지" }));
    expect(visibleTitles()[0]).toBe("item-10 타이틀");

    // 새 목록(다른 참조)으로 교체 → page 0으로 리셋되어야 한다
    const next = [sc("alt-0"), sc("alt-1"), sc("alt-2"), sc("alt-3"), sc("alt-4"), sc("alt-5")];
    rerender(<ShowcaseGrid items={next} {...defaultProps} />);

    expect(visibleTitles()[0]).toBe("alt-0 타이틀");
    expect(screen.getByText(/^1/)).toBeTruthy();
  });

  it("현재 페이지 도트만 활성 스타일(w-7)을 가진다", async () => {
    render(<ShowcaseGrid items={makeItems(12)} {...defaultProps} />);
    const dot1 = screen.getByRole("button", { name: "1페이지" });
    const dot2 = screen.getByRole("button", { name: "2페이지" });
    expect(dot1.className).toContain("w-7");
    expect(dot2.className).not.toContain("w-7");

    await userEvent.click(dot2);
    expect(screen.getByRole("button", { name: "2페이지" }).className).toContain("w-7");
    expect(screen.getByRole("button", { name: "1페이지" }).className).not.toContain("w-7");
  });
});
