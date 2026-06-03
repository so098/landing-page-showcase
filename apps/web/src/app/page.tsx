import type { Metadata } from "next";
import type { Category, Showcase, Review } from "@melstudio/shared";
import { fetchCategories, fetchShowcases, fetchReviews } from "@/lib/api";
import { buildMetadata } from "@/lib/metadata";
import SiteHeader from "@/components/SiteHeader";
import HomeShowcaseSection from "@/components/HomeShowcaseSection";
import ReviewSection from "@/components/ReviewSection";

// 홈은 사이트 기본 제목/설명을 그대로 쓰되, canonical("/")과 OG를 명시한다.
export const metadata: Metadata = buildMetadata({ path: "/" });

// ── 렌더링 전략: ISR (60초) ──
// 쇼케이스는 관리자만 추가하고 모든 방문자에게 같은 내용이므로,
// 정적 생성의 속도 + 주기 재생성의 신선도를 갖는 ISR이 최적.
// 히어로/통계/푸터는 서버에서 렌더되고, 필터/슬라이더/모달만 클라이언트 섬으로 하이드레이트된다.
export const revalidate = 60;

async function loadHomeData(): Promise<{
  categories: Category[];
  showcases: Showcase[];
  apiDown: boolean;
}> {
  try {
    const [categories, list] = await Promise.all([
      fetchCategories({ next: { revalidate: 60 } }),
      fetchShowcases({ limit: 100 }, { next: { revalidate: 60 } }),
    ]);
    return { categories, showcases: list.items, apiDown: false };
  } catch {
    // 빌드/재생성 시점에 API가 꺼져 있으면 빈 데이터로 렌더 (다음 재생성 때 복구)
    return { categories: [], showcases: [], apiDown: true };
  }
}

// 리뷰는 별도 fetch — "reviews" 태그를 달아 revalidateTag("reviews")로만 무효화.
// 페이지 ISR(60s)이 재생성돼도 리뷰 데이터는 태그가 무효화되지 않는 한 캐시 재사용.
// API 다운 시 빈 배열 → ReviewSection이 섹션을 숨김 (홈 전체는 정상 렌더).
async function loadReviews(): Promise<Review[]> {
  try {
    const { items } = await fetchReviews({ limit: 6 }, { next: { tags: ["reviews"] } });
    return items;
  } catch {
    return [];
  }
}

export default async function Home() {
  const [{ categories, showcases, apiDown }, reviews] = await Promise.all([
    loadHomeData(),
    loadReviews(),
  ]);

  return (
    <div className="relative z-10 min-h-screen">
      {/* ── 헤더 ── */}
      <SiteHeader />

      {/* ── 히어로 (서버 렌더 — 데이터가 HTML에 포함됨) ── */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-10 text-center sm:pt-16">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-rose/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-crimson-deep shadow-soft">
          <span className="h-2 w-2 animate-float rounded-full bg-sun shadow-[0_0_8px_rgba(244,168,44,0.6)]" />
          업종별 랜딩페이지 큐레이션
        </span>

        <h1
          className="mx-auto mt-7 max-w-3xl animate-fade-up font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          내 사업을 홍보할
          <br />
          <span className="text-crimson">웹사이트</span>를 찾으시나요?
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-wine/70 sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          카페부터 병원까지, 업종 태그를 고르면 어울리는 디자인을 보여드려요.
          <br className="hidden sm:block" />
          마음에 드는 페이지를 데스크탑·모바일로 바로 미리보세요.
        </p>

        <div
          className="mt-8 flex animate-fade-up items-center justify-center gap-6 text-sm text-wine/50"
          style={{ animationDelay: "240ms" }}
        >
          <span>
            <strong className="font-display text-lg font-bold text-crimson">
              {showcases.length}
            </strong>{" "}
            개의 디자인
          </span>
          <span className="h-4 w-px bg-rose/20" />
          <span>
            <strong className="font-display text-lg font-bold text-crimson">
              {categories.length}
            </strong>{" "}
            개 업종
          </span>
        </div>
      </section>

      {/* ── 태그 + 쇼케이스 (클라이언트 섬) ── */}
      <section id="showcase" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-24">
        <HomeShowcaseSection
          categories={categories}
          showcases={showcases}
          apiDown={apiDown}
        />
      </section>

      {/* ── 고객 리뷰 (서버 렌더 — 데이터가 HTML에 포함됨) ── */}
      <ReviewSection reviews={reviews} />

      {/* ── 푸터 (서버 렌더) ── */}
      <footer className="border-t border-rose/10 bg-cream/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-wine/50 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-grad text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
              </svg>
            </span>
            <span className="font-display font-bold text-ink">멜스튜디오</span>
          </div>
          <p>© 2026 멜스튜디오. 업종별 랜딩페이지 쇼케이스.</p>
        </div>
      </footer>
    </div>
  );
}
