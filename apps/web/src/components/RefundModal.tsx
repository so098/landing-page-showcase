"use client";

import { useEffect, useState } from "react";

// 환불 확인 모달 — "진짜 환불하시겠어요?" 확인 + 환불 이유 필수 입력.
// 모달 셸(백드롭/패널/스크롤 락/Escape 닫기)은 ReviewModal과 동일한 패턴을 따른다.
// 다만 ReviewModal은 ReviewForm(Server Action) 전용이라 그대로 재사용하면
// 폼/검증 책임이 섞이므로, 여기서는 셸 패턴만 공유하고 본문은 별도로 둔다
// (과도한 추상화를 피하고 파괴적 액션에 맞는 톤·검증을 직접 갖기 위함).
//
// 환불 처리 자체는 부모가 onConfirm(reason)으로 받아 수행한다.
// 현재는 결제가 목(mock) 단계이므로 환불도 목으로 처리하며, 실제 환불 API는
// 5순위 결제 연동 시 함께 붙인다 (백엔드 호출 없음 — 호출부 주석 참조).
export default function RefundModal({
  open,
  pageName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pageName: string; // 어떤 랜딩페이지를 환불하는지 (모달 제목)
  onClose: () => void;
  onConfirm: (reason: string) => void; // 검증 통과한 환불 이유를 부모에 전달
}) {
  const [reason, setReason] = useState("");
  // 빈값으로 제출 시도했는지 — 에러 메시지 노출용
  const [touched, setTouched] = useState(false);

  // 모달이 닫힐 때 입력값을 비워 다음 열림에 이전 이유가 남지 않게 한다
  useEffect(() => {
    if (!open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  // Escape 닫기 + body 스크롤 락 (ReviewModal과 동일한 position:fixed 보존 패턴)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const scrollY = window.scrollY;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      document.body.style.overflow = prev.overflow;
      window.scrollTo({ top: scrollY, behavior: "instant" });
      document.documentElement.scrollTop = scrollY;
      if (window.scrollY !== scrollY) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: "instant" });
          document.documentElement.scrollTop = scrollY;
        });
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    // 환불 이유는 필수 — 공백만 입력한 경우도 막는다
    if (!canSubmit) return;
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${pageName} 환불`}
    >
      {/* 백드롭 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute inset-0 cursor-default bg-wine/55 backdrop-blur-md"
      />

      {/* 패널 */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/40 bg-cream shadow-petalHover animate-modal-in"
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 border-b border-rose/10 bg-gradient-to-r from-petalSoft to-cream px-6 py-5">
          <div>
            <span className="rounded-full bg-wine/80 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              환불 요청
            </span>
            <h2 className="mt-1.5 font-display text-xl font-extrabold text-ink">
              진짜 환불하시겠어요?
            </h2>
            <p className="text-sm text-wine/60">
              <strong className="text-crimson">{pageName}</strong> 제작 건을 환불해요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-rose/20 bg-white text-wine/60 transition-all hover:rotate-90 hover:border-rose hover:text-crimson"
            aria-label="닫기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto px-6 py-6">
          <label htmlFor="refund-reason" className="block text-sm font-bold text-ink">
            환불 이유 <span className="text-crimson">*</span>
          </label>
          <p className="mt-1 text-xs text-wine/55">
            더 나은 서비스를 위해 환불 사유를 꼭 남겨주세요.
          </p>
          <textarea
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="예: 결과물이 기대와 달라요 / 일정이 바뀌었어요"
            aria-invalid={touched && !canSubmit}
            className="mt-3 w-full resize-none rounded-2xl border border-rose/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
          />
          {/* 빈값으로 제출 시도한 경우에만 에러 노출 (필수 입력 검증) */}
          {touched && !canSubmit && (
            <p role="alert" className="mt-2 text-xs font-semibold text-crimson">
              환불 이유를 입력해주세요.
            </p>
          )}
        </div>

        {/* 액션 — 파괴적 액션이므로 확정은 보조(테두리) 스타일, 취소가 기본 강조 */}
        <div className="flex flex-col-reverse gap-3 border-t border-rose/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-rose/25 bg-white px-6 py-3 text-sm font-semibold text-wine/70 transition-all hover:border-rose hover:text-crimson"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`rounded-full border px-6 py-3 text-sm font-bold transition-all ${
              canSubmit
                ? "border-crimson/30 bg-white text-crimson hover:border-crimson hover:shadow-petal"
                : "cursor-not-allowed border-rose/15 bg-white/60 text-wine/30"
            }`}
          >
            환불하기
          </button>
        </div>
      </form>
    </div>
  );
}
