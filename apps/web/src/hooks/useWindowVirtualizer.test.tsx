import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useWindowVirtualizer from "./useWindowVirtualizer";

// jsdom: window.innerHeight 기본 768, window.scrollY 기본 0

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { writable: true, value: y });
}

describe("useWindowVirtualizer", () => {
  beforeEach(() => {
    setScrollY(0);
    // rAF를 동기 실행으로 목킹 (쓰로틀 없이 즉시 계산)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("스크롤 0에서 첫 화면 행들만 반환한다", () => {
    const { result } = renderHook(() =>
      useWindowVirtualizer({ rowCount: 100, estimateHeight: 100, overscan: 2 }),
    );
    // 뷰포트 768px / 행 100px → 가시 0~7행 + overscan 2 → 0~9
    const indexes = result.current.virtualRows.map((r) => r.index);
    expect(indexes[0]).toBe(0);
    expect(indexes[indexes.length - 1]).toBe(9);
    expect(result.current.totalHeight).toBe(100 * 100);
  });

  it("스크롤하면 가시 범위가 이동한다", () => {
    const { result } = renderHook(() =>
      useWindowVirtualizer({ rowCount: 100, estimateHeight: 100, overscan: 2 }),
    );

    act(() => {
      setScrollY(5000);
      window.dispatchEvent(new Event("scroll"));
    });

    const indexes = result.current.virtualRows.map((r) => r.index);
    // 가시 50~57행 + overscan → 48~59
    expect(indexes[0]).toBe(48);
    expect(indexes).toContain(50);
    expect(indexes[indexes.length - 1]).toBe(59);
  });

  it("행 실측값이 반영되면 totalHeight가 갱신된다", () => {
    const { result } = renderHook(() =>
      useWindowVirtualizer({ rowCount: 10, estimateHeight: 100, overscan: 2 }),
    );
    expect(result.current.totalHeight).toBe(1000);

    // 0번 행을 실측 200px로 보고
    const el = document.createElement("div");
    act(() => {
      result.current.measureRow(0)(el);
      // ResizeObserver 목으로 측정 발생
      const MockRO = (window as unknown as Record<string, unknown>)
        .__MockResizeObserver as {
        instances: { trigger: (h: number) => void }[];
      };
      MockRO.instances[MockRO.instances.length - 1].trigger(200);
    });

    expect(result.current.totalHeight).toBe(1000 + 100); // 0번 행 100 → 200
  });

  it("measureRow는 같은 인덱스에 대해 안정적인(같은) 콜백을 반환한다", () => {
    const { result, rerender } = renderHook(() =>
      useWindowVirtualizer({ rowCount: 10, estimateHeight: 100, overscan: 2 }),
    );

    const cb1 = result.current.measureRow(3);

    // 리렌더 후에도 같은 인덱스는 같은 콜백 (ref 재호출로 인한 옵저버 재생성 방지)
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    rerender();

    const cb2 = result.current.measureRow(3);
    expect(cb2).toBe(cb1);

    // 다른 인덱스는 다른 콜백
    expect(result.current.measureRow(4)).not.toBe(cb1);
  });

  it("rowCount가 줄어들면 (필터 변경) 범위가 클램프된다", () => {
    const { result, rerender } = renderHook(
      ({ rowCount }) =>
        useWindowVirtualizer({ rowCount, estimateHeight: 100, overscan: 2 }),
      { initialProps: { rowCount: 100 } },
    );

    act(() => {
      setScrollY(5000);
      window.dispatchEvent(new Event("scroll"));
    });

    rerender({ rowCount: 3 }); // 필터로 행이 3개로 줄어듦

    const indexes = result.current.virtualRows.map((r) => r.index);
    expect(Math.max(...indexes)).toBeLessThanOrEqual(2);
  });
});
