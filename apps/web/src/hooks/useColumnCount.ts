"use client";

import { useSyncExternalStore } from "react";

// 그리드 열 수 단일 소스 — InfiniteShowcaseGrid가 이 값으로
// gridTemplateColumns를 도출한다 (행 묶기 + 시각 레이아웃 모두). 여기만 고치면 됨.
// 브레이크포인트 px 값은 Tailwind 설정(sm 640 / lg 1024)과 맞춰 유지.
const BREAKPOINTS = [
  { query: "(min-width: 1024px)", columns: 4 }, // lg
  { query: "(min-width: 640px)", columns: 3 }, // sm
] as const;

// SSR 기본값: 모바일 우선 2열
const DEFAULT_COLUMNS = 2;

function subscribe(onChange: () => void): () => void {
  const lists = BREAKPOINTS.map((b) => window.matchMedia(b.query));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function getSnapshot(): number {
  for (const { query, columns } of BREAKPOINTS) {
    if (window.matchMedia(query).matches) return columns;
  }
  return DEFAULT_COLUMNS;
}

function getServerSnapshot(): number {
  return DEFAULT_COLUMNS;
}

export default function useColumnCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
