"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(active: boolean) {
  return `block rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
    active
      ? "bg-accent text-white"
      : "bg-transparent text-ink hover:bg-canvas hover:text-accent"
  }`;
}

function subNavClass(active: boolean) {
  return `rounded-md px-3 py-2 text-sm transition-colors ${
    active
      ? "bg-canvas font-semibold text-accent"
      : "text-ink-muted/70 hover:bg-canvas hover:text-accent"
  }`;
}

export default function MyPageSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="내정보 메뉴"
      className="rounded-[18px] border border-hairline bg-white p-3"
    >
      <Link href="/mypage" className={navClass(pathname === "/mypage")}>
        구매현황
      </Link>
      <div className="mt-5 px-4">
        <p className="text-sm font-semibold leading-none tracking-[-0.12px] text-ink-muted/60">
          SEO 최적화
        </p>
        <div className="mt-3 flex flex-col gap-1.5 border-l border-hairline pl-3">
          <Link
            href="/mypage/seo/guide"
            className={subNavClass(pathname === "/mypage/seo/guide")}
          >
            안내
          </Link>
          <Link
            href="/mypage/seo/settings"
            className={subNavClass(pathname === "/mypage/seo/settings")}
          >
            세팅
          </Link>
        </div>
      </div>
    </nav>
  );
}
