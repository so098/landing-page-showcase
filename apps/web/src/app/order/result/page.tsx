"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Showcase } from "@melstudio/shared";
import { useShowcaseBySlug } from "@/lib/queries";
import {
  loadOrder,
  getRemainingEdits,
  consumeEdit,
  saveRefund,
  getRefund,
  EDIT_LIMIT,
  type SavedOrderState,
  type RefundState,
} from "@/lib/orderStorage";
import { openChat } from "@/lib/chat";
import SiteHeader from "@/components/SiteHeader";
import PagePreview from "@/components/PagePreview";
import RefundModal from "@/components/RefundModal";
import Toast from "@/components/Toast";

type ModalKind = null | "complete" | "editChoice" | "moreChoice";

// 생성 결과 — 목(mock)으로 만들어진 랜딩페이지를 보여주고
// 수정하기(AI/사람) / 추가로 만들기 / 이대로 완료하기로 이어지는 페이지.
export default function OrderResultPage() {
  const router = useRouter();
  const [order, setOrder] = useState<SavedOrderState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editsLeft, setEditsLeft] = useState(EDIT_LIMIT);
  // 환불 모달 열림 여부 + 환불 결과(목). refund가 채워지면 "환불 완료" 상태로 본다.
  const [refundOpen, setRefundOpen] = useState(false);
  const [refund, setRefund] = useState<RefundState | null>(null);
  // 환불 완료 토스트 표시 여부
  const [showRefunded, setShowRefunded] = useState(false);

  useEffect(() => {
    setOrder(loadOrder());
    setEditsLeft(getRemainingEdits());
    setRefund(getRefund());
    setLoaded(true);
  }, []);

  // 환불 확정(목) — 결제가 목 단계라 실제 환불 API는 호출하지 않고 sessionStorage에만 기록한다.
  // 실제 환불 처리는 5순위 결제 연동 시 백엔드 API와 함께 붙인다.
  function handleRefund(reason: string) {
    setRefund(saveRefund(reason));
    setRefundOpen(false);
    setShowRefunded(true);
  }

  // 수정 1회 사용 (AI/사람 공통) — 차감 후 다음 동작 실행
  function spendEdit(after: () => void) {
    if (editsLeft <= 0) return;
    setEditsLeft(consumeEdit());
    after();
  }

  // 모달 ESC 닫기 + 스크롤 잠금
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modal]);

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

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-28">
        {!loaded ? (
          <p className="py-24 text-center text-ink-muted/50">불러오는 중…</p>
        ) : !order || !generated ? (
          /* 주문 내역 없음 */
          <div className="py-24 text-center">
            <p className="text-ink-muted/60">아직 생성된 페이지가 없어요.</p>
            <Link
              href="/order"
              className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent"
            >
              주문서 작성하러 가기
            </Link>
          </div>
        ) : (
          <>
            {/* ── 완료 헤더 ── */}
            <div className="animate-fade-up pt-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-accent-deep shadow-soft">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                생성 완료
              </span>
              <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                <span className="text-accent">{order.form.businessName}</span>의
                <br className="sm:hidden" /> 랜딩페이지가 완성되었어요
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted/65">
                개별 연락을 드려 호스팅과 도메인 연결까지 도와드릴게요.
              </p>
            </div>

            {/* ── 생성된 페이지 미리보기 ── */}
            <section className="mt-10 animate-fade-up rounded-3xl border border-accent/15 bg-pearl p-5 shadow-petal sm:p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                {/* 데스크탑 */}
                <div className="flex-1">
                  <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted/45">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="13" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                    데스크탑
                  </div>
                  <div className="overflow-hidden rounded-xl border border-accent/15 bg-white shadow-petal">
                    <div className="flex items-center gap-1.5 border-b border-accent/10 bg-canvas/60 px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-accent/40" />
                      <span className="h-2.5 w-2.5 rounded-full bg-accent-sky/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-chip/60" />
                      <span className="ml-3 flex-1 truncate rounded-full bg-white/70 px-3 py-1 text-[11px] text-ink-muted/40">
                        https://{order.form.businessName || "my-page"}.com
                      </span>
                    </div>
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-white">
                      <PagePreview item={generated} variant="desktop" priority interactive />
                    </div>
                  </div>
                </div>

                {/* 모바일 */}
                <div className="flex flex-shrink-0 flex-col items-center lg:w-[230px]">
                  <div className="mb-2.5 flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-wider text-ink-muted/45 lg:self-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="7" y="2" width="10" height="20" rx="2.5" />
                      <path d="M11 18h2" />
                    </svg>
                    모바일
                  </div>
                  <div className="relative w-[200px] rounded-[2rem] border-[6px] border-ink bg-ink p-0 shadow-petal">
                    <div className="absolute left-1/2 top-2 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/20" />
                    <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[1.5rem] bg-white">
                      <PagePreview item={generated} variant="mobile" interactive />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {refund ? (
              /* ── 환불 완료 상태 ── 환불 후엔 액션 버튼 대신 안내 배너를 보여 재환불을 막는다 */
              <div className="mt-8 animate-fade-up rounded-3xl border border-accent/15 bg-white/70 p-6 text-center shadow-soft sm:p-7">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-divider/60 text-accent">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 109-9 9 9 0 00-6.36 2.64L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </div>
                <h2 className="mt-4 font-display text-xl font-extrabold text-ink">
                  환불이 접수되었어요
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted/65">
                  남겨주신 사유 “<span className="text-accent">{refund.reason}</span>”를 확인해
                  <br className="hidden sm:block" /> 빠르게 환불 처리해드릴게요.
                </p>
              </div>
            ) : (
              <>
                {/* ── 액션 버튼 ── */}
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setModal("editChoice")}
                    disabled={editsLeft <= 0}
                    className={`w-full rounded-full border px-8 py-3.5 text-center text-sm font-bold transition-all sm:w-auto ${
                      editsLeft > 0
                        ? "border-accent/25 bg-white text-accent hover:border-accent hover:shadow-petal"
                        : "cursor-not-allowed border-accent/15 bg-white/60 text-ink-muted/30"
                    }`}
                  >
                    수정하기{" "}
                    <span className={editsLeft > 0 ? "text-ink-muted/40" : ""}>
                      ({editsLeft}회 남음)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal("moreChoice")}
                    className="w-full rounded-full bg-ink px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-accent sm:w-auto"
                  >
                    추가로 만들기
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal("complete")}
                    className="w-full rounded-full bg-accent-grad px-8 py-3.5 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105 sm:w-auto"
                  >
                    이대로 완료하기
                  </button>
                </div>
                <p className="mt-4 text-center text-xs text-ink-muted/45">
                  수정하기 — AI 또는 사람과 함께 수정 (총 {EDIT_LIMIT}회, 1회 수정 시 1회 차감) ·
                  추가로 만들기 — 새 페이지를 더 제작 · 이대로 완료하기 — 이 페이지로 확정
                </p>

                {/* 환불하기 — 파괴적 액션이라 다른 액션과 분리하고 절제된 보조(텍스트) 스타일로 둔다 */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setRefundOpen(true)}
                    className="text-xs font-semibold text-ink-muted/45 underline underline-offset-2 transition-colors hover:text-accent"
                  >
                    환불하기
                  </button>
                </div>
              </>
            )}

            {/* ══ 모달들 ══ */}
            {modal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in sm:p-6"
                role="dialog"
                aria-modal="true"
              >
                {/* 백드롭 */}
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  aria-label="닫기"
                  className="absolute inset-0 cursor-default bg-ink-muted/55 backdrop-blur-md"
                />

                {/* ── 이대로 완료하기 모달 ── */}
                {modal === "complete" && (
                  <div className="relative z-10 w-full max-w-md animate-modal-in rounded-3xl border border-white/40 bg-pearl p-8 text-center shadow-petalHover sm:p-10">
                    <CloseX onClick={() => setModal(null)} />
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-grad text-white shadow-petal">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <h2 className="mt-6 font-display text-2xl font-extrabold text-ink">
                      주문이 완료되었어요
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-ink-muted/70">
                      도메인과 호스팅 연결은
                      <br />
                      <strong className="text-accent">채팅</strong>으로 바로 도와드릴게요.
                    </p>
                    <Link
                      href="/guide#faq"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-muted/55 underline underline-offset-2 transition-colors hover:text-accent"
                    >
                      도메인과 호스팅이란?
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setModal(null);
                          openChat({
                            greeting: `[이대로 완료하기]를 선택하셨습니다.\n${order.form.businessName} 페이지의 도메인·호스팅 연결을 도와드릴게요. 원하시는 도메인 주소가 있다면 말씀해 주세요!`,
                          });
                        }}
                        className="w-full rounded-full bg-accent-grad px-6 py-3 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105 sm:w-auto"
                      >
                        채팅으로 안내받기
                      </button>
                      <Link
                        href="/"
                        className="w-full rounded-full border border-accent/25 bg-white px-6 py-3 text-sm font-semibold text-ink-muted/70 transition-all hover:border-accent hover:text-accent sm:w-auto"
                      >
                        홈으로 가기
                      </Link>
                    </div>
                  </div>
                )}

                {/* ── 수정 방법 선택 모달 ── */}
                {modal === "editChoice" && (
                  <div className="relative z-10 w-full max-w-2xl animate-modal-in rounded-3xl border border-white/40 bg-pearl p-7 shadow-petalHover sm:p-9">
                    <CloseX onClick={() => setModal(null)} />
                    <h2 className="text-center font-display text-2xl font-extrabold text-ink">
                      어떻게 수정할까요?
                    </h2>
                    <p className="mt-3 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-divider/40 px-4 py-1.5 text-xs font-semibold text-accent-deep">
                        수정은 총 {EDIT_LIMIT}회까지 — 현재{" "}
                        <strong className="font-display text-sm">{editsLeft}회</strong> 남았어요
                        (수정할 때마다 1회 차감)
                      </span>
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {/* AI 수정 */}
                      <button
                        type="button"
                        onClick={() => spendEdit(() => router.push("/order/edit"))}
                        className="group flex flex-col rounded-2xl border border-accent/30 bg-white p-6 text-left shadow-soft ring-1 ring-accent/10 transition-all hover:-translate-y-1 hover:shadow-petalHover"
                      >
                        <span className="text-2xl">🤖</span>
                        <span className="mt-3 font-display text-lg font-extrabold text-ink">
                          AI가 2~3분 만에 수정하기
                        </span>
                        <span className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted/60">
                          어느 부분을 수정할지 선택하고, 직접 AI에게 말해가며 수정할 수 있어요.
                        </span>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent">
                          바로 수정하러 가기
                          <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>

                      {/* 사람 수정 → 모달 닫고 채팅창 열기 */}
                      <button
                        type="button"
                        onClick={() =>
                          spendEdit(() => {
                            setModal(null);
                            openChat({
                              greeting: `[수정하기]를 선택하셨습니다.\n${order.form.businessName} 페이지의 어떤 부분을 수정하고 싶으신지 말씀해 주세요. 담당자가 확인하는 대로 답장드릴게요 😊`,
                            });
                          })
                        }
                        className="group flex flex-col rounded-2xl border border-accent/15 bg-white/70 p-6 text-left shadow-soft transition-all hover:-translate-y-1 hover:shadow-petal"
                      >
                        <span className="text-2xl">👤</span>
                        <span className="mt-3 font-display text-lg font-extrabold text-ink">
                          사람에게 말해가며 수정하기
                        </span>
                        <span className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted/60">
                          담당자와 채팅으로 이야기 나누며 꼼꼼하게 수정해요.
                        </span>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ink-muted/70 group-hover:text-accent">
                          채팅으로 수정 요청하기
                          <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── 추가로 만들기: 방법 선택 모달 ── */}
                {modal === "moreChoice" && (
                  <div className="relative z-10 w-full max-w-2xl animate-modal-in rounded-3xl border border-white/40 bg-pearl p-7 shadow-petalHover sm:p-9">
                    <CloseX onClick={() => setModal(null)} />
                    <h2 className="text-center font-display text-2xl font-extrabold text-ink">
                      어떻게 만들까요?
                    </h2>
                    <p className="mt-2 text-center text-sm text-ink-muted/60">
                      주문서 내용은 그대로 가져가요. 원하는 방법을 골라주세요.
                    </p>
                    <div className="mt-7 grid gap-4 sm:grid-cols-2">
                      {/* AI로 만들기 */}
                      <button
                        type="button"
                        onClick={() => router.push("/order?edit=1&mode=ai")}
                        className="group flex flex-col rounded-2xl border border-accent/30 bg-white p-6 text-left shadow-soft ring-1 ring-accent/10 transition-all hover:-translate-y-1 hover:shadow-petalHover"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">🤖</span>
                          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            빠른 제작
                          </span>
                        </div>
                        <span className="mt-3 font-display text-lg font-extrabold text-ink">
                          AI로 바로 만들기
                        </span>
                        <span className="mt-1 font-display text-2xl font-extrabold text-accent">
                          50,000원
                        </span>
                        <span className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted/60">
                          주문서를 수정하고 생성하기를 누르면 3~5분 안에 완성돼요.
                        </span>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent">
                          AI로 만들기
                          <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>

                      {/* 사람과 만들기 */}
                      <button
                        type="button"
                        onClick={() => router.push("/order?edit=1&mode=human")}
                        className="group flex flex-col rounded-2xl border border-accent/15 bg-white/70 p-6 text-left shadow-soft transition-all hover:-translate-y-1 hover:shadow-petal"
                      >
                        <span className="text-2xl">👤</span>
                        <span className="mt-3 font-display text-lg font-extrabold text-ink">
                          사람과 이야기하며 만들기
                        </span>
                        <span className="mt-1 font-display text-2xl font-extrabold text-accent">
                          300,000원
                        </span>
                        <span className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted/60">
                          주문서를 보내주시면 가능한 시간에 카카오톡으로 연락드려서 함께 만들어요.
                        </span>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ink-muted/70 group-hover:text-accent">
                          사람에게 주문하기
                          <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 환불 확인 모달 ── 자체 셸(백드롭/스크롤 락)을 가지므로 위 모달 묶음과 별도로 렌더한다 */}
            <RefundModal
              open={refundOpen}
              pageName={order.form.businessName || "내 랜딩페이지"}
              onClose={() => setRefundOpen(false)}
              onConfirm={handleRefund}
            />

            {/* 환불 완료 토스트 */}
            {showRefunded && (
              <Toast
                message="환불 요청이 접수되었어요"
                onDismiss={() => setShowRefunded(false)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ── 모달 닫기(X) 버튼 ── */
function CloseX({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="닫기"
      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-accent/20 bg-white text-ink-muted/60 transition-all hover:rotate-90 hover:border-accent hover:text-accent"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
