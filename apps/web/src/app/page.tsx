import type { Metadata } from "next";
import type { Category, Showcase, Review } from "@melstudio/shared";
import { fetchCategories, fetchShowcases, fetchReviews } from "@/lib/api";
import { buildMetadata } from "@/lib/metadata";
import SiteHeader from "@/components/SiteHeader";
import HomeShowcaseSection from "@/components/HomeShowcaseSection";
import ReviewSection from "@/components/ReviewSection";
import { REVIEW_PAGE_SIZE } from "@/lib/reviews";

// 홈은 사이트 기본 제목/설명을 그대로 쓰되, canonical("/")과 OG를 명시한다.
export const metadata: Metadata = buildMetadata({ path: "/" });

// ── 렌더링 전략: ISR (60초) ──
// 쇼케이스는 관리자만 추가하고 모든 방문자에게 같은 내용이므로,
// 정적 생성의 속도 + 주기 재생성의 신선도를 갖는 ISR이 최적.
// 히어로/통계는 서버에서 렌더되고, 필터/슬라이더/모달만 클라이언트 섬으로 하이드레이트된다.
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
// 첫 페이지(REVIEW_PAGE_SIZE개)만 서버에서 받아 SSR하고, 이후 페이지는 ReviewSection이 클라이언트에서 fetch.
// API 다운 시 total 0 → ReviewSection이 섹션을 숨김 (홈 전체는 정상 렌더).
async function loadReviews(): Promise<{ items: Review[]; total: number }> {
  try {
    return await fetchReviews(
      { limit: REVIEW_PAGE_SIZE, page: 1 },
      { next: { tags: ["reviews"] } },
    );
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function Home() {
  const [{ categories, showcases, apiDown }, reviews] = await Promise.all([
    loadHomeData(),
    loadReviews(),
  ]);

  return (
    <div className="min-h-screen bg-white text-ink">
      {/* ── 헤더 ── */}
      <SiteHeader />

      {/* ── 히어로 (서버 렌더 — 데이터가 HTML에 포함됨) ── */}
      <section className="bg-white px-5 pb-16 pt-14 text-center sm:pb-20 sm:pt-20">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-canvas px-4 py-1.5 text-xs font-normal tracking-[-0.12px] text-ink-muted/80">
          <span className="h-2 w-2 rounded-full bg-accent" />
          업종별 랜딩페이지 큐레이션
        </span>

        <h1
          className="mx-auto mt-7 max-w-4xl animate-fade-up font-display text-[40px] font-bold leading-[1.22] tracking-normal text-ink sm:text-[56px] sm:leading-[1.16]"
          style={{ animationDelay: "80ms" }}
        >
          내 사업을 홍보할
          <br />
          <span className="text-ink">웹사이트</span>를 찾으시나요?
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl animate-fade-up text-[21px] font-normal leading-[1.35] tracking-[0.12px] text-ink-muted/80 sm:text-[28px] sm:leading-[1.14]"
          style={{ animationDelay: "160ms" }}
        >
          카페부터 병원까지, 업종 태그를 고르면 어울리는 디자인을 보여드려요.
          <br className="hidden sm:block" />
          마음에 드는 페이지를 데스크탑·모바일로 바로 미리보세요.
        </p>

        <div
          className="mt-8 flex animate-fade-up items-center justify-center gap-3 text-[17px] tracking-[-0.374px]"
          style={{ animationDelay: "240ms" }}
        >
          <span className="rounded-full bg-accent px-[22px] py-[11px] text-white transition-transform active:scale-95">
            {showcases.length}개의 디자인
          </span>
          <span className="rounded-full border border-accent px-[22px] py-[11px] text-accent">
            {categories.length}개 업종
          </span>
        </div>
      </section>

      {/* ── 태그 + 쇼케이스 (클라이언트 섬) ── */}
      <section id="showcase" className="scroll-mt-8 bg-canvas px-5 py-16 sm:py-20">
        <HomeShowcaseSection
          categories={categories}
          showcases={showcases}
          apiDown={apiDown}
        />
      </section>

      {/* ── 고객 리뷰 (첫 페이지 서버 렌더 — 데이터가 HTML에 포함됨, 이후 페이지는 클라이언트 fetch) ── */}
      <ReviewSection
        initialItems={reviews.items}
        total={reviews.total}
        pageSize={REVIEW_PAGE_SIZE}
      />
      {/* 푸터는 루트 레이아웃의 전역 SiteFooter로 옮겨, 모든 페이지에 공통 적용된다. */}
    </div>
  );
}
