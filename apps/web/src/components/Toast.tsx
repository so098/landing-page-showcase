"use client";

import { useEffect } from "react";

// 토스트 알림 — 라이브러리 없이 직접 구현 (레포의 직접 구현 선호 원칙).
// 표시/사라짐은 부모가 상태로 제어하고, 이 컴포넌트는 일정 시간 뒤
// onDismiss를 호출해 "스스로 닫아달라"고 알리는 역할만 한다.
//
// 접근성: role="status" + aria-live="polite"로 스크린리더가
// 화면 갱신 없이도 알림 내용을 읽도록 한다.
export default function Toast({
  message,
  duration = 3000,
  onDismiss,
  tone = "success",
}: {
  message: string;
  duration?: number; // ms, 자동 닫힘까지
  onDismiss: () => void;
  tone?: "success" | "error"; // 아이콘/색만 바뀐다 (성공=체크, 실패=느낌표)
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="animate-slide-in pointer-events-auto flex items-center gap-3 rounded-full border border-white/40 bg-ink/95 px-5 py-3 text-sm font-semibold text-white shadow-petalHover backdrop-blur"
      >
        {/* 상태 아이콘 — 성공: 체크 / 실패: 느낌표 */}
        <span
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
            tone === "error" ? "bg-red-500" : "bg-accent-grad"
          }`}
        >
          {tone === "error" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 7v6" />
              <path d="M12 17h.01" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </span>
        {message}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="닫기"
          className="ml-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
