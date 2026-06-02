"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Showcase } from "@melstudio/shared";
import ShowcaseCard from "./ShowcaseCard";
import useColumnCount from "@/hooks/useColumnCount";
import useWindowVirtualizer from "@/hooks/useWindowVirtualizer";

// 행 높이 추정값(px): 카드(16/11 비율) + 텍스트 + 행 간격.
// 실측(measureRow)으로 곧바로 보정되므로 대략적이어도 된다.
const ESTIMATE_ROW_HEIGHT = 320;

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
  const columns = useColumnCount();

  // 아이템을 열 수만큼 행으로 묶기
  const rows = useMemo(() => {
    const out: Showcase[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      out.push(items.slice(i, i + columns));
    }
    return out;
  }, [items, columns]);

  const { virtualRows, totalHeight, containerRef, measureRow } =
    useWindowVirtualizer({
      rowCount: rows.length,
      estimateHeight: ESTIMATE_ROW_HEIGHT,
      overscan: 3,
    });

  // 첫 마운트 여부 — 첫 페인트의 카드들만 fade-up stagger 적용
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    isFirstMountRef.current = false;
  }, []);

  // 마지막 행이 가상 범위에 들어오면 다음 페이지 로드 (센티널 대체).
  // lastLoadedAtRef: 같은 rows.length에서 중복 호출 방지 —
  // onLoadMore() 호출 후 isFetchingNextPage prop이 갱신되기 전에
  // 스크롤 이벤트로 effect가 재실행되는 race를 막는다.
  const lastVirtualIndex = virtualRows[virtualRows.length - 1]?.index ?? -1;
  const lastLoadedAtRef = useRef(0);
  useEffect(() => {
    if (
      lastVirtualIndex >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage &&
      rows.length > lastLoadedAtRef.current
    ) {
      lastLoadedAtRef.current = rows.length;
      onLoadMore();
    }
  }, [lastVirtualIndex, rows.length, hasNextPage, isFetchingNextPage, onLoadMore]);

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
      {/* 가상화 컨테이너: 전체 높이를 유지하고 보이는 행만 absolute 배치 */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: totalHeight }}
        data-testid="virtual-grid"
      >
        {virtualRows.map((vr) => (
          <div
            key={vr.index}
            ref={measureRow(vr.index)}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${vr.start}px)` }}
          >
            {/* 행 내부: 기존 그리드 클래스 재사용. pb-5가 행 간격(gap) 역할 */}
            <div className="grid grid-cols-2 gap-5 pb-5 sm:grid-cols-3 lg:grid-cols-4">
              {rows[vr.index]?.map((item, colIdx) => (
                <ShowcaseCard
                  key={item.id}
                  item={item}
                  index={colIdx}
                  categoryLabel={labelOf(item.category)}
                  onOpen={onOpen}
                  animate={isFirstMountRef.current}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 하단 상태 */}
      <div className="mt-10 flex items-center justify-center py-6">
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
