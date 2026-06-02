"use client";

import { useSyncExternalStore } from "react";

// 그리드 열 수 감지 — Tailwind 브레이크포인트와 동일하게 유지할 것.
// (InfiniteShowcaseGrid의 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 와 짝)
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
