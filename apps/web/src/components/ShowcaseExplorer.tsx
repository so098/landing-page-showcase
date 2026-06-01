"use client";

import { useMemo, useState } from "react";
import type { Category, Showcase, ShowcaseList } from "@melstudio/shared";
import { useInfiniteShowcases } from "@/lib/queries";
import TagBar from "./TagBar";
import InfiniteShowcaseGrid from "./InfiniteShowcaseGrid";
import PreviewModal from "./PreviewModal";

// /showcase의 클라이언트 섬 — 무한스크롤/필터/모달 인터랙션 담당.
// 첫 페이지 데이터와 카테고리는 서버 컴포넌트(ISR)에서 props로 받는다 (하이브리드).
export default function ShowcaseExplorer({
  categories,
  initialPage,
  apiDown,
}: {
  categories: Category[];
  initialPage: ShowcaseList | null;
  apiDown: boolean;
}) {
  const [active, setActive] = useState<string>("all");
  const [selected, setSelected] = useState<Showcase | null>(null);

  const showcasesQuery = useInfiniteShowcases(active, initialPage ?? undefined);

  // 페이지들을 평탄화해 단일 목록으로
  const items = useMemo(
    () => showcasesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [showcasesQuery.data],
  );

  const tabs: Category[] = useMemo(
    () => [{ id: "all", label: "전체" }, ...categories],
    [categories],
  );

  const labelOf = useMemo(() => {
    const m = new Map(tabs.map((t) => [t.id, t.label]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [tabs]);

  const isError = apiDown || showcasesQuery.isError;
  const isLoading = showcasesQuery.isLoading;

  return (
    <>
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

      {/* ── 미리보기 모달 ── */}
      <PreviewModal
        item={selected}
        categoryLabel={selected ? labelOf(selected.category) : ""}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
