"use client";

import type { Category } from "@melstudio/shared";

export default function TagBar({
  categories,
  counts,
  active,
  onChange,
}: {
  categories: Category[]; // "all" 포함(페이지에서 앞에 추가해 전달)
  counts?: Record<string, number>; // 없으면 카운트 배지 미표시 (무한스크롤 페이지)
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto py-1 md:flex-wrap md:justify-center md:overflow-visible">
      {categories.map((cat) => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`group flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-normal tracking-[-0.224px] transition-transform duration-200 active:scale-95 ${
              isActive
                ? "border-accent bg-accent text-white"
                : "border-hairline bg-white text-ink-muted/75 hover:border-accent hover:text-accent"
            }`}
          >
            {cat.label}
            {counts && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  isActive ? "bg-white/24 text-white" : "bg-canvas text-ink-muted/60"
                }`}
              >
                {counts[cat.id] ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
