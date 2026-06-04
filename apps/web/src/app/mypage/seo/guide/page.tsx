import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "SEO 최적화 안내",
  description: "검색 노출을 위한 SEO 최적화 준비 항목을 확인하세요.",
  path: "/mypage/seo/guide",
  noindex: true,
});

export default function SeoGuidePage() {
  return (
    <section className="animate-fade-up">
      <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-4 py-1.5 text-xs font-semibold text-accent-deep">
        <span className="h-2 w-2 rounded-full bg-accent" />
        SEO 최적화
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-normal text-ink sm:text-4xl">
        안내
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted/65">
        검색에 노출되기 좋은 제목, 설명, 대표 키워드, 공유 이미지를 준비하는 공간입니다.
        제작 완료 후 사업명과 지역명, 핵심 업종 키워드를 기준으로 기본 SEO 정보를 정리합니다.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <InfoCard title="검색 제목" body="상호명과 핵심 업종이 한눈에 보이도록 정리합니다." />
        <InfoCard title="검색 설명" body="검색 결과에서 클릭 이유가 되는 1~2문장 소개를 준비합니다." />
        <InfoCard title="대표 키워드" body="업종, 지역, 서비스명을 조합해 노출 방향을 잡습니다." />
      </div>
    </section>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[18px] border border-hairline bg-white p-6">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted/70">{body}</p>
    </article>
  );
}
