import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useScrollRestoration from "./useScrollRestoration";

const KEY = "showcase-scroll";

describe("useScrollRestoration", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    Object.defineProperty(window, "scrollY", { writable: true, value: 0 });
  });

  it("저장된 위치가 있고 카테고리/페이지 수가 맞으면 복원한다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "all", pageCount: 3 }),
    );
    renderHook(() => useScrollRestoration("all", 3));
    // instant 스크롤 객체 형태 — 전역 scroll-behavior: smooth 애니메이션 방지
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 1234, behavior: "instant" });
  });

  it("카테고리가 다르면 복원하지 않는다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "cafe", pageCount: 3 }),
    );
    renderHook(() => useScrollRestoration("all", 3));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("로드된 페이지가 저장 시점보다 적으면 (캐시 만료) 복원하지 않는다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "all", pageCount: 5 }),
    );
    renderHook(() => useScrollRestoration("all", 1)); // 캐시가 비어 1페이지뿐
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("스크롤하면 현재 위치를 저장한다", () => {
    renderHook(() => useScrollRestoration("all", 2));

    Object.defineProperty(window, "scrollY", { writable: true, value: 777 });
    window.dispatchEvent(new Event("scroll"));

    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
    expect(saved).toEqual({ offset: 777, category: "all", pageCount: 2 });
  });

  it("마운트 시점에 캐시가 비어 있다가 나중에 로드되면 (비동기 하이드레이션) 복원한다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "all", pageCount: 3 }),
    );
    const { rerender } = renderHook(
      ({ pageCount }) => useScrollRestoration("all", pageCount),
      { initialProps: { pageCount: 0 } },
    );
    expect(window.scrollTo).not.toHaveBeenCalled();

    // 캐시 하이드레이션으로 pageCount 도달
    rerender({ pageCount: 3 });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 1234, behavior: "instant" });
  });

  it("복원 대기 중 사용자가 이미 스크롤했으면 늦은 복원을 하지 않는다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "all", pageCount: 3 }),
    );
    const { rerender } = renderHook(
      ({ pageCount }) => useScrollRestoration("all", pageCount),
      { initialProps: { pageCount: 1 } },
    );
    expect(window.scrollTo).not.toHaveBeenCalled();

    // 사용자가 직접 스크롤 시작 (복원 전)
    Object.defineProperty(window, "scrollY", { writable: true, value: 500 });

    // 이후 페이지가 자연스럽게 로드되어 pageCount 도달 — 복원하면 안 됨 (가로채기 방지)
    rerender({ pageCount: 3 });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("sessionStorage가 막혀 있어도 (시크릿 모드) throw하지 않는다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => {
      renderHook(() => useScrollRestoration("all", 1));
      window.dispatchEvent(new Event("scroll"));
    }).not.toThrow();
  });
});
