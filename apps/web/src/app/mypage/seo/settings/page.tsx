import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "SEO 최적화 세팅",
  description: "랜딩페이지 검색 노출 정보를 설정하세요.",
  path: "/mypage/seo/settings",
  noindex: true,
});

export default function SeoSettingsPage() {
  return (
    <section className="animate-fade-up">
      <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-4 py-1.5 text-xs font-semibold text-accent-deep">
        <span className="h-2 w-2 rounded-full bg-accent" />
        SEO 최적화
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-normal text-ink sm:text-4xl">
        세팅
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted/65">
        실제 저장 기능이 연결되기 전까지는 현재 적용 예정인 SEO 정보를 확인하는 화면입니다.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <SeoSetting label="검색 제목" value="랜딩,픽 랜딩페이지" />
        <SeoSetting label="검색 설명" value="업종별 맞춤 랜딩페이지 제작 서비스" />
        <SeoSetting label="대표 키워드" value="랜딩페이지, 홈페이지 제작, 소상공인 웹사이트" />
        <SeoSetting label="노출 상태" value="제작 완료 후 활성화" />
      </div>
    </section>
  );
}

function SeoSetting({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-hairline bg-white p-6">
      <p className="text-xs font-semibold text-ink-muted/55">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">{value}</p>
    </div>
  );
}
