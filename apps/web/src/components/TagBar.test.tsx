import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagBar from "./TagBar";

const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "cafe", label: "카페·베이커리" },
  { id: "beauty", label: "뷰티·살롱" },
];

describe("TagBar", () => {
  it("카테고리 버튼들을 렌더한다", () => {
    render(<TagBar categories={CATEGORIES} active="all" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /전체/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /카페·베이커리/ })).toBeTruthy();
  });

  it("counts를 주면 카운트 배지가 표시된다", () => {
    render(
      <TagBar
        categories={CATEGORIES}
        counts={{ all: 10, cafe: 4, beauty: 6 }}
        active="all"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("counts를 안 주면 카운트 배지가 없다 (무한스크롤 페이지용)", () => {
    render(<TagBar categories={CATEGORIES} active="all" onChange={() => {}} />);
    expect(screen.queryByText("10")).toBeNull();
  });

  it("카테고리 클릭 시 onChange가 해당 id로 호출된다", async () => {
    const onChange = vi.fn();
    render(<TagBar categories={CATEGORIES} active="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /카페·베이커리/ }));
    expect(onChange).toHaveBeenCalledWith("cafe");
  });
});
