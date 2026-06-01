"use client";

import { useEffect, useMemo, useState } from "react";
import type { Showcase } from "@melstudio/shared";
import ShowcaseCard from "./ShowcaseCard";

const PAGE_SIZE = 5;

function Arrow({
  dir,
  onClick,
  disabled,
  className = "",
}: {
  dir: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "next" ? "다음" : "이전"}
      className={`flex h-12 w-12 items-center justify-center rounded-full border border-rose/20 transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed bg-white/60 text-wine/25"
          : "bg-rose-grad text-white shadow-petal hover:scale-110 hover:shadow-petalHover active:scale-95"
      } ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === "next" ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
      </svg>
    </button>
  );
}

export default function ShowcaseGrid({
  items,
  labelOf,
  onOpen,
}: {
  items: Showcase[];
  labelOf: (categorySlug: string) => string;
  onOpen: (item: Showcase) => void;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  // 카테고리 변경 등으로 목록이 바뀌면 첫 페이지로
  useEffect(() => {
    setPage(0);
  }, [items]);

  const current = useMemo(
    () => items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [items, page],
  );

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

  const atStart = page === 0;
  const atEnd = page >= pageCount - 1;

  return (
    <div className="relative">
      {/* 좌우 큰 화살표 (md+) */}
      <Arrow
        dir="prev"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={atStart}
        className="absolute -left-5 top-[38%] z-20 hidden -translate-y-1/2 md:flex lg:-left-6"
      />
      <Arrow
        dir="next"
        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        disabled={atEnd}
        className="absolute -right-5 top-[38%] z-20 hidden -translate-y-1/2 md:flex lg:-right-6"
      />

      {/* 카드 그리드 */}
      <div
        key={page}
        className="grid grid-cols-2 gap-5 animate-slide-in sm:grid-cols-3 lg:grid-cols-5"
      >
        {current.map((item, i) => (
          <ShowcaseCard
            key={item.id}
            item={item}
            index={i}
            categoryLabel={labelOf(item.category)}
            onOpen={onOpen}
          />
        ))}
      </div>

      {/* 하단 컨트롤 */}
      <div className="mt-10 flex items-center justify-center gap-4">
        <Arrow
          dir="prev"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={atStart}
          className="md:hidden"
        />

        {/* 페이지 도트 */}
        <div className="flex items-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`${i + 1}페이지`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === page
                  ? "w-7 bg-rose-grad"
                  : "w-2 bg-rose/25 hover:bg-rose/50"
              }`}
            />
          ))}
        </div>

        <Arrow
          dir="next"
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={atEnd}
          className="md:hidden"
        />

        <span className="ml-1 hidden font-display text-sm font-semibold text-wine/50 sm:block">
          {page + 1} <span className="text-wine/25">/ {pageCount}</span>
        </span>
      </div>
    </div>
  );
}
