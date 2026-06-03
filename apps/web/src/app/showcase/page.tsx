import type { Metadata } from "next";
import type { Category, ShowcaseList } from "@melstudio/shared";
import { fetchCategories, fetchShowcases } from "@/lib/api";
import { buildMetadata } from "@/lib/metadata";
import SiteHeader from "@/components/SiteHeader";
import ShowcaseExplorer from "@/components/ShowcaseExplorer";

export const metadata: Metadata = buildMetadata({
  title: "쇼케이스 전체 보기",
  description:
    "업종 태그를 골라 카페·병원·헬스장 등 업종별 랜딩페이지 디자인을 모두 둘러보세요.",
  path: "/showcase",
});

// ── 렌더링 전략: ISR (60초) + 클라이언트 무한스크롤 (하이브리드) ──
// 첫 12개는 서버에서 정적 생성해 LCP를 줄이고 (HTML에 데이터 포함),
// 2페이지부터는 클라이언트에서 React Query 무한스크롤로 가져온다.
// 카테고리 필터 변경도 클라이언트에서 처리 (queryKey 변경 → 재조회).
export const revalidate = 60;

async function loadShowcaseData(): Promise<{
  categories: Category[];
  initialPage: ShowcaseList | null;
  apiDown: boolean;
}> {
  try {
    const [categories, initialPage] = await Promise.all([
      fetchCategories({ next: { revalidate: 60 } }),
      fetchShowcases({ limit: 12 }, { next: { revalidate: 60 } }),
    ]);
    return { categories, initialPage, apiDown: false };
  } catch {
    // 빌드/재생성 시점에 API가 꺼져 있으면 빈 데이터로 렌더 (다음 재생성 때 복구)
    return { categories: [], initialPage: null, apiDown: true };
  }
}

export default async function ShowcasePage() {
  const { categories, initialPage, apiDown } = await loadShowcaseData();

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      {/* ── 타이틀 (서버 렌더) ── */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-6 text-center sm:pt-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          쇼케이스 <span className="text-crimson">전체 보기</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-wine/70">
          업종 태그를 고르고 아래로 스크롤하면 더 많은 디자인이 나와요.
        </p>
      </section>

      {/* ── 태그 + 무한스크롤 그리드 (클라이언트 섬, 첫 페이지는 서버 데이터) ── */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <ShowcaseExplorer
          categories={categories}
          initialPage={initialPage}
          apiDown={apiDown}
        />
      </section>
    </div>
  );
}
