"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ShowcaseList } from "@melstudio/shared";
import { fetchCategories, fetchShowcases } from "./api";

const INFINITE_PAGE_SIZE = 12;

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

// ① 단계: 전체를 한 번에 받아 기존 클라이언트 필터/페이지네이션 유지
// (무한스크롤·가상화는 ② /gallery 에서 도입)
export function useAllShowcases() {
  return useQuery({
    queryKey: ["showcases", "all"],
    queryFn: () => fetchShowcases({ limit: 100 }),
  });
}

// ②-a: /showcase 무한스크롤 — 커서 페이지네이션을 useInfiniteQuery로 연결.
// initialPage: 서버(ISR)에서 렌더한 첫 페이지를 주입해 클라이언트 중복 fetch를 막는다 (하이브리드).
//   "전체" 탭에만 해당하며, 카테고리 필터 변경 시에는 클라이언트에서 새로 가져온다.
export function useInfiniteShowcases(category: string, initialPage?: ShowcaseList) {
  return useInfiniteQuery({
    queryKey: ["showcases", "infinite", category],
    queryFn: ({ pageParam }) =>
      fetchShowcases({ limit: INFINITE_PAGE_SIZE, cursor: pageParam, category }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    ...(initialPage && category === "all"
      ? {
          initialData: { pages: [initialPage], pageParams: [null as string | null] },
          // 서버에서 막 받은 데이터이므로 마운트 직후 재요청하지 않도록
          staleTime: 60_000,
        }
      : {}),
  });
}

// ③ 단계: 주문 페이지 — slug(=Showcase.id)로 단일 쇼케이스 찾기.
// 전용 단건 엔드포인트가 아직 없으므로 전체 목록을 재사용한다.
export function useShowcaseBySlug(slug: string) {
  const query = useAllShowcases();
  const showcase = query.data?.items.find((s) => s.id === slug) ?? null;
  return { ...query, showcase };
}
