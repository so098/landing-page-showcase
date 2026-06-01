"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Showcase } from "@melstudio/shared";
import { useShowcaseBySlug } from "@/lib/queries";
import { loadOrder, type SavedOrderState } from "@/lib/orderStorage";
import SiteHeader from "@/components/SiteHeader";
import PagePreview from "@/components/PagePreview";

// 생성 결과 — 목(mock)으로 만들어진 랜딩페이지를 보여주고
// 수정하기 / 추가로 만들기로 이어지는 페이지.
export default function OrderResultPage() {
  const [order, setOrder] = useState<SavedOrderState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrder(loadOrder());
    setLoaded(true);
  }, []);

  // 쇼케이스를 골라서 주문한 경우 해당 디자인을 사용
  const { showcase: fetched } = useShowcaseBySlug(order?.showcaseId ?? "");

  // 디자인 미선택 주문이면 주문서 내용으로 목 쇼케이스 구성
  const generated: Showcase | null = useMemo(() => {
    if (!order) return null;
    if (fetched) return fetched;
    return {
      id: "generated",
      title: order.form.businessName || "내 랜딩페이지",
      blurb: order.form.targetMessage || order.purpose || "AI가 만든 랜딩페이지",
      category: order.form.industry || "brand",
      accent: "#E11D48",
      layout: "hero",
      desktop: null,
      mobile: null,
      thumb: null,
    };
  }, [order, fetched]);

  // 추가로 만들기 클릭 → 선택 영역으로 스크롤
  useEffect(() => {
    if (showMore) {
      moreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showMore]);

  const editHref = order?.showcaseId ? `/order/${order.showcaseId}?edit=1` : "/order?edit=1";

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-28">
        {!loaded ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : !order || !generated ? (
          /* 주문 내역 없음 */
          <div className="py-24 text-center">
            <p className="text-wine/60">아직 생성된 페이지가 없어요.</p>
            <Link
              href="/order"
              className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-crimson"
            >
              주문서 작성하러 가기
            </Link>
          </div>
        ) : (
          <>
            {/* ── 완료 헤더 ── */}
            <div className="animate-fade-up pt-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-rose/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-crimson-deep shadow-soft">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                생성 완료
              </span>
              <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                <span className="text-crimson">{order.form.businessName}</span>의
                <br className="sm:hidden" /> 랜딩페이지가 완성되었어요
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-wine/65">
                개별 연락을 드려 호스팅과 도메인 연결까지 도와드릴게요.
              </p>
            </div>

            {/* ── 생성된 페이지 미리보기 ── */}
            <section className="mt-10 animate-fade-up rounded-3xl border border-rose/15 bg-cream p-5 shadow-petal sm:p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                {/* 데스크탑 */}
                <div className="flex-1">
                  <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-wine/45">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="13" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                    데스크탑
                  </div>
                  <div className="overflow-hidden rounded-xl border border-rose/15 bg-white shadow-petal">
                    <div className="flex items-center gap-1.5 border-b border-rose/10 bg-petalSoft/60 px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose/40" />
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-light/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-soft/60" />
                      <span className="ml-3 flex-1 truncate rounded-full bg-white/70 px-3 py-1 text-[11px] text-wine/40">
                        https://{order.form.businessName || "my-page"}.com
                      </span>
                    </div>
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-white">
                      <PagePreview item={generated} variant="desktop" priority />
                    </div>
                  </div>
                </div>

                {/* 모바일 */}
                <div className="flex flex-shrink-0 flex-col items-center lg:w-[230px]">
                  <div className="mb-2.5 flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-wider text-wine/45 lg:self-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="7" y="2" width="10" height="20" rx="2.5" />
                      <path d="M11 18h2" />
                    </svg>
                    모바일
                  </div>
                  <div className="relative w-[200px] rounded-[2rem] border-[6px] border-ink bg-ink p-0 shadow-petal">
                    <div className="absolute left-1/2 top-2 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/20" />
                    <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[1.5rem] bg-white">
                      <PagePreview item={generated} variant="mobile" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 액션 버튼 ── */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={editHref}
                className="w-full rounded-full border border-rose/25 bg-white px-8 py-3.5 text-center text-sm font-bold text-crimson transition-all hover:border-rose hover:shadow-petal sm:w-auto"
              >
                수정하기
              </Link>
              <button
                type="button"
                onClick={() => setShowMore(true)}
                className="w-full rounded-full bg-rose-grad px-8 py-3.5 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105 sm:w-auto"
              >
                추가로 만들기
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-wine/45">
              수정하기 — 주문서를 고쳐서 다시 생성해요 · 추가로 만들기 — 새 페이지를 더 만들어요
            </p>

            {/* ── 추가로 만들기: 방법 선택 ── */}
            {showMore && (
              <section ref={moreRef} className="mt-16 scroll-mt-8 animate-fade-up">
                <h2 className="text-center font-display text-2xl font-extrabold text-ink">
                  어떻게 만들까요?
                </h2>
                <p className="mt-2 text-center text-sm text-wine/60">
                  주문서 내용은 그대로 가져가요. 원하는 방법을 골라주세요.
                </p>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  {/* AI로 만들기 */}
                  <div className="flex flex-col rounded-3xl border border-crimson/30 bg-white p-7 shadow-soft ring-1 ring-crimson/10 sm:p-8">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">🤖</span>
                      <span className="rounded-full bg-sun px-2.5 py-0.5 text-[10px] font-bold text-ink shadow-sm">
                        빠른 제작
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-xl font-extrabold text-ink">
                      AI로 바로 만들기
                    </h3>
                    <p className="mt-1 font-display text-3xl font-extrabold text-crimson">
                      50,000원
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-wine/65">
                      주문서를 수정하고 <strong className="text-ink">생성하기</strong>를 누르면
                      3~5분 안에 완성돼요.
                    </p>
                    <Link
                      href="/order?edit=1&mode=ai"
                      className="mt-6 rounded-full bg-rose-grad px-6 py-3 text-center text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105"
                    >
                      AI로 만들기
                    </Link>
                  </div>

                  {/* 사람과 만들기 */}
                  <div className="flex flex-col rounded-3xl border border-rose/15 bg-cream p-7 shadow-soft sm:p-8">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">👤</span>
                    </div>
                    <h3 className="mt-4 font-display text-xl font-extrabold text-ink">
                      사람과 이야기하며 만들기
                    </h3>
                    <p className="mt-1 font-display text-3xl font-extrabold text-crimson">
                      300,000원
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-wine/65">
                      주문서를 수정해 보내주시면, 가능한 시간에{" "}
                      <strong className="text-ink">카카오톡</strong>으로 연락드려서 함께 만들어요.
                    </p>
                    <Link
                      href="/order?edit=1&mode=human"
                      className="mt-6 rounded-full bg-ink px-6 py-3 text-center text-sm font-bold text-white transition-all hover:bg-crimson"
                    >
                      사람에게 주문하기
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
