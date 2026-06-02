import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
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
});
