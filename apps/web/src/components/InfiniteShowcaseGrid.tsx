"use client";

import { useEffect, useRef } from "react";
import type { Showcase } from "@melstudio/shared";
import ShowcaseCard from "./ShowcaseCard";

export default function InfiniteShowcaseGrid({
  items,
  labelOf,
  onOpen,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  items: Showcase[];
  labelOf: (categorySlug: string) => string;
  onOpen: (item: Showcase) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 센티널이 뷰포트(아래 400px 여유)에 들어오면 다음 페이지 로드
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, onLoadMore]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-rose/30 bg-white/50 px-6 py-24 text-center">
        <span className="text-4xl">🌸</span>
        <p className="mt-4 font-display text-lg font-bold text-ink">
          준비된 페이지가 없어요
        </p>
        <p className="text-sm text-wine/50">다른 업종을 선택해 보세요.</p>
      </div>
    );
  }

  return (
    <div>
      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <ShowcaseCard
            key={item.id}
            item={item}
            index={i % 12}
            categoryLabel={labelOf(item.category)}
            onOpen={onOpen}
          />
        ))}
      </div>

      {/* 무한스크롤 센티널 + 하단 상태 */}
      <div
        ref={sentinelRef}
        className="mt-10 flex items-center justify-center py-6"
      >
        {isFetchingNextPage ? (
          <span className="flex items-center gap-2 text-sm text-wine/50">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose/30 border-t-crimson" />
            불러오는 중…
          </span>
        ) : !hasNextPage ? (
          <span className="text-sm text-wine/40">전부 봤어요 🌸</span>
        ) : null}
      </div>
    </div>
  );
}
