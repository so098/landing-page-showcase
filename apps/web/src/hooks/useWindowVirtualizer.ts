"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildOffsets,
  computeRange,
  getVirtualRows,
  totalHeight as calcTotalHeight,
  type VirtualRow,
} from "@/lib/virtualizer";

// 윈도우 스크롤 기반 행 가상화 훅 (직접 구현).
//
// - 스크롤/리사이즈: rAF 쓰로틀로 프레임당 최대 1회 재계산
// - 행 높이: estimateHeight로 시작 → ResizeObserver 실측으로 보정
// - 실측 보정 시 가시 영역 위쪽 행이 변하면 scrollBy로 위치 보정 (스크롤 튐 방지)
// - SSR: window가 없으므로 scrollY=0, 뷰포트는 기본값으로 첫 행들을 렌더

type Options = {
  rowCount: number;
  estimateHeight: number;
  overscan?: number;
};

type Result = {
  virtualRows: VirtualRow[];
  totalHeight: number;
  /** 그리드 컨테이너 ref — scrollMargin(문서 상단 오프셋) 계산용 */
  containerRef: (el: HTMLElement | null) => void;
  /** 행 ref 팩토리 — <div ref={measureRow(index)}> 로 사용 */
  measureRow: (index: number) => (el: HTMLElement | null) => void;
};

const SSR_VIEWPORT_HEIGHT = 800;

export default function useWindowVirtualizer({
  rowCount,
  estimateHeight,
  overscan = 3,
}: Options): Result {
  const measuredRef = useRef(new Map<number, number>());
  const observersRef = useRef(new Map<number, ResizeObserver>());
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // 스크롤/실측 변화 시 리렌더 트리거
  const [, setTick] = useState(0);

  // rAF 쓰로틀: boolean 플래그 사용.
  // (rafId 비교 방식은 테스트의 동기 rAF 목에서 콜백→할당 순서 때문에 가드가 깨진다)
  const pendingRef = useRef(false);
  const rafIdRef = useRef(0);
  const scheduleUpdate = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      pendingRef.current = false;
      setTick((n) => n + 1);
    });
  }, []);

  // window 스크롤/리사이즈 구독
  useEffect(() => {
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [scheduleUpdate]);

  // ── 렌더 시점 계산 (SSR 안전) ──
  const isClient = typeof window !== "undefined";
  const scrollY = isClient ? window.scrollY : 0;
  const viewportHeight = isClient ? window.innerHeight : SSR_VIEWPORT_HEIGHT;
  const scrollMargin = container ? container.offsetTop : 0;

  const offsets = buildOffsets(rowCount, estimateHeight, measuredRef.current);
  const range = computeRange({
    offsets,
    scrollY,
    viewportHeight,
    scrollMargin,
    overscan,
  });
  const virtualRows = getVirtualRows(offsets, range);
  const total = calcTotalHeight(offsets);

  // 현재 가시 범위 시작 (실측 보정 시 스크롤 튐 방지용)
  const rangeStartRef = useRef(range.start);
  rangeStartRef.current = range.start;

  // ── 행 실측 (ResizeObserver) ──
  const measureRow = useCallback(
    (index: number) =>
      (el: HTMLElement | null) => {
        // 기존 옵저버 해제 (행 언마운트 또는 교체)
        const prev = observersRef.current.get(index);
        if (prev) {
          prev.disconnect();
          observersRef.current.delete(index);
        }
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
          const height = entries[0]?.contentRect.height ?? 0;
          if (height <= 0) return;
          const prevHeight = measuredRef.current.get(index) ?? estimateHeight;
          if (height === prevHeight) return;

          measuredRef.current.set(index, height);

          // 가시 영역 위쪽 행의 높이가 바뀌면 그 차이만큼 스크롤 보정
          if (index < rangeStartRef.current) {
            window.scrollBy(0, height - prevHeight);
          }
          scheduleUpdate();
        });
        observer.observe(el);
        observersRef.current.set(index, observer);
      },
    [estimateHeight, scheduleUpdate],
  );

  // 언마운트 시 옵저버 전체 해제
  useEffect(() => {
    const observers = observersRef.current;
    return () => {
      observers.forEach((o) => o.disconnect());
      observers.clear();
    };
  }, []);

  return {
    virtualRows,
    totalHeight: total,
    containerRef: setContainer,
    measureRow,
  };
}
