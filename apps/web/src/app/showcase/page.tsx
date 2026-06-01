"use client";

import { useMemo, useState } from "react";
import type { Category, Showcase } from "@melstudio/shared";
import { useCategories, useInfiniteShowcases } from "@/lib/queries";
import SiteHeader from "@/components/SiteHeader";
import TagBar from "@/components/TagBar";
import InfiniteShowcaseGrid from "@/components/InfiniteShowcaseGrid";
import PreviewModal from "@/components/PreviewModal";

export default function ShowcasePage() {
  const [active, setActive] = useState<string>("all");
  const [selected, setSelected] = useState<Showcase | null>(null);

  const categoriesQuery = useCategories();
  const showcasesQuery = useInfiniteShowcases(active);

  // 페이지들을 평탄화해 단일 목록으로
  const items = useMemo(
    () => showcasesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [showcasesQuery.data],
  );

  const tabs: Category[] = useMemo(
    () => [{ id: "all", label: "전체" }, ...(categoriesQuery.data ?? [])],
    [categoriesQuery.data],
  );

  const labelOf = useMemo(() => {
    const m = new Map(tabs.map((t) => [t.id, t.label]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [tabs]);

  const isLoading = categoriesQuery.isLoading || showcasesQuery.isLoading;
  const isError = categoriesQuery.isError || showcasesQuery.isError;

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      {/* ── 타이틀 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-6 text-center sm:pt-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          쇼케이스 <span className="text-crimson">전체 보기</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-wine/70">
          업종 태그를 고르고 아래로 스크롤하면 더 많은 디자인이 나와요.
        </p>
      </section>

      {/* ── 태그 + 무한스크롤 그리드 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="sticky top-0 z-30 -mx-5 mb-10 bg-blush/70 px-5 py-4 backdrop-blur-md">
          <TagBar categories={tabs} active={active} onChange={setActive} />
        </div>

        {isError ? (
          <p className="py-24 text-center text-wine/60">
            데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요.
          </p>
        ) : isLoading ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : (
          <InfiniteShowcaseGrid
            items={items}
            labelOf={labelOf}
            onOpen={setSelected}
            hasNextPage={showcasesQuery.hasNextPage ?? false}
            isFetchingNextPage={showcasesQuery.isFetchingNextPage}
            onLoadMore={() => {
              if (!showcasesQuery.isFetchingNextPage) {
                void showcasesQuery.fetchNextPage();
              }
            }}
          />
        )}
      </section>

      {/* ── 미리보기 모달 ── */}
      <PreviewModal
        item={selected}
        categoryLabel={selected ? labelOf(selected.category) : ""}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
