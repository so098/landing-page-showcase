"use client";

import { useCallback, useEffect, useState } from "react";
import ReviewModal from "@/components/ReviewModal";
import Toast from "@/components/Toast";
import { getUser, startLogin, subscribe, getEnabledProviders, type User } from "@/lib/auth";
import { fetchMyOrders } from "@/lib/api";
import type { OAuthProviderName, OrderSummary } from "@melstudio/shared";

// 진행 단계 정의 — 주문 접수 → AI 생성 완료 → 호스팅/도메인 연결 → 사이트 오픈
const STEPS = ["주문 접수", "AI 생성 완료", "호스팅·도메인 연결 중", "사이트 오픈 완료"] as const;

// 결제일 표시 — ISO 8601 → "2026.05.12". 미결제(null)는 "-".
function formatPaidAt(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setLoaded(true);
    return subscribe(() => setUser(getUser()));
  }, []);

  return (
    <>
        {!loaded ? (
          <p className="py-24 text-center text-ink-muted/50">불러오는 중…</p>
        ) : !user ? (
          <LoggedOut />
        ) : (
          <LoggedIn user={user} />
        )}
    </>
  );
}

/* ── 비로그인 상태 ── */
function LoggedOut() {
  const [enabled, setEnabled] = useState<OAuthProviderName[]>([]);

  // 설정된 provider 목록 조회 → 미설정 버튼 비활성.
  useEffect(() => {
    let active = true;
    getEnabledProviders().then((p) => {
      if (active) setEnabled(p);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="py-24 text-center animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-divider/60 text-accent">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        로그인이 필요해요
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted/65">
        로그인하면 결제한 웹페이지와 제작 진행 상황을
        <br className="hidden sm:block" /> 한눈에 확인할 수 있어요.
      </p>
      <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => startLogin("kakao")}
          disabled={!enabled.includes("kakao")}
          className="rounded-full bg-[#FEE500] px-7 py-3.5 text-sm font-bold text-[#191600] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
        >
          카카오로 시작하기
        </button>
        <button
          type="button"
          onClick={() => startLogin("google")}
          disabled={!enabled.includes("google")}
          className="rounded-full border border-hairline bg-white px-7 py-3.5 text-sm font-bold text-ink transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
        >
          구글로 시작하기
        </button>
      </div>
      {enabled.length === 0 && (
        <p className="mt-4 text-[11px] text-ink-muted/40">
          소셜 로그인 준비 중이에요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}

/* ── 로그인 상태 ── */
function LoggedIn({ user }: { user: User }) {
  // 리뷰 작성 대상 주문(모달 open 여부 겸용) — null이면 모달 닫힘
  const [reviewTarget, setReviewTarget] = useState<OrderSummary | null>(null);
  // 감사 토스트 표시 여부
  const [showThanks, setShowThanks] = useState(false);
  // 실데이터 주문 목록
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  // 내 주문/결제 내역을 서버에서 불러온다.
  useEffect(() => {
    let active = true;
    fetchMyOrders()
      .then((list) => {
        if (active) setOrders(list);
      })
      .catch(() => {
        if (active) setOrders([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // 제출 성공 → 모달 닫고 감사 토스트. onSuccess는 ReviewForm effect에서
  // 호출되므로 안정적인 참조가 되도록 useCallback으로 고정한다.
  const handleSubmitted = useCallback(() => {
    setReviewTarget(null);
    setShowThanks(true);
  }, []);

  return (
    <>
      {/* 인사 헤더 */}
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-4 py-1.5 text-xs font-semibold text-accent-deep">
          <span className="h-2 w-2 rounded-full bg-accent" />
          내정보
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-normal text-ink sm:text-3xl">
          <span className="text-accent">{user.name}</span>님, 안녕하세요
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted/65 sm:text-sm">
          결제하신 웹페이지와 제작 진행 상황을 확인하세요.
        </p>
      </div>

      {/* 결제한 웹페이지 목록 */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">
            내가 결제한 웹페이지
          </h2>
          {orders && (
            <span className="rounded-full bg-divider/60 px-3 py-1 font-display text-xs font-bold text-accent-deep">
              총 {orders.length}건
            </span>
          )}
        </div>

        {orders === null ? (
          <p className="mt-8 text-center text-sm text-ink-muted/50">불러오는 중…</p>
        ) : orders.length === 0 ? (
          <p className="mt-8 text-center text-sm text-ink-muted/55">
            아직 결제한 웹페이지가 없어요.
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-5">
            {orders.map((o, i) => (
              <PaymentCard
                key={o.id}
                order={o}
                delay={i * 80}
                onWriteReview={() => setReviewTarget(o)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 리뷰 작성 모달 — 대상 주문이 선택됐을 때만 연다 */}
      <ReviewModal
        open={reviewTarget !== null}
        pageName={reviewTarget?.orderName ?? ""}
        authorName={user.name}
        onClose={() => setReviewTarget(null)}
        onSubmitted={handleSubmitted}
      />

      {/* 제출 완료 감사 토스트 */}
      {showThanks && (
        <Toast
          message="리뷰를 작성해주셔서 감사합니다"
          onDismiss={() => setShowThanks(false)}
        />
      )}
    </>
  );
}

/* ── 결제/주문 카드 ── */
function PaymentCard({
  order,
  delay,
  onWriteReview,
}: {
  order: OrderSummary;
  delay: number;
  onWriteReview: () => void;
}) {
  const done = order.step >= STEPS.length;
  return (
    <div
      className="animate-fade-up rounded-[18px] border border-accent/15 bg-pearl p-5 shadow-soft sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 상단: 페이지명 + 금액/결제일 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink">
              {order.orderName}
            </h3>
            {done ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-grad px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                오픈 완료
              </span>
            ) : order.status === "REFUNDED" ? (
              <span className="rounded-full bg-ink-muted/40 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                환불됨
              </span>
            ) : order.status === "PENDING" ? (
              <span className="rounded-full bg-ink-muted/30 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                결제 대기
              </span>
            ) : (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                진행 중
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-muted/50">결제일 {formatPaidAt(order.paidAt)}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-display text-xl font-bold text-accent">
            {order.amount.toLocaleString("ko-KR")}원
          </p>
          <p className="text-[11px] text-ink-muted/45">결제 금액</p>
        </div>
      </div>

      {/* 진행 단계 스텝퍼 */}
      <div className="mt-5 border-t border-accent/10 pt-5">
        <Stepper current={order.step} />
      </div>

      {/* 리뷰 작성 버튼 — 사이트 오픈이 완료된 주문에만 노출한다.
          (제작이 끝나야 후기를 남기는 게 자연스러우므로 진행 중 주문엔 숨김) */}
      {done && (
        <div className="mt-5 flex justify-end border-t border-accent/10 pt-4">
          <button
            type="button"
            onClick={onWriteReview}
            className="inline-flex items-center gap-2 rounded-full bg-accent-grad px-5 py-2 text-xs font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
            </svg>
            리뷰 작성
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 가로 진행 스텝퍼 ──
   완료 = accent-grad 채움 / 진행 중 = 테두리 강조 / 미진행 = 회색 */
function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => {
        const stepNo = i + 1;
        const isDone = stepNo < current;
        const isCurrent = stepNo === current;
        const isLast = i === STEPS.length - 1;
        // 마지막 단계까지 도달했으면 그 단계도 "완료"로 처리
        const reachedEnd = current >= STEPS.length && isLast;

        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* 왼쪽 연결선 (첫 단계 제외) */}
              <div
                className={`h-0.5 flex-1 ${
                  i === 0
                    ? "opacity-0"
                    : stepNo <= current
                      ? "bg-accent-grad"
                      : "bg-accent/15"
                }`}
              />
              {/* 단계 원 */}
              <div
                className={
                  isDone || reachedEnd
                    ? "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-grad text-white shadow-petal"
                    : isCurrent
                      ? "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-accent bg-white text-accent ring-4 ring-accent/15"
                      : "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-accent/15 bg-white text-ink-muted/35"
                }
              >
                {isDone || reachedEnd ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="font-display text-[11px] font-bold">{stepNo}</span>
                )}
              </div>
              {/* 오른쪽 연결선 (마지막 단계 제외) */}
              <div
                className={`h-0.5 flex-1 ${
                  isLast
                    ? "opacity-0"
                    : stepNo < current
                      ? "bg-accent-grad"
                      : "bg-accent/15"
                }`}
              />
            </div>
            {/* 단계 라벨 */}
            <span
              className={`mt-2 text-center text-[10px] leading-tight sm:text-[11px] ${
                stepNo <= current
                  ? "font-semibold text-ink"
                  : "font-medium text-ink-muted/40"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
