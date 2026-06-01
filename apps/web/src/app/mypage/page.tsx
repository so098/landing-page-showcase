"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getUser, login, subscribe, type User } from "@/lib/auth";

// 진행 단계 정의 — 주문 접수 → AI 생성 완료 → 호스팅/도메인 연결 → 사이트 오픈
const STEPS = ["주문 접수", "AI 생성 완료", "호스팅·도메인 연결 중", "사이트 오픈 완료"] as const;

type Payment = {
  id: string;
  pageName: string;
  amount: number; // 원
  paidAt: string; // 결제일
  step: number; // 1~4, 현재 도달한(또는 완료한) 단계
};

// 목(mock) 결제 내역 — API 연동 시 사용자별 주문 조회로 대체 예정
const MOCK_PAYMENTS: Payment[] = [
  {
    id: "ord-001",
    pageName: "달콤 베이커리 랜딩페이지",
    amount: 10000,
    paidAt: "2026.05.12",
    step: 4, // 사이트 오픈 완료
  },
  {
    id: "ord-002",
    pageName: "포레스트 필라테스 랜딩페이지",
    amount: 50000,
    paidAt: "2026.05.27",
    step: 3, // 호스팅·도메인 연결 중
  },
  {
    id: "ord-003",
    pageName: "온유 한방카페 랜딩페이지",
    amount: 10000,
    paidAt: "2026.05.30",
    step: 2, // AI 생성 완료
  },
];

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setLoaded(true);
    return subscribe(() => setUser(getUser()));
  }, []);

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-5 pb-28">
        {!loaded ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : !user ? (
          <LoggedOut />
        ) : (
          <LoggedIn user={user} />
        )}
      </main>
    </div>
  );
}

/* ── 비로그인 상태 ── */
function LoggedOut() {
  return (
    <div className="py-24 text-center animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-petal/60 text-crimson">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        로그인이 필요해요
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-wine/65">
        로그인하면 결제한 웹페이지와 제작 진행 상황을
        <br className="hidden sm:block" /> 한눈에 확인할 수 있어요.
      </p>
      <button
        type="button"
        onClick={() => login("사장님")}
        className="mt-7 inline-block rounded-full bg-rose-grad px-7 py-3.5 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105"
      >
        로그인하고 시작하기
      </button>
      <p className="mt-4 text-[11px] text-wine/40">
        지금은 데모 단계예요. 버튼을 누르면 체험용 계정으로 로그인됩니다.
      </p>
    </div>
  );
}

/* ── 로그인 상태 ── */
function LoggedIn({ user }: { user: User }) {
  return (
    <>
      {/* 인사 헤더 */}
      <div className="pt-6 animate-fade-up sm:pt-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-rose/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-crimson-deep shadow-soft">
          <span className="h-2 w-2 animate-float rounded-full bg-sun shadow-[0_0_8px_rgba(244,168,44,0.6)]" />
          내정보
        </span>
        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          <span className="text-crimson">{user.name}</span>님, 안녕하세요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-wine/65">
          결제하신 웹페이지와 제작 진행 상황을 확인하세요.
        </p>
      </div>

      {/* 결제한 웹페이지 목록 */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">
            내가 결제한 웹페이지
          </h2>
          <span className="rounded-full bg-petal/60 px-3 py-1 font-display text-xs font-bold text-crimson-deep">
            총 {MOCK_PAYMENTS.length}건
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {MOCK_PAYMENTS.map((p, i) => (
            <PaymentCard key={p.id} payment={p} delay={i * 80} />
          ))}
        </div>
      </section>
    </>
  );
}

/* ── 결제/주문 카드 ── */
function PaymentCard({ payment, delay }: { payment: Payment; delay: number }) {
  const done = payment.step >= STEPS.length;
  return (
    <div
      className="animate-fade-up rounded-3xl border border-rose/15 bg-cream p-6 shadow-soft sm:p-7"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 상단: 페이지명 + 금액/결제일 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-extrabold text-ink">
              {payment.pageName}
            </h3>
            {done ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-grad px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                오픈 완료
              </span>
            ) : (
              <span className="rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-sm">
                진행 중
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-wine/50">결제일 {payment.paidAt}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-display text-2xl font-extrabold text-crimson">
            {payment.amount.toLocaleString("ko-KR")}원
          </p>
          <p className="text-[11px] text-wine/45">결제 금액</p>
        </div>
      </div>

      {/* 진행 단계 스텝퍼 */}
      <div className="mt-6 border-t border-rose/10 pt-6">
        <Stepper current={payment.step} />
      </div>
    </div>
  );
}

/* ── 가로 진행 스텝퍼 ──
   완료 = rose-grad 채움 / 진행 중 = 테두리 강조 / 미진행 = 회색 */
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
                      ? "bg-rose-grad"
                      : "bg-rose/15"
                }`}
              />
              {/* 단계 원 */}
              <div
                className={
                  isDone || reachedEnd
                    ? "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-grad text-white shadow-petal"
                    : isCurrent
                      ? "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-crimson bg-white text-crimson ring-4 ring-crimson/15"
                      : "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-rose/15 bg-white text-wine/35"
                }
              >
                {isDone || reachedEnd ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="font-display text-xs font-bold">{stepNo}</span>
                )}
              </div>
              {/* 오른쪽 연결선 (마지막 단계 제외) */}
              <div
                className={`h-0.5 flex-1 ${
                  isLast
                    ? "opacity-0"
                    : stepNo < current
                      ? "bg-rose-grad"
                      : "bg-rose/15"
                }`}
              />
            </div>
            {/* 단계 라벨 */}
            <span
              className={`mt-2 text-center text-[11px] leading-tight sm:text-xs ${
                stepNo <= current
                  ? "font-semibold text-ink"
                  : "font-medium text-wine/40"
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
