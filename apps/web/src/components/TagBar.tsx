"use client";

import type { Category } from "@melstudio/shared";

export default function TagBar({
  categories,
  counts,
  active,
  onChange,
}: {
  categories: Category[]; // "all" 포함(페이지에서 앞에 추가해 전달)
  counts: Record<string, number>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 py-1 md:flex-wrap md:justify-center md:overflow-visible">
      {categories.map((cat) => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`group flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              isActive
                ? "border-transparent bg-rose-grad text-white shadow-petal"
                : "border-rose/20 bg-white/70 text-wine/70 hover:border-rose/50 hover:bg-white hover:text-crimson"
            }`}
          >
            {cat.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                isActive ? "bg-white/25 text-white" : "bg-petal/50 text-crimson-deep"
              }`}
            >
              {counts[cat.id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
