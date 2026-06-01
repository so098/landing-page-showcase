"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  OrderInputSchema,
  type OrderInput,
  type Plan,
} from "@/lib/order";
import { useShowcaseBySlug, useCategories } from "@/lib/queries";
import PagePreview from "@/components/PagePreview";

type PlanDef = {
  id: Plan;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  featured?: boolean;
};

const PLAN_DEFS: PlanDef[] = [
  {
    id: "basic",
    name: "베이직",
    price: 490000,
    tagline: "한 장으로 충분한 기본형",
    features: ["기본 1페이지 제작", "선택한 디자인 적용", "문의 폼 연결", "7일 제작"],
  },
  {
    id: "pro",
    name: "프로",
    price: 890000,
    tagline: "검색·모바일까지 챙기는 실전형",
    features: [
      "반응형 최적화",
      "SEO 기본 세팅",
      "방문 분석 연동",
      "콘텐츠 2회 수정",
    ],
    featured: true,
  },
  {
    id: "premium",
    name: "프리미엄",
    price: 1490000,
    tagline: "다국어·유지보수까지 한 번에",
    features: [
      "다국어 페이지(2개 언어)",
      "3개월 유지보수",
      "맞춤 애니메이션",
      "우선 응대",
    ],
  },
];

const won = (n: number) => `${(n / 10000).toLocaleString("ko-KR")}만원`;

