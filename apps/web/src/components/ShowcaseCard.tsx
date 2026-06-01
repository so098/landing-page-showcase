"use client";

import type { Showcase } from "@melstudio/shared";
import PagePreview from "./PagePreview";

export default function ShowcaseCard({
  item,
  index,
  categoryLabel,
  onOpen,
}: {
  item: Showcase;
  index: number;
  categoryLabel: string;
  onOpen: (item: Showcase) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group relative flex flex-col text-left animate-fade-up focus:outline-none"
      style={{ animationDelay: `${index * 70}ms` }}
      aria-label={`${item.title} 미리보기 열기`}
    >
      {/* 브라우저 프레임 썸네일 */}
      <div className="relative overflow-hidden rounded-2xl border border-rose/15 bg-white shadow-soft transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:shadow-petalHover group-hover:border-rose/40">
        {/* 브라우저 바 */}
        <div className="flex items-center gap-1.5 border-b border-rose/10 bg-petalSoft/60 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-rose/40" />
          <span className="h-2 w-2 rounded-full bg-rose-light/50" />
          <span className="h-2 w-2 rounded-full bg-rose-soft/60" />
          <span className="ml-2 hidden truncate rounded-full bg-white/70 px-2 py-0.5 text-[9px] text-wine/40 sm:block">
            {item.id}.com
          </span>
        </div>

        {/* 페이지 미리보기 */}
        <div className="relative aspect-[16/11] w-full overflow-hidden bg-white">
          <PagePreview item={item} variant="desktop" />
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-wine/70 via-wine/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <span className="mb-4 rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-crimson shadow-sm">
              데스크탑 · 모바일 보기
            </span>
          </div>
        </div>
      </div>

      {/* 카드 정보 */}
      <div className="mt-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-petal/60 px-2 py-0.5 text-[10px] font-semibold text-crimson-deep">
            {categoryLabel}
          </span>
        </div>
        <h3 className="mt-1.5 font-display text-base font-bold leading-snug text-ink transition-colors group-hover:text-crimson">
          {item.title}
        </h3>
        <p className="text-xs text-wine/55">{item.blurb}</p>
      </div>
    </button>
  );
}
