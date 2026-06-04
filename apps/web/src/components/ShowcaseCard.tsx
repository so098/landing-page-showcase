"use client";

import type { Showcase } from "@melstudio/shared";
import PagePreview from "./PagePreview";

export default function ShowcaseCard({
  item,
  index,
  categoryLabel,
  onOpen,
  animate = true,
}: {
  item: Showcase;
  index: number;
  categoryLabel: string;
  onOpen: (item: Showcase) => void;
  /** false면 fade-up 애니메이션 없이 즉시 표시 (가상화 재마운트용) */
  animate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group relative flex flex-col text-left focus:outline-none ${
        animate ? "animate-fade-up" : ""
      }`}
      style={animate ? { animationDelay: `${index * 70}ms` } : undefined}
      aria-label={`${item.title} 미리보기 열기`}
    >
      {/* 브라우저 프레임 썸네일 */}
      <div className="relative overflow-hidden rounded-[18px] border border-hairline bg-white transition-transform duration-300 ease-out group-hover:-translate-y-1">
        {/* 브라우저 바 */}
        <div className="flex items-center gap-1.5 border-b border-hairline bg-canvas px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#d2d2d7]" />
          <span className="h-2 w-2 rounded-full bg-[#d2d2d7]" />
          <span className="h-2 w-2 rounded-full bg-[#d2d2d7]" />
          <span className="ml-2 hidden truncate rounded-full bg-white px-2 py-0.5 text-[9px] text-ink-muted/45 sm:block">
            {item.id}.com
          </span>
        </div>

        {/* 페이지 미리보기 */}
        <div className="relative aspect-[16/11] w-full overflow-hidden bg-white">
          <PagePreview item={item} variant="desktop" />
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 flex items-end justify-center bg-black/0 opacity-0 transition-opacity duration-300 group-hover:bg-black/18 group-hover:opacity-100">
            <span className="mb-4 rounded-full bg-accent px-4 py-1.5 text-xs font-normal tracking-[-0.12px] text-white">
              데스크탑 · 모바일 보기
            </span>
          </div>
        </div>
      </div>

      {/* 카드 정보 */}
      <div className="mt-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-normal tracking-[-0.08px] text-ink-muted/65">
            {categoryLabel}
          </span>
        </div>
        <h3 className="mt-1.5 font-display text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-ink transition-colors group-hover:text-accent">
          {item.title}
        </h3>
        <p className="mt-1 text-sm leading-[1.43] tracking-[-0.224px] text-ink-muted/65">{item.blurb}</p>
      </div>
    </button>
  );
}