export default function OrderPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { showcase, isLoading, isError } = useShowcaseBySlug(slug);
  const categoriesQuery = useCategories();

  const categoryLabel = useMemo(() => {
    if (!showcase) return "";
    const cat = categoriesQuery.data?.find((c) => c.id === showcase.category);
    return cat?.label ?? showcase.category;
  }, [categoriesQuery.data, showcase]);

  const [plan, setPlan] = useState<Plan>("pro");
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const selectedPlan = PLAN_DEFS.find((p) => p.id === plan)!;

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!showcase) return;

    const payload: OrderInput = {
      showcaseId: showcase.id,
      plan,
      name: form.name,
      phone: form.phone,
      email: form.email,
      message: form.message || undefined,
    };

    const result = OrderInputSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    // API 연동은 다음 단계. 지금은 클라이언트 검증 후 완료 화면만 표시.
    setErrors({});
    setSubmitted(true);
  }

  return (
    <div className="relative z-10 min-h-screen">
      {/* ── 헤더 ── */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-grad text-white shadow-petal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
            </svg>
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">
            멜스튜디오<span className="text-crimson">.</span>
          </span>
        </Link>
        <Link
          href="/#showcase"
          className="flex items-center gap-1.5 text-sm font-medium text-wine/60 transition-colors hover:text-crimson"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          쇼케이스로 돌아가기
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        {isError ? (
          <p className="py-24 text-center text-wine/60">
            데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요.
          </p>
        ) : isLoading ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : !showcase ? (
          <div className="py-24 text-center">
            <p className="text-wine/60">해당 디자인을 찾을 수 없어요.</p>
            <Link
              href="/#showcase"
              className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-crimson"
            >
              쇼케이스 둘러보기
            </Link>
          </div>
        ) : submitted ? (
          /* ── 완료 화면 ── */
          <div className="mx-auto mt-10 max-w-xl animate-modal-in rounded-3xl border border-rose/15 bg-cream p-10 text-center shadow-petal sm:p-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-grad text-white shadow-petal">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">
              주문이 접수되었어요
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-wine/70">
              <strong className="text-crimson">{showcase.title}</strong> 디자인 ·{" "}
              <strong className="text-crimson">{selectedPlan.name}</strong> 플랜으로 접수했어요.
              <br />
              담당자가 입력하신 연락처({form.phone})로 1영업일 내에 연락드릴게요.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/#showcase"
                className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-crimson"
              >
                다른 디자인 더 보기
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setForm({ name: "", phone: "", email: "", message: "" });
                }}
                className="rounded-full border border-rose/25 bg-white px-6 py-3 text-sm font-semibold text-wine/70 transition-all hover:border-rose hover:text-crimson"
              >
                다시 주문하기
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── 선택한 쇼케이스 요약 ── */}
            <section className="animate-fade-up overflow-hidden rounded-3xl border border-rose/15 bg-cream shadow-soft">
              <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
                {/* 썸네일 */}
                <div className="w-full flex-shrink-0 overflow-hidden rounded-2xl border border-rose/15 bg-white shadow-soft sm:w-64">
                  <div className="flex items-center gap-1.5 border-b border-rose/10 bg-petalSoft/60 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-rose/40" />
                    <span className="h-2 w-2 rounded-full bg-rose-light/50" />
                    <span className="h-2 w-2 rounded-full bg-rose-soft/60" />
                  </div>
                  <div className="relative aspect-[16/11] w-full overflow-hidden bg-white">
                    <PagePreview item={showcase} variant="desktop" priority />
                  </div>
                </div>
                {/* 요약 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-grad px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      {categoryLabel}
                    </span>
                    <span className="text-xs text-wine/40">{showcase.id}.com</span>
                  </div>
                  <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
                    {showcase.title}
                  </h1>
                  <p className="mt-1.5 text-sm text-wine/65">{showcase.blurb}</p>
                  <p className="mt-4 text-xs font-medium text-wine/50">
                    이 디자인으로 랜딩페이지 제작을 주문합니다.
                  </p>
                </div>
              </div>
            </section>

            {/* ── 플랜 선택 ── */}
            <section className="mt-12">
              <h2 className="font-display text-xl font-extrabold text-ink">플랜 선택</h2>
              <p className="mt-1 text-sm text-wine/60">제작 범위에 맞는 플랜을 골라주세요.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {PLAN_DEFS.map((p) => {
                  const active = plan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      aria-pressed={active}
                      className={`group relative flex flex-col rounded-2xl border p-5 text-left transition-all ${
                        active
                          ? "border-crimson bg-white shadow-petalHover ring-2 ring-crimson/30"
                          : "border-rose/15 bg-cream shadow-soft hover:-translate-y-1 hover:border-rose/40 hover:shadow-petal"
                      }`}
                    >
                      {p.featured && (
                        <span className="absolute -top-2.5 left-5 rounded-full bg-sun px-2.5 py-0.5 text-[10px] font-bold text-ink shadow-sm">
                          추천
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg font-bold text-ink">
                          {p.name}
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                            active ? "border-crimson bg-crimson" : "border-rose/30 bg-white"
                          }`}
                        >
                          {active && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-wine/55">{p.tagline}</p>
                      <p className="mt-3 font-display text-2xl font-extrabold text-crimson">
                        {won(p.price)}
                      </p>
                      <ul className="mt-4 flex flex-col gap-1.5">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-wine/70">
                            <svg className="mt-0.5 flex-shrink-0 text-rose" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── 주문 폼 ── */}
            <section className="mt-12">
              <h2 className="font-display text-xl font-extrabold text-ink">주문 정보</h2>
              <p className="mt-1 text-sm text-wine/60">
                연락처를 남겨주시면 담당자가 제작 상담을 도와드려요.
              </p>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-5 rounded-3xl border border-rose/15 bg-cream p-6 shadow-soft sm:p-8"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="이름"
                    required
                    error={errors.name}
                    value={form.name}
                    onChange={(v) => update("name", v)}
                    placeholder="홍길동"
                  />
                  <Field
                    label="연락처"
                    required
                    type="tel"
                    error={errors.phone}
                    value={form.phone}
                    onChange={(v) => update("phone", v)}
                    placeholder="010-1234-5678"
                  />
                </div>
                <div className="mt-5">
                  <Field
                    label="이메일"
                    required
                    type="email"
                    error={errors.email}
                    value={form.email}
                    onChange={(v) => update("email", v)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="mt-5">
                  <label className="mb-1.5 block text-sm font-semibold text-ink">
                    요청사항
                    <span className="ml-1 text-xs font-normal text-wine/45">(선택)</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    rows={4}
                    placeholder="원하시는 색상, 추가 페이지, 참고 사이트 등을 자유롭게 적어주세요."
                    className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:outline-none focus:ring-2 ${
                      errors.message
                        ? "border-crimson focus:ring-crimson/30"
                        : "border-rose/20 focus:border-rose focus:ring-rose/20"
                    }`}
                  />
                  {errors.message && (
                    <p className="mt-1.5 text-xs font-medium text-crimson">{errors.message}</p>
                  )}
                </div>

                {/* 요약 + 제출 */}
                <div className="mt-7 flex flex-col gap-4 border-t border-rose/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-wine/65">
                    <span className="font-semibold text-ink">{selectedPlan.name}</span> 플랜 ·{" "}
                    <span className="font-display text-lg font-extrabold text-crimson">
                      {won(selectedPlan.price)}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="rounded-full bg-rose-grad px-8 py-3.5 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105"
                  >
                    주문 접수하기
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-wine/40 sm:text-right">
                  지금은 결제 없이 접수만 진행돼요. 결제는 상담 후 안내드립니다.
                </p>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-crimson">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? "border-crimson focus:ring-crimson/30"
            : "border-rose/20 focus:border-rose focus:ring-rose/20"
        }`}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-crimson">{error}</p>}
    </div>
  );
}
