import type { Metadata } from "next";

// ── SEO/메타데이터 단일 소스 ──
// 루트 레이아웃과 각 페이지의 generateMetadata가 공유하는 사이트 상수와
// 헬퍼를 모아둔다. 페이지마다 OG 태그를 손으로 반복하지 않고 buildMetadata로
// 조립해 일관성을 유지한다 (RSC 마이그레이션의 SEO 이점을 실제로 누리기 위함).

// 배포 도메인. 미설정 시 로컬 기본값 — metadataBase가 있어야 OG/canonical의
// 상대 경로가 절대 URL로 확장된다 (Next.js가 빌드 시 경고로 알려줌).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "랜딩,픽";

export const SITE_DESCRIPTION =
  "내 사업을 홍보할 웹사이트를 찾으시나요? 카페부터 병원까지, 업종에 맞는 랜딩페이지를 데스크탑·모바일로 미리보세요.";

// 제목 템플릿: 각 페이지는 "쇼케이스 전체 보기"만 넘기면
// "쇼케이스 전체 보기 — 랜딩,픽"으로 확장된다. 홈은 default를 그대로 쓴다.
export const TITLE_TEMPLATE = `%s — ${SITE_NAME}`;
export const TITLE_DEFAULT = `${SITE_NAME} — 업종별 랜딩페이지 쇼케이스`;

type BuildMetadataInput = {
  // 템플릿(%s)에 들어갈 페이지 고유 제목. 생략 시 사이트 기본 제목 사용.
  title?: string;
  description?: string;
  // canonical 및 OG url에 쓰일 경로 (예: "/showcase").
  path?: string;
  // 검색 노출 차단 (개인화/관리 페이지).
  noindex?: boolean;
};

// 페이지별 metadata를 사이트 공통값과 합쳐 OG/Twitter 카드까지 채운다.
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  noindex = false,
}: BuildMetadataInput = {}): Metadata {
  // OG에는 템플릿이 적용되지 않으므로 완성된 제목 문자열을 직접 만든다.
  const resolvedTitle = title ? `${title} — ${SITE_NAME}` : TITLE_DEFAULT;

  return {
    title: title ?? TITLE_DEFAULT,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: resolvedTitle,
      description,
      url: path,
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
