"use client";

import { useEffect } from "react";
import ReviewForm from "./ReviewForm";
import type { ReviewFormState } from "@/app/actions/reviews";

// 마이페이지 "리뷰 작성" 모달.
// 모달 셸(백드롭/패널/스크롤 락/Escape 닫기)은 PreviewModal과 동일한 패턴을 따르고,
// 폼 본체는 기존 ReviewForm을 variant="modal"로 재사용한다 — 검증/연타 가드/
// 입력값 복원 로직을 그대로 물려받기 위함(중복 구현 방지).
//
// 제출 자체는 ReviewForm 기본 액션(submitReview Server Action)이 처리한다.
// 클라이언트 컴포넌트에서도 Server Action 호출이 가능하므로(ReviewSection과 동일),
// 별도 클라이언트 fetch를 두지 않고 홈 캐시 무효화(updateTag) 흐름을 공유한다.
// 성공 시 onSubmitted로 부모(마이페이지)에 알려 모달을 닫고 감사 토스트를 띄운다.
export default function ReviewModal({
  open,
  pageName,
  authorName,
  onClose,
  onSubmitted,
  action,
}: {
  open: boolean;
  pageName: string; // 어떤 랜딩페이지에 대한 리뷰인지 (모달 제목)
  authorName: string; // 로그인 사용자 이름 — 이름칸 자동 채움
  onClose: () => void;
  onSubmitted: () => void;
  // 테스트에서 Server Action 대신 가짜 액션을 주입할 수 있게 한다 (기본값 = ReviewForm 기본 액션)
  action?: (prev: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
}) {
  // Escape 닫기 + body 스크롤 락 (PreviewModal과 동일한 position:fixed 보존 패턴)
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${pageName} 리뷰 작성`}
    >
      {/* 백드롭 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute inset-0 cursor-default bg-ink-muted/55 backdrop-blur-md"
      />

      {/* 패널 */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/40 bg-pearl shadow-petalHover animate-modal-in">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 border-b border-accent/10 bg-gradient-to-r from-canvas to-pearl px-6 py-5">
          <div>
            <span className="rounded-full bg-accent-grad px-2.5 py-0.5 text-[11px] font-semibold text-white">
              리뷰 작성
            </span>
            <h2 className="mt-1.5 font-display text-xl font-extrabold text-ink">
              {pageName}
            </h2>
            <p className="text-sm text-ink-muted/60">제작 경험은 어떠셨나요? 한마디 남겨주세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-accent/20 bg-white text-ink-muted/60 transition-all hover:rotate-90 hover:border-accent hover:text-accent"
            aria-label="닫기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 폼 본문 */}
        <div className="overflow-y-auto px-6 py-6">
          <ReviewForm
            action={action}
            variant="modal"
            defaultAuthorName={authorName}
            onSuccess={onSubmitted}
          />
        </div>
      </div>
    </div>
  );
}
