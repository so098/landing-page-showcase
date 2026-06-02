"use client";

import { useEffect, useRef } from "react";

// /showcase 스크롤 위치 복원 (뒤로가기 대응).
//
// 저장: 스크롤할 때마다 rAF 쓰로틀로 sessionStorage에 기록.
//       - scrollY===0은 저장하지 않는다: top은 복원할 의미가 없고, 다른 페이지로
//         이동(언마운트)할 때 발생하는 teardown scroll-to-0 이벤트가 직전에 저장된
//         유의미한 offset을 0으로 덮어쓰는 것을 막는다 (뒤로가기 복원 실패의 핵심 원인).
//       - 복원이 끝나기 전까지는 저장을 억제한다 — 재마운트/복원 중 발생하는 scroll
//         이벤트(scrollY=0 또는 중간 offset)가 좋은 값을 덮어쓰지 못하게 한다.
// 복원: 마운트 시 — 같은 카테고리이고, React Query 캐시(pageCount)가 저장 시점
//       이상으로 로드돼 있을 때만 복원. 가상화 그리드는 레이아웃이 충분히 커지기까지
//       한 틱이 필요하므로, scrollHeight가 목표 offset을 받아들일 수 있을 때까지
//       rAF로 몇 프레임 재시도한다.
// 무효화: 카테고리가 바뀌면 새 카테고리 기준으로 다시 저장됨

const KEY = "showcase-scroll";
const MAX_RESTORE_FRAMES = 10;

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
  // 저장 억제 플래그 — 복원이 확정(완료 또는 포기)되기 전까지 저장하지 않는다.
  // 초기값 true: 마운트 직후 재마운트 scroll(scrollY=0) 이벤트가 좋은 offset을
  // 0으로 덮어쓰지 못하게 한다. 복원 effect가 상황을 판단해 해제한다.
  const suppressSaveRef = useRef(true);

  // ── 마운트 시 Next.js/브라우저 네이티브 스크롤 복원과의 경쟁 제거 ──
  // popstate(뒤로가기) 시 프레임워크가 강제로 0으로 되돌리지 못하게 manual로 전환.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("scrollRestoration" in window.history)
    ) {
      return;
    }
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  // ── 복원: 조건이 충족될 때까지 재시도, 한 번 복원(또는 포기 확정)하면 잠금 ──
  // - 캐시가 비동기로 로드되는 경우(pageCount 0 → N)를 기다린다
  // - 단, 기다리는 동안 사용자가 직접 스크롤하면 복원을 포기한다 (화면 가로채기 방지)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;

    const saved = read();
    // 복원 대상이 아예 없으면 즉시 종료 확정 + 저장 허용
    if (!saved || saved.category !== category || saved.pageCount <= 0) {
      restoredRef.current = true;
      suppressSaveRef.current = false;
      return;
    }

    // 데이터가 충분히 로드됨 → 복원 (단, 사용자가 이미 스크롤했으면 가로채기 방지)
    if (pageCount >= saved.pageCount) {
      restoredRef.current = true;
      if (window.scrollY !== 0) {
        // 사용자가 이미 스크롤함 → 복원 포기, 저장 허용
        suppressSaveRef.current = false;
        return;
      }
      restoreWithRetry(saved.offset, suppressSaveRef);
      return;
    }

    // 데이터를 기다리는 중인데 사용자가 이미 스크롤함 → 복원 포기, 저장 허용
    if (window.scrollY > 0) {
      restoredRef.current = true;
      suppressSaveRef.current = false;
    }
    // else: 다음 pageCount 변경 때 재시도 (그동안 저장은 계속 억제)
  }, [category, pageCount]);

  // ── 저장: 스크롤 시 rAF 쓰로틀 (boolean 플래그 — 동기 rAF 목에서도 안전) ──
  useEffect(() => {
    let pending = false;
    let rafId = 0;
    const onScroll = () => {
      if (suppressSaveRef.current) return; // 복원 확정 전에는 저장하지 않음
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(() => {
        pending = false;
        if (suppressSaveRef.current) return;
        // scrollY===0 저장 스킵: top은 복원할 의미가 없을뿐더러, 다른 페이지로
        // 이동할 때 발생하는 teardown scroll-to-0 이벤트가 직전에 저장된 유의미한
        // offset을 0으로 덮어쓰는 것을 막는다 (뒤로가기 복원 실패의 핵심 원인).
        if (window.scrollY === 0) return;
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

// 레이아웃이 충분히 커질 때까지 instant 스크롤을 여러 프레임에 걸쳐 재시도.
// 복원이 끝나면 suppressSaveRef를 해제해 이후 사용자 스크롤이 저장되게 한다.
// jsdom: scrollHeight가 0이고 rAF가 동기 목이므로, 최대 프레임 escape로 무한루프를 막고
//        최소 1회는 scrollTo를 호출한다 (단위 테스트가 호출을 검증함).
function restoreWithRetry(
  offset: number,
  suppressSaveRef: { current: boolean },
): void {
  const scrollToOffset = () => {
    // 전역 scroll-behavior: smooth가 복원을 애니메이션하지 않도록 instant 강제.
    window.scrollTo({ top: offset, behavior: "instant" as ScrollBehavior });
  };

  const finish = () => {
    // 마지막 보정 후, 다음 틱에 저장 억제 해제 (복원 스크롤 이벤트가 모두 처리된 뒤).
    scrollToOffset();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        suppressSaveRef.current = false;
      });
    } else {
      suppressSaveRef.current = false;
    }
  };

  let frame = 0;
  const tick = () => {
    scrollToOffset();
    frame += 1;

    const tallEnough =
      document.documentElement.scrollHeight >= offset + window.innerHeight;
    if (tallEnough || frame >= MAX_RESTORE_FRAMES) {
      finish();
      return;
    }

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(tick);
    } else {
      finish();
    }
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(tick);
  } else {
    scrollToOffset();
    suppressSaveRef.current = false;
  }
}
