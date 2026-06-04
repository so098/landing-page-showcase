"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, login, logout, subscribe, type User } from "@/lib/auth";

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // 로그인 상태 구독 (마운트 후에만 읽어 hydration 불일치 방지)
  useEffect(() => {
    setUser(getUser());
    setMounted(true);
    return subscribe(() => setUser(getUser()));
  }, []);

  // 로그인 모달 ESC 닫기 + 스크롤 잠금
  useEffect(() => {
    if (!showLogin) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLogin(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showLogin]);

  // 목 로그인 — 어떤 소셜이든 이름 "사장님"으로 처리하고 모달 닫기
  function handleMockLogin() {
    login("사장님");
    setShowLogin(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-black text-white">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-display text-xs font-normal tracking-[-0.12px] text-white/92">
              랜딩,픽
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-xs font-normal tracking-[-0.12px] text-white/72 sm:flex">
            <Link href="/showcase" className="transition-colors hover:text-white">
              쇼케이스
            </Link>
            <Link href="/guide" className="transition-colors hover:text-white">
              안내
            </Link>

            {mounted && user ? (
              // 로그인 상태: 내정보 링크 + 로그아웃
              <div className="flex items-center gap-3">
                <Link
                  href="/mypage"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs text-accent transition-transform active:scale-95"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  내정보
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-white/56 transition-colors hover:text-white"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              // 비로그인 상태: 로그인(테두리) + 주문하기(강조)
              <>
                <button
                  type="button"
                  onClick={() => setShowLogin(true)}
                  className="rounded-full border border-white/28 bg-transparent px-4 py-2 text-xs text-white transition-colors hover:border-white"
                >
                  로그인
                </button>
                <Link
                  href="/order"
                  className="rounded-full bg-accent px-4 py-2 text-xs text-white transition-transform active:scale-95"
                >
                  주문하기
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── 목 로그인 모달 ── */}
      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* 백드롭 */}
          <button
            type="button"
            onClick={() => setShowLogin(false)}
            aria-label="닫기"
            className="absolute inset-0 cursor-default bg-black/56 backdrop-blur-md"
          />

          <div className="relative z-10 w-full max-w-sm animate-modal-in rounded-[18px] border border-hairline bg-white p-8 text-center sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-black text-white">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
              </svg>
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.28px] text-ink">
              랜딩,픽 시작하기
            </h2>
            <p className="mt-2 text-sm leading-relaxed tracking-[-0.224px] text-ink-muted/65">
              간편하게 로그인하고 내 랜딩페이지를 관리하세요.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              {/* 카카오 */}
              <button
                type="button"
                onClick={handleMockLogin}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#FEE500] px-6 py-3.5 text-sm font-semibold text-[#191600] transition-transform active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.6-1.8 3.7-2.5.6.1 1.3.1 2 .1 5.5 0 10-3.5 10-7.8C22 6.5 17.5 3 12 3z" />
                </svg>
                카카오로 시작하기
              </button>
              {/* 구글 */}
              <button
                type="button"
                onClick={handleMockLogin}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border border-hairline bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-transform active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                  <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z" />
                  <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
                </svg>
                구글로 시작하기
              </button>
            </div>

            <p className="mt-6 text-[11px] leading-relaxed tracking-[-0.08px] text-ink-muted/45">
              지금은 데모 단계예요. 어떤 버튼을 눌러도 체험용 계정으로 로그인됩니다.
            </p>

            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="mx-auto mt-4 block text-sm text-ink-muted/60 transition-colors hover:text-accent"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
