import Link from "next/link";
import { SITE_NAME } from "@/lib/metadata";

// 전역 푸터 — 루트 레이아웃의 {children} 뒤에 렌더되어 모든 페이지 하단에 깔린다.
// (홈에만 있던 푸터를 승격) 서버 컴포넌트라 정적으로 HTML에 포함된다.
// 디자인: canvas(off-white) 표면 + 상단 헤어라인, 액센트는 링크 hover에서만.

const LINKS = [
  { href: "/showcase", label: "쇼케이스" },
  { href: "/guide", label: "이용 안내" },
  { href: "/order", label: "주문하기" },
  { href: "/mypage", label: "내정보" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-12 text-xs leading-none tracking-[-0.12px] text-ink-muted/70 sm:flex-row sm:justify-between sm:gap-4">
        <span className="font-display font-semibold text-ink">{SITE_NAME}</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p>© 2026 멜스튜디오. 업종별 랜딩페이지 쇼케이스.</p>
      </div>
    </footer>
  );
}
