"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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

// ②-a: /showcase 무한스크롤 — 커서 페이지네이션을 useInfiniteQuery로 연결
export function useInfiniteShowcases(category: string) {
  return useInfiniteQuery({
    queryKey: ["showcases", "infinite", category],
    queryFn: ({ pageParam }) =>
      fetchShowcases({ limit: INFINITE_PAGE_SIZE, cursor: pageParam, category }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

// ③ 단계: 주문 페이지 — slug(=Showcase.id)로 단일 쇼케이스 찾기.
// 전용 단건 엔드포인트가 아직 없으므로 전체 목록을 재사용한다.
export function useShowcaseBySlug(slug: string) {
  const query = useAllShowcases();
  const showcase = query.data?.items.find((s) => s.id === slug) ?? null;
  return { ...query, showcase };
}
