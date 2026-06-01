"use client";

import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-grad text-white shadow-petal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
          </svg>
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">
          멜스튜디오
        </span>
      </Link>
      <nav className="hidden items-center gap-7 text-sm font-medium text-wine/60 sm:flex">
        <Link href="/showcase" className="transition-colors hover:text-crimson">
          쇼케이스
        </Link>
        <Link
          href="/order"
          className="rounded-full bg-ink px-4 py-2 text-white transition-all hover:bg-crimson"
        >
          주문하기
        </Link>
      </nav>
    </header>
  );
}
