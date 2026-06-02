import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ShowcaseList } from "@melstudio/shared";
import { useInfiniteShowcases } from "./queries";
import * as api from "./api";

vi.mock("./api");

const mockFetchShowcases = vi.mocked(api.fetchShowcases);

function makeItem(id: string) {
  return {
    id,
    title: `제목 ${id}`,
    blurb: "설명",
    category: "cafe",
    accent: "#C2410C",
    layout: "hero" as const,
    desktop: null,
    mobile: null,
    thumb: null,
  };
}

function makePage(ids: string[], nextCursor: string | null): ShowcaseList {
  return { items: ids.map(makeItem), nextCursor };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useInfiniteShowcases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("첫 페이지를 불러오고 items로 평탄화할 수 있다", async () => {
    mockFetchShowcases.mockResolvedValueOnce(makePage(["a", "b"], null));

    const { result } = renderHook(() => useInfiniteShowcases("all"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = result.current.data!.pages.flatMap((p) => p.items);
    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("nextCursor가 있으면 다음 페이지를 커서로 요청한다", async () => {
    mockFetchShowcases
      .mockResolvedValueOnce(makePage(["a"], "cursor-1"))
      .mockResolvedValueOnce(makePage(["b"], null));

    const { result } = renderHook(() => useInfiniteShowcases("all"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => {
      const items = result.current.data!.pages.flatMap((p) => p.items);
      expect(items.map((i) => i.id)).toEqual(["a", "b"]);
    });

    // 2번째 호출에 커서가 전달됐는지
    expect(mockFetchShowcases).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "cursor-1", category: "all" }),
    );
  });

  it("카테고리가 바뀌면 첫 페이지부터 다시 요청한다 (queryKey 분리)", async () => {
    mockFetchShowcases.mockResolvedValue(makePage(["a"], null));

    const { result, rerender } = renderHook(
      ({ category }) => useInfiniteShowcases(category),
      { wrapper, initialProps: { category: "all" } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ category: "cafe" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // cafe 카테고리로 커서 없이(첫 페이지) 호출됐는지
    expect(mockFetchShowcases).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: "cafe", cursor: null }),
    );
  });

  it("initialPage를 주면 (전체 탭) 클라이언트 재요청 없이 그 데이터로 시작한다", async () => {
    const initial = makePage(["server-1"], "cursor-next");

    const { result } = renderHook(() => useInfiniteShowcases("all", initial), {
      wrapper,
    });

    // fetch 없이 즉시 데이터 존재
    expect(result.current.data!.pages[0].items[0].id).toBe("server-1");
    expect(result.current.hasNextPage).toBe(true);
    expect(mockFetchShowcases).not.toHaveBeenCalled();
  });
});
