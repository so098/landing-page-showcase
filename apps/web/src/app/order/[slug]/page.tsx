import type { Metadata } from "next";
import { fetchShowcaseBySlug } from "@/lib/api";
import { buildMetadata } from "@/lib/metadata";
import OrderWithShowcaseClient from "./OrderWithShowcaseClient";

// 주문 진입 페이지 — 동적 metadata의 대표 사례.
// 클라이언트 상호작용(폼/쿼리스트링)은 OrderWithShowcaseClient(클라이언트 섬)에 두고,
// page는 서버 컴포넌트로 남겨 generateMetadata를 export한다.
// (클라이언트 컴포넌트는 metadata를 export할 수 없으므로 분리한 것)

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // slug 기반으로 디자인을 찾아 제목/설명을 만든다. 못 찾거나 API가 꺼져 있으면 폴백.
  let showcase = null;
  try {
    showcase = await fetchShowcaseBySlug(slug, { next: { revalidate: 60 } });
  } catch {
    // API 다운 — 폴백 메타데이터로 진행 (페이지는 클라이언트에서 다시 로드 시도)
  }

  // 주문 페이지는 개인화 흐름(주문서 작성)이라 검색에 노출하지 않는다.
  if (!showcase) {
    return buildMetadata({
      title: "주문서 작성",
      description: "디자인을 고르고 주문서를 작성해 보세요.",
      path: `/order/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${showcase.title} 주문하기`,
    description: `${showcase.title} 디자인으로 내 랜딩페이지를 주문해 보세요. ${showcase.blurb}`,
    path: `/order/${slug}`,
    noindex: true,
  });
}

export default function OrderWithShowcasePage() {
  return <OrderWithShowcaseClient />;
}
