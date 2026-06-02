"use client";

import { useEffect, useRef } from "react";

// /showcase 스크롤 위치 복원 (뒤로가기 대응).
//
// 저장: 스크롤할 때마다 rAF 쓰로틀로 sessionStorage에 기록
// 복원: 마운트 시 1회 — 같은 카테고리이고, React Query 캐시 데이터(pageCount)가
//       저장 시점 이상으로 로드돼 있을 때만 복원 (캐시가 비었으면 복원 무의미)
// 무효화: 카테고리가 바뀌면 새 카테고리 기준으로 다시 저장됨

const KEY = "showcase-scroll";

type Saved = { offset: number; category: string; pageCount: number };

function read(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null; // 시크릿 모드 등 — 복원 기능만 비활성화
  }
}

function write(data: Saved): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 무시 (기능 저하일 뿐 동작에는 지장 없음)
  }
}

export default function useScrollRestoration(
  category: string,
  pageCount: number,
): void {
  // ── 복원: 조건이 충족될 때까지 재시도, 한 번 복원(또는 포기 확정)하면 잠금 ──
  // - 캐시가 비동기로 로드되는 경우(pageCount 0 → N)를 기다린다
  // - 단, 기다리는 동안 사용자가 직접 스크롤하면 복원을 포기한다 (화면 가로채기 방지)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;

    const saved = read();
    // 복원 대상이 아예 없으면 즉시 종료 확정
    if (!saved || saved.category !== category || saved.pageCount <= 0) {
      restoredRef.current = true;
      return;
    }

    // 데이터가 충분히 로드됨 → 복원 (단, 사용자가 이미 스크롤했으면 가로채기 방지)
    if (pageCount >= saved.pageCount) {
      restoredRef.current = true;
      if (window.scrollY === 0) {
        window.scrollTo(0, saved.offset);
      }
      return;
    }

    // 데이터를 기다리는 중인데 사용자가 이미 스크롤함 → 복원 포기
    if (window.scrollY > 0) {
      restoredRef.current = true;
    }
    // else: 다음 pageCount 변경 때 재시도
  }, [category, pageCount]);

  // ── 저장: 스크롤 시 rAF 쓰로틀 (boolean 플래그 — 동기 rAF 목에서도 안전) ──
  useEffect(() => {
    let pending = false;
    let rafId = 0;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(() => {
        pending = false;
        write({ offset: window.scrollY, category, pageCount });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [category, pageCount]);
}
