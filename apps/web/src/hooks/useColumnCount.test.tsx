import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useColumnCount from "./useColumnCount";

// matchMedia를 특정 min-width들만 매치되도록 목킹
function mockViewport(matchedQueries: string[]) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchedQueries.includes(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("useColumnCount", () => {
  it("아무 브레이크포인트도 안 맞으면 2열 (모바일)", () => {
    mockViewport([]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(2);
  });

  it("sm(640px+)이면 3열", () => {
    mockViewport(["(min-width: 640px)"]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(3);
  });

  it("lg(1024px+)이면 4열 (sm도 같이 매치돼도 lg 우선)", () => {
    mockViewport(["(min-width: 640px)", "(min-width: 1024px)"]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(4);
  });

  it("뷰포트가 바뀌면 (change 이벤트) 열 수가 업데이트된다", () => {
    // change 리스너를 캡처하는 matchMedia 목 — matches 상태를 외부에서 제어
    const listeners: (() => void)[] = [];
    let matched: string[] = [];
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matched.includes(query);
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(2); // 초기: 모바일

    // 뷰포트가 lg로 확대됨 → change 이벤트 발화
    act(() => {
      matched = ["(min-width: 640px)", "(min-width: 1024px)"];
      listeners.forEach((cb) => cb());
    });

    expect(result.current).toBe(4);
  });
});
