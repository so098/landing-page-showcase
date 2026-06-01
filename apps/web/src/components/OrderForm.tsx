"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Showcase } from "@melstudio/shared";
import {
  OrderFormSchema,
  PURPOSES,
  INFO_OPTIONS,
  PAGE_OPTIONS,
  BASE_PAGE,
  ADDITIONAL_PAGE_PRICE,
  MOODS,
  MATERIAL_TYPES,
  type Purpose,
} from "@/lib/order";
import { saveOrder, loadOrder } from "@/lib/orderStorage";
import PagePreview from "./PagePreview";

// 주문서 폼 — 쇼케이스(디자인)를 미리 골랐으면 showcase로 전달, 아니면 null.
// mode: "ai" = 생성하기(목 생성 → 결과 페이지), "human" = 사람에게 주문하기(카톡 연락 안내)
// restore: true면 이전에 저장된 주문서 내용을 불러와 수정 모드로 시작
export default function OrderForm({
  showcase,
  categoryLabel,
  mode = "ai",
  restore = false,
}: {
  showcase: Showcase | null;
  categoryLabel: string;
  mode?: "ai" | "human";
  restore?: boolean;
}) {
  const router = useRouter();
  // ── 폼 상태 ──
  // 목데이터 기본값: 바로 [생성하기]를 눌러 결과 페이지 흐름을 확인할 수 있게 채워둠.
  // (백엔드 연동 시 빈 값으로 되돌릴 것)
  const [form, setForm] = useState({
    businessName: "달콤 베이커리",
    phone: "010-1234-5678",
    email: "owner@dalkom.kr",
    industry: "카페·베이커리",
    links: "https://instagram.com/dalkom_bakery",
    targetProfile: "20~30대 여성, 서울 마포구",
    targetPain: "믿을 수 있는 수제 디저트 가게를 찾기 어려워요",
    targetMessage: "당일 생산 원칙과 주문 제작 케이크의 차별점",
    targetHesitation: "가격이 비쌀 것 같다는 인상",
    avoidFeel: "차갑고 사무적인 느낌",
    referenceSites: "https://example-bakery.com",
    preferredColors: "크림, 베이지, 브라운",
    copyText: "매일 아침 굽는 진짜 수제 디저트, 달콤 베이커리",
  });
  const [purpose, setPurpose] = useState<Purpose | null>("고객 예약 유도");
  const [selectedInfo, setSelectedInfo] = useState<string[]>(["대표 서비스 명", "가격/패키지"]);
  const [infoContents, setInfoContents] = useState<Record<string, string>>({
    "대표 서비스 명": "주문 제작 케이크, 구움과자 세트",
    "가격/패키지": "케이크 35,000원~ / 구움과자 세트 18,000원",
  });
  const [pages, setPages] = useState<string[]>([BASE_PAGE, "예약/문의"]);
  const [moods, setMoods] = useState<string[]>(["감성적인", "귀여운"]);
  const [hasBrandColors, setHasBrandColors] = useState<boolean | null>(true);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 수정 모드: 저장된 주문서 내용 복원
  useEffect(() => {
    if (!restore) return;
    const saved = loadOrder();
    if (!saved) return;
    setForm(saved.form);
    setPurpose((saved.purpose as Purpose) ?? null);
    setSelectedInfo(saved.selectedInfo);
    setInfoContents(saved.infoContents);
    setPages(saved.pages.length > 0 ? saved.pages : [BASE_PAGE]);
    setMoods(saved.moods);
    setHasBrandColors(saved.hasBrandColors);
  }, [restore]);

  // 업종은 선택한 쇼케이스의 카테고리로 미리 채움 (수정 가능)
  useEffect(() => {
    if (categoryLabel && !form.industry) {
      setForm((f) => ({ ...f, industry: categoryLabel }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryLabel]);

  const additionalPages = Math.max(0, pages.length - 1);
  const additionalCost = additionalPages * ADDITIONAL_PAGE_PRICE;

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function handleSubmit() {
    const infoSections: Record<string, string> = {};
    for (const key of selectedInfo) infoSections[key] = infoContents[key] ?? "";

    const payload = {
      showcaseId: showcase?.id,
      businessName: form.businessName,
      phone: form.phone,
      email: form.email,
      industry: form.industry,
      links: form.links || undefined,
      purpose: purpose as Purpose,
      targetProfile: form.targetProfile || undefined,
      targetPain: form.targetPain || undefined,
      targetMessage: form.targetMessage || undefined,
      targetHesitation: form.targetHesitation || undefined,
      infoSections: selectedInfo.length > 0 ? infoSections : undefined,
      pages,
      moods: moods.length > 0 ? moods : undefined,
      avoidFeel: form.avoidFeel || undefined,
      referenceSites: form.referenceSites || undefined,
      preferredColors: form.preferredColors || undefined,
      hasBrandColors: hasBrandColors ?? undefined,
      copyText: form.copyText || undefined,
    };

    const result = OrderFormSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      // 첫 에러 위치로 스크롤
      const firstKey = Object.keys(fieldErrors)[0];
      document
        .getElementById(`field-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 검증 통과 → 주문서 내용 저장 (결과 페이지/수정하기에서 사용)
    setErrors({});
    saveOrder({
      showcaseId: showcase?.id,
      form,
      purpose,
      selectedInfo,
      infoContents,
      pages,
      moods,
      hasBrandColors,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (mode === "human") {
      // 사람에게 주문하기 — 카톡 연락 안내 화면
      setSubmitted(true);
      return;
    }

    // AI 생성(목): 잠시 생성 중 화면을 보여준 뒤 결과 페이지로 이동
    setGenerating(true);
    setTimeout(() => {
      router.push("/order/result");
    }, 2800);
  }

  /* ── 생성 중 화면 (목) ── */
  if (generating) {
    return (
      <div className="mx-auto mt-10 max-w-xl animate-modal-in rounded-3xl border border-rose/15 bg-cream p-10 text-center shadow-petal sm:p-14">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-grad text-white shadow-petal">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">
          AI가 랜딩페이지를 만들고 있어요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-wine/70">
          <strong className="text-crimson">{form.businessName}</strong>의 랜딩페이지를 생성 중이에요.
          <br />
          잠시만 기다려 주세요…
        </p>
        <div className="mx-auto mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-rose/15">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-rose-grad" />
        </div>
      </div>
    );
  }

  /* ── 완료 화면 (사람에게 주문하기) ── */
  if (submitted) {
    return (
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
          <strong className="text-crimson">{form.businessName}</strong>의 랜딩페이지 주문서를
          잘 받았어요.
          <br />
          담당자가 <strong className="text-ink">가능한 시간에 카카오톡</strong>으로 연락드려서
          이야기 나누며 함께 만들어 드릴게요.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/showcase"
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-crimson"
          >
            다른 디자인 더 보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── 페이지 타이틀 ── */}
      <div className="animate-fade-up text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          랜딩페이지 <span className="text-crimson">주문서</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-wine/65">
          작성해주신 내용을 바탕으로 AI가{" "}
          {showcase ? "선택하신 디자인에 맞춰" : "어울리는 디자인으로"} 페이지를 만들어요.
        </p>
      </div>

      {/* ── 선택한 디자인 (포폴에서 고른 경우에만) ── */}
      {showcase ? (
        <section className="mt-10 animate-fade-up overflow-hidden rounded-3xl border border-rose/15 bg-cream shadow-soft">
          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-grad px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {categoryLabel}
                </span>
                <span className="text-xs text-wine/40">선택한 디자인</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
                {showcase.title}
              </h2>
              <p className="mt-1.5 text-sm text-wine/65">{showcase.blurb}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-10 animate-fade-up rounded-3xl border border-dashed border-rose/30 bg-white/50 p-6 text-center">
          <p className="text-sm text-wine/65">
            아직 디자인을 고르지 않으셨어요. 마음에 드는 디자인이 있으면 더 정확하게 만들 수 있어요.
          </p>
          <Link
            href="/showcase"
            className="mt-4 inline-block rounded-full border border-rose/25 bg-white px-5 py-2.5 text-sm font-semibold text-crimson transition-all hover:border-rose hover:shadow-petal"
          >
            쇼케이스에서 디자인 고르기
          </Link>
        </section>
      )}

      <div className="mt-12 flex flex-col gap-12">
        {/* ── 1. 사장님 정보 ── */}
        <FormSection no={1} title="사장님 정보를 작성해주세요">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="field-businessName"
              label="업체명 (브랜드명)"
              required
              error={errors.businessName}
              value={form.businessName}
              onChange={(v) => update("businessName", v)}
              placeholder="멜스튜디오"
            />
            <Field
              id="field-industry"
              label="업종"
              required
              error={errors.industry}
              value={form.industry}
              onChange={(v) => update("industry", v)}
              placeholder="카페·베이커리"
            />
            <Field
              id="field-phone"
              label="연락처"
              required
              type="tel"
              error={errors.phone}
              value={form.phone}
              onChange={(v) => update("phone", v)}
              placeholder="010-1234-5678"
            />
            <Field
              id="field-email"
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
            <Field
              id="field-links"
              label="기존 홈페이지 · 참고 홈페이지 · SNS 링크"
              error={errors.links}
              value={form.links}
              onChange={(v) => update("links", v)}
              placeholder="https://instagram.com/mybrand, https://..."
            />
          </div>
        </FormSection>

        {/* ── 2. 제작 목적 ── */}
        <FormSection no={2} title="제작 목적은 무엇인가요?" error={errors.purpose}>
          <div id="field-purpose" className="flex flex-wrap gap-2.5">
            {PURPOSES.map((p) => (
              <Chip
                key={p}
                label={p}
                active={purpose === p}
                onClick={() => {
                  setPurpose(p);
                  if (errors.purpose) setErrors((e) => ({ ...e, purpose: "" }));
                }}
              />
            ))}
          </div>
        </FormSection>

        {/* ── 3. 타깃 고객 ── */}
        <FormSection no={3} title="타깃으로 하는 고객이 누구인가요?">
          <div className="flex flex-col gap-5">
            <Field
              id="field-targetProfile"
              label="주요 고객층 나이 / 성별 / 지역"
              value={form.targetProfile}
              onChange={(v) => update("targetProfile", v)}
              placeholder="20~30대 여성, 서울 마포구"
            />
            <TextArea
              label="고객이 가진 고민"
              value={form.targetPain}
              onChange={(v) => update("targetPain", v)}
              placeholder="예: 믿을 수 있는 곳을 찾기 어렵다, 가격이 불투명하다…"
              rows={2}
            />
            <TextArea
              label="고객이 이 페이지에서 알아야 할 것"
              value={form.targetMessage}
              onChange={(v) => update("targetMessage", v)}
              placeholder="예: 우리 서비스의 차별점, 예약 방법, 가격대…"
              rows={2}
            />
            <TextArea
              label="고객이 사용을 망설인다면 그 이유는 뭐라고 생각하시나요?"
              value={form.targetHesitation}
              onChange={(v) => update("targetHesitation", v)}
              placeholder="예: 후기가 없어서, 가격이 부담돼서…"
              rows={2}
            />
          </div>
        </FormSection>

        {/* ── 4. 추가할 정보 ── */}
        <FormSection
          no={4}
          title="어떤 정보를 추가할지 골라주세요"
          subtitle="복수선택 — 선택한 항목의 내용을 작성해주세요"
        >
          <div className="flex flex-wrap gap-2.5">
            {INFO_OPTIONS.map((opt) => (
              <Chip
                key={opt}
                label={opt}
                active={selectedInfo.includes(opt)}
                onClick={() => setSelectedInfo((list) => toggle(list, opt))}
              />
            ))}
          </div>
          {selectedInfo.length > 0 && (
            <div className="mt-6 flex flex-col gap-5">
              {selectedInfo.map((opt) => (
                <TextArea
                  key={opt}
                  label={opt}
                  value={infoContents[opt] ?? ""}
                  onChange={(v) => setInfoContents((c) => ({ ...c, [opt]: v }))}
                  placeholder={`${opt} 내용을 작성해주세요`}
                  rows={2}
                />
              ))}
            </div>
          )}
        </FormSection>

        {/* ── 5. 필수 페이지 ── */}
        <FormSection
          no={5}
          title="필수 페이지를 골라주세요"
          subtitle={`복수선택 — 기본 1페이지이며, 1페이지 추가 시 ${ADDITIONAL_PAGE_PRICE.toLocaleString("ko-KR")}원이 추가됩니다`}
          error={errors.pages}
        >
          <div id="field-pages" className="flex flex-wrap gap-2.5">
            {PAGE_OPTIONS.map((p) => (
              <Chip
                key={p}
                label={p}
                active={pages.includes(p)}
                onClick={() => {
                  setPages((list) => toggle(list, p));
                  if (errors.pages) setErrors((e) => ({ ...e, pages: "" }));
                }}
              />
            ))}
          </div>
          {pages.length > 0 && (
            <p className="mt-4 text-sm text-wine/65">
              선택한 페이지 <strong className="text-ink">{pages.length}개</strong>
              {additionalPages > 0 && (
                <>
                  {" "}
                  · 추가 비용{" "}
                  <strong className="font-display text-crimson">
                    +{additionalCost.toLocaleString("ko-KR")}원
                  </strong>
                </>
              )}
            </p>
          )}
        </FormSection>

        {/* ── 6. 디자인 방향 ── */}
        <FormSection
          no={6}
          title="원하는 디자인 방향이 있으신가요?"
          subtitle={
            showcase
              ? "디자인은 위에서 선택한 쇼케이스를 기준으로 해요"
              : "쇼케이스에서 디자인을 고르면 그 디자인을 기준으로 만들어요"
          }
        >
          <p className="mb-2.5 text-sm font-semibold text-ink">원하는 분위기</p>
          <div className="flex flex-wrap gap-2.5">
            {MOODS.map((m) => (
              <Chip
                key={m}
                label={m}
                active={moods.includes(m)}
                onClick={() => setMoods((list) => toggle(list, m))}
              />
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-5">
            <Field
              id="field-avoidFeel"
              label="피하고 싶은 느낌"
              value={form.avoidFeel}
              onChange={(v) => update("avoidFeel", v)}
              placeholder="예: 너무 화려한, 차가운 느낌…"
            />
            <Field
              id="field-referenceSites"
              label="참고 사이트 / 이미지"
              value={form.referenceSites}
              onChange={(v) => update("referenceSites", v)}
              placeholder="https://..."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="field-preferredColors"
                label="원하는 컬러"
                value={form.preferredColors}
                onChange={(v) => update("preferredColors", v)}
                placeholder="예: 베이지, 딥그린"
              />
              <div>
                <p className="mb-1.5 block text-sm font-semibold text-ink">
                  로고 / 브랜드 컬러 유무
                </p>
                <div className="flex gap-2.5">
                  <Chip
                    label="있어요"
                    active={hasBrandColors === true}
                    onClick={() => setHasBrandColors(true)}
                  />
                  <Chip
                    label="없어요"
                    active={hasBrandColors === false}
                    onClick={() => setHasBrandColors(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        {/* ── 7. 문구 작성 ── */}
        <FormSection
          no={7}
          title="문구 작성"
          subtitle="페이지에 꼭 들어가야 하는 문구가 있다면 적어주세요"
        >
          <TextArea
            value={form.copyText}
            onChange={(v) => update("copyText", v)}
            error={errors.copyText}
            placeholder="예: 슬로건, 인사말, 강조하고 싶은 한 줄…"
            rows={5}
          />
        </FormSection>

        {/* ── 8. 자료 업로드 ── */}
        <FormSection no={8} title="자료 업로드" subtitle={MATERIAL_TYPES.join(" · ")}>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rose/30 bg-white/60 px-6 py-10 text-center transition-colors hover:border-rose hover:bg-white">
            <svg className="text-rose" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span className="mt-3 text-sm font-semibold text-ink">
              파일을 선택하거나 끌어다 놓으세요
            </span>
            <span className="mt-1 text-xs text-wine/45">
              이미지, PDF, 문서 파일 (여러 개 선택 가능)
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length > 0) setFiles((prev) => [...prev, ...picked]);
                e.target.value = "";
              }}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-rose/15 bg-white px-4 py-2.5 text-sm text-ink"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`${f.name} 삭제`}
                    className="ml-3 flex-shrink-0 text-wine/40 transition-colors hover:text-crimson"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-wine/45">
            파일은 생성 시 참고 자료로 사용돼요. 부족한 자료는 완료 연락 시 추가로 요청드릴 수 있어요.
          </p>
        </FormSection>

        {/* ── 생성하기 ── */}
        <div className="rounded-3xl border border-rose/15 bg-cream p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-relaxed text-wine/65">
              선택한 페이지 <strong className="text-ink">{pages.length}개</strong>
              {additionalPages > 0 && (
                <>
                  {" "}
                  · 추가 비용{" "}
                  <strong className="font-display text-crimson">
                    +{additionalCost.toLocaleString("ko-KR")}원
                  </strong>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-full bg-rose-grad px-10 py-4 text-base font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105"
            >
              {mode === "human" ? "사람에게 주문하기" : "생성하기"}
            </button>
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-wine/45 sm:text-right">
            {mode === "human" ? (
              <>주문서를 확인한 뒤 가능한 시간에 카카오톡으로 연락드려요.</>
            ) : (
              <>
                AI 생성은 <strong>3~5분</strong> 정도 걸려요. 완성되면 바로 보여드릴게요.
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}

/* ── 폼 섹션 래퍼 ── */
function FormSection({
  no,
  title,
  subtitle,
  error,
  children,
}: {
  no: number;
  title: string;
  subtitle?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-rose/15 bg-cream p-6 shadow-soft sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-rose-grad font-display text-sm font-bold text-white">
          {no}
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold leading-snug text-ink sm:text-xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-xs text-wine/55 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {error && <p className="mt-3 text-xs font-medium text-crimson">{error}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/* ── 선택 칩 ── */
function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
        active
          ? "border-transparent bg-rose-grad text-white shadow-petal"
          : "border-rose/20 bg-white/70 text-wine/70 hover:border-rose/50 hover:bg-white hover:text-crimson"
      }`}
    >
      {label}
    </button>
  );
}

/* ── 한 줄 입력 ── */
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  type = "text",
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div id={id}>
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

/* ── 여러 줄 입력 ── */
function TextArea({
  label,
  value,
  onChange,
  placeholder,
  error,
  rows = 3,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  rows?: number;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? "border-crimson focus:ring-crimson/30"
            : "border-rose/20 focus:border-rose focus:ring-rose/20"
        }`}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-crimson">{error}</p>}
    </div>
  );
}
