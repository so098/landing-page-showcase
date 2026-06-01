import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Showcase } from "@melstudio/shared";
import HomeShowcaseSection from "./HomeShowcaseSection";

const CATEGORIES = [
  { id: "cafe", label: "카페·베이커리" },
  { id: "beauty", label: "뷰티·살롱" },
];

const sc = (id: string, category: string): Showcase => ({
  id,
  title: `${id} 타이틀`,
  blurb: `${id} 설명`,
  category,
  accent: "#E11D48",
  layout: "hero",
  desktop: null,
  mobile: null,
  thumb: null,
});

const SHOWCASES = [sc("cafe-1", "cafe"), sc("cafe-2", "cafe"), sc("beauty-1", "beauty")];

describe("HomeShowcaseSection (서버 데이터 props 기반 클라이언트 섬)", () => {
  it("서버에서 받은 쇼케이스를 바로 렌더한다 (로딩 스피너 없음)", () => {
    render(
      <HomeShowcaseSection categories={CATEGORIES} showcases={SHOWCASES} apiDown={false} />,
    );
    // 카드 제목은 h3 (목업 미리보기 안에도 제목 텍스트가 있어 role로 특정)
    expect(screen.getByRole("heading", { name: "cafe-1 타이틀" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "beauty-1 타이틀" })).toBeTruthy();
    expect(screen.queryByText(/불러오는 중/)).toBeNull();
  });

  it("카테고리 탭 클릭 시 해당 업종만 필터링한다", async () => {
    render(
      <HomeShowcaseSection categories={CATEGORIES} showcases={SHOWCASES} apiDown={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /뷰티·살롱/ }));

    expect(screen.getByRole("heading", { name: "beauty-1 타이틀" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "cafe-1 타이틀" })).toBeNull();
  });

  it("카운트 배지가 업종별 개수를 표시한다", () => {
    render(
      <HomeShowcaseSection categories={CATEGORIES} showcases={SHOWCASES} apiDown={false} />,
    );
    // 전체 3, cafe 2, beauty 1
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("API 다운이면 에러 안내를 표시한다", () => {
    render(<HomeShowcaseSection categories={[]} showcases={[]} apiDown={true} />);
    expect(screen.getByText(/데이터를 불러오지 못했어요/)).toBeTruthy();
  });

  it("카드 클릭 시 미리보기 모달이 열린다", async () => {
    render(
      <HomeShowcaseSection categories={CATEGORIES} showcases={SHOWCASES} apiDown={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /cafe-1 타이틀 미리보기 열기/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
