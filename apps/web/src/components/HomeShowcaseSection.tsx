"use client";

import { useMemo, useState } from "react";
import type { Category, Showcase } from "@melstudio/shared";
import TagBar from "./TagBar";
import ShowcaseGrid from "./ShowcaseGrid";
import PreviewModal from "./PreviewModal";

// 메인 페이지의 클라이언트 섬 — 필터/슬라이더/모달 인터랙션만 담당.
// 데이터는 서버 컴포넌트(page.tsx, ISR)에서 props로 받는다.
export default function HomeShowcaseSection({
  categories,
  showcases,
  apiDown,
}: {
  categories: Category[];
  showcases: Showcase[];
  apiDown: boolean;
}) {
  const [active, setActive] = useState<string>("all");
  const [selected, setSelected] = useState<Showcase | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: showcases.length };
    for (const s of showcases) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [showcases]);

  const tabs: Category[] = useMemo(
    () => [{ id: "all", label: "전체" }, ...categories],
    [categories],
  );

  const labelOf = useMemo(() => {
    const m = new Map(tabs.map((t) => [t.id, t.label]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [tabs]);

  const filtered = useMemo(
    () => (active === "all" ? showcases : showcases.filter((s) => s.category === active)),
    [active, showcases],
  );

  return (
    <>
      <div className="sticky top-11 z-30 -mx-5 mb-10 bg-canvas/80 px-5 py-3 backdrop-blur-md">
        <TagBar categories={tabs} counts={counts} active={active} onChange={setActive} />
      </div>

      {apiDown ? (
        <p className="mx-auto max-w-6xl py-24 text-center text-[17px] tracking-[-0.374px] text-ink-muted/60">
          데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요.
        </p>
      ) : (
        <ShowcaseGrid items={filtered} labelOf={labelOf} onOpen={setSelected} />
      )}

      {/* ── 미리보기 모달 ── */}
      <PreviewModal
        item={selected}
        categoryLabel={selected ? labelOf(selected.category) : ""}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
