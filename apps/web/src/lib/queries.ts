"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchShowcases } from "./api";

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
