"use client";

import { useMemo, useState } from "react";
import { SHOWCASES } from "@/data/showcase";
import type { CategoryId, Showcase } from "@/data/showcase";
import TagBar from "@/components/TagBar";
import ShowcaseGrid from "@/components/ShowcaseGrid";
import PreviewModal from "@/components/PreviewModal";

export default function Home() {
  const [active, setActive] = useState<CategoryId>("all");
  const [selected, setSelected] = useState<Showcase | null>(null);

  const filtered = useMemo(
    () =>
      active === "all"
        ? SHOWCASES
        : SHOWCASES.filter((s) => s.category === active),
    [active],
  );

  return (
    <div className="relative z-10 min-h-screen">
      {/* ── 헤더 ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-grad text-white shadow-petal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
            </svg>
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">
            멜스튜디오<span className="text-crimson">.</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-wine/60 sm:flex">
          <a href="#showcase" className="transition-colors hover:text-crimson">
            쇼케이스
          </a>
          <a href="#" className="transition-colors hover:text-crimson">
            요금
          </a>
          <a
            href="#"
            className="rounded-full bg-ink px-4 py-2 text-white transition-all hover:bg-crimson"
          >
            제작 문의
          </a>
        </nav>
      </header>

      {/* ── 히어로 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-10 text-center sm:pt-16">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-rose/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-crimson-deep shadow-soft">
          <span className="h-2 w-2 animate-float rounded-full bg-sun shadow-[0_0_8px_rgba(244,168,44,0.6)]" />
          업종별 랜딩페이지 큐레이션
        </span>

        <h1
          className="mx-auto mt-7 max-w-3xl animate-fade-up font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          내 사업을 홍보할
          <br />
          <span className="text-crimson">웹사이트</span>를 찾으시나요?
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-wine/70 sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          카페부터 병원까지, 업종 태그를 고르면 어울리는 디자인을 보여드려요.
          <br className="hidden sm:block" />
          마음에 드는 페이지를 데스크탑·모바일로 바로 미리보세요.
        </p>

        <div
          className="mt-8 flex animate-fade-up items-center justify-center gap-6 text-sm text-wine/50"
          style={{ animationDelay: "240ms" }}
        >
          <span>
            <strong className="font-display text-lg font-bold text-crimson">
              {SHOWCASES.length}
            </strong>{" "}
            개의 디자인
          </span>
          <span className="h-4 w-px bg-rose/20" />
          <span>
            <strong className="font-display text-lg font-bold text-crimson">8</strong>{" "}
            개 업종
          </span>
        </div>
      </section>

      {/* ── 태그 + 쇼케이스 ── */}
      <section
        id="showcase"
        className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-24"
      >
        <div className="sticky top-0 z-30 -mx-5 mb-10 bg-blush/70 px-5 py-4 backdrop-blur-md">
          <TagBar active={active} onChange={setActive} />
        </div>

        <ShowcaseGrid items={filtered} onOpen={setSelected} />
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-rose/10 bg-cream/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-wine/50 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-grad text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
              </svg>
            </span>
            <span className="font-display font-bold text-ink">멜스튜디오</span>
          </div>
          <p>© 2026 멜스튜디오. 업종별 랜딩페이지 쇼케이스.</p>
        </div>
      </footer>

      {/* ── 미리보기 모달 ── */}
      <PreviewModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
