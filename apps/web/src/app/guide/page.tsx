"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

// 이용 안내 — 서비스 흐름을 그림(단계 + 비교 카드)으로 설명하는 페이지
export default function GuidePage() {
  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      {/* ── 타이틀 ── */}
      <section className="mx-auto max-w-3xl px-5 pb-4 pt-8 text-center sm:pt-14">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-rose/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-crimson-deep shadow-soft">
          <span className="h-2 w-2 animate-float rounded-full bg-sun shadow-[0_0_8px_rgba(244,168,44,0.6)]" />
          이용 안내
        </span>
        <h1
          className="mt-6 animate-fade-up font-display text-3xl font-extrabold leading-[1.2] tracking-tight text-ink sm:text-5xl"
          style={{ animationDelay: "80ms" }}
        >
          이 홈페이지의 랜딩페이지는
          <br />
          <span className="text-crimson">AI</span>로 만들어졌습니다
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-wine/70"
          style={{ animationDelay: "160ms" }}
        >
          단돈 <strong className="text-crimson">10,000원</strong>에 퀄리티 좋은 랜딩페이지를
          만들어 드리고, 개별 연락을 드려 호스팅과 도메인 연결까지 도와드려요.
        </p>
      </section>

      {/* ── 단계 플로우 ── */}
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-12">
        <div className="relative flex flex-col gap-0">
          {/* 세로 연결선 */}
          <div className="absolute bottom-12 left-[27px] top-12 w-0.5 bg-gradient-to-b from-rose/40 via-rose/25 to-rose/40 sm:left-[31px]" />

          <Step
            no={1}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            }
            title="디자인 고르고 주문서 작성"
            badge="10,000원"
          >
            쇼케이스에서 마음에 드는 디자인을 고르고 주문서를 작성하면,
            <br className="hidden sm:block" />
            AI가 퀄리티 좋은 랜딩페이지를 만들어 드려요.
          </Step>

          <Arrow />

          <Step
            no={2}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            }
            title="개별 연락 & 사이트 오픈"
          >
            페이지가 완성되면 <strong className="text-ink">개별 연락</strong>을 드려요.
            <br className="hidden sm:block" />
            호스팅과 도메인 연결까지 함께 도와드려서 바로 운영할 수 있어요.
          </Step>

          <Arrow />

          <Step
            no={3}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            title="더 만들고 싶다면 — 추가로 주문하기"
          >
            만들어진 페이지를 보고 더 추가로 만들고 싶으면,
            <br className="hidden sm:block" />
            <strong className="text-crimson">추가로 주문하기</strong>를 클릭하세요. 두 가지 방법 중
            고를 수 있어요.
          </Step>
        </div>
      </section>

      {/* ── 두 가지 방법 비교 ── */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* AI로 만들기 */}
          <PathCard
            emoji="🤖"
            name="AI로 바로 만들기"
            price="50,000원"
            accent="ai"
            steps={["공통 주문서 수정", "[생성] 버튼 클릭", "3~5분이면 완성"]}
            footer="빠르게, 바로 받아보고 싶을 때"
          />

          {/* 사람과 만들기 */}
          <PathCard
            emoji="👤"
            name="사람과 이야기하며 만들기"
            price="300,000원"
            accent="human"
            steps={["공통 주문서 수정", "사람에게 주문하기 클릭", "가능한 시간에 카톡으로 연락", "이야기 나누며 함께 제작"]}
            footer="꼼꼼하게, 상의하며 만들고 싶을 때"
          />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-wine/45">
          두 방법 모두 같은 주문서를 사용해요. AI 선택 시 바로 생성되고, 사람에게 주문하기를
          선택하면 가능한 시간에 카카오톡으로 연락드려요.
        </p>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-3xl px-5 pb-28 text-center">
        <div className="rounded-3xl border border-rose/15 bg-cream p-8 shadow-soft sm:p-12">
          <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            지금 바로 시작해 보세요
          </h2>
          <p className="mt-3 text-sm text-wine/65">
            첫 랜딩페이지는 단돈 <strong className="text-crimson">10,000원</strong>이에요.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/showcase"
              className="rounded-full border border-rose/25 bg-white px-7 py-3.5 text-sm font-bold text-crimson transition-all hover:border-rose hover:shadow-petal"
            >
              디자인 둘러보기
            </Link>
            <Link
              href="/order"
              className="rounded-full bg-rose-grad px-7 py-3.5 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105"
            >
              주문하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── 플로우 단계 카드 ── */
function Step({
  no,
  icon,
  title,
  badge,
  children,
}: {
  no: number;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-start gap-5 sm:gap-7">
      {/* 번호 + 아이콘 */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-grad text-white shadow-petal sm:h-16 sm:w-16">
          {icon}
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 rounded-3xl border border-rose/15 bg-cream p-5 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-display text-xs font-bold text-wine/40">STEP {no}</span>
          {badge && (
            <span className="rounded-full bg-sun px-2.5 py-0.5 font-display text-xs font-extrabold text-ink shadow-sm">
              {badge}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-display text-lg font-extrabold leading-snug text-ink sm:text-xl">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-wine/65">{children}</p>
      </div>
    </div>
  );
}

/* ── 단계 사이 화살표 ── */
function Arrow() {
  return (
    <div className="relative z-10 flex justify-center py-3 pl-14 sm:pl-16">
      <svg className="text-rose/50" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    </div>
  );
}

/* ── 추가 주문 방법 비교 카드 ── */
function PathCard({
  emoji,
  name,
  price,
  accent,
  steps,
  footer,
}: {
  emoji: string;
  name: string;
  price: string;
  accent: "ai" | "human";
  steps: string[];
  footer: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-3xl border p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-petalHover sm:p-8 ${
        accent === "ai"
          ? "border-crimson/30 bg-white ring-1 ring-crimson/10"
          : "border-rose/15 bg-cream"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{emoji}</span>
        {accent === "ai" && (
          <span className="rounded-full bg-sun px-2.5 py-0.5 text-[10px] font-bold text-ink shadow-sm">
            빠른 제작
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-xl font-extrabold text-ink">{name}</h3>
      <p className="mt-1 font-display text-3xl font-extrabold text-crimson">{price}</p>

      {/* 미니 플로우 */}
      <div className="mt-6 flex flex-col">
        {steps.map((s, i) => (
          <div key={s}>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold ${
                  accent === "ai" ? "bg-rose-grad text-white" : "bg-ink text-white"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-sm font-medium text-wine/75">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="ml-3 h-5 w-px bg-rose/25" />
            )}
          </div>
        ))}
      </div>

      <p className="mt-7 border-t border-rose/10 pt-4 text-xs text-wine/50">{footer}</p>
    </div>
  );
}
