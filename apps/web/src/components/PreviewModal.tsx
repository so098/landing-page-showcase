"use client";

import { useEffect } from "react";
import type { Showcase } from "@melstudio/shared";
import PagePreview from "./PagePreview";

export default function PreviewModal({
  item,
  categoryLabel,
  onClose,
}: {
  item: Showcase | null;
  categoryLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} 미리보기`}
    >
      {/* 백드롭 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute inset-0 cursor-default bg-wine/55 backdrop-blur-md"
      />

      {/* 패널 */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/40 bg-cream shadow-petalHover animate-modal-in">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 border-b border-rose/10 bg-gradient-to-r from-petalSoft to-cream px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-grad px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {categoryLabel}
              </span>
              <span className="text-xs text-wine/40">{item.id}.com</span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-ink">
              {item.title}
            </h2>
            <p className="text-sm text-wine/60">{item.blurb}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-rose/20 bg-white text-wine/60 transition-all hover:rotate-90 hover:border-rose hover:text-crimson"
            aria-label="닫기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 미리보기 본문 */}
        <div className="flex flex-col gap-8 overflow-y-auto px-6 py-7 lg:flex-row lg:items-start">
          {/* 데스크탑 */}
          <div className="flex-1">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-wine/45">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              데스크탑
            </div>
            {/* 브라우저 프레임 */}
            <div className="overflow-hidden rounded-xl border border-rose/15 bg-white shadow-petal">
              <div className="flex items-center gap-1.5 border-b border-rose/10 bg-petalSoft/60 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-rose-light/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-rose-soft/60" />
                <span className="ml-3 flex-1 truncate rounded-full bg-white/70 px-3 py-1 text-[11px] text-wine/40">
                  https://{item.id}.com
                </span>
              </div>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-white">
                <PagePreview item={item} variant="desktop" priority />
              </div>
            </div>
          </div>

          {/* 모바일 */}
          <div className="flex flex-shrink-0 flex-col items-center lg:w-[230px]">
            <div className="mb-2.5 flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-wider text-wine/45 lg:self-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="7" y="2" width="10" height="20" rx="2.5" />
                <path d="M11 18h2" />
              </svg>
              모바일
            </div>
            {/* 폰 프레임 */}
            <div className="relative w-[200px] rounded-[2rem] border-[6px] border-ink bg-ink p-0 shadow-petal">
              <div className="absolute left-1/2 top-2 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/20" />
              <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[1.5rem] bg-white">
                <PagePreview item={item} variant="mobile" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
