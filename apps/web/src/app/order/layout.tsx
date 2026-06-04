import type { Metadata } from "next";
import { buildMetadata, TITLE_TEMPLATE } from "@/lib/metadata";

// /order 이하(주문서 작성·수정·결과)는 개인화된 주문 흐름이라 검색에 노출하지 않는다.
// 클라이언트 페이지는 metadata를 export할 수 없어, RSC 레이아웃에서 noindex를 건다.
// (/order/[slug]는 자체 generateMetadata로 더 구체적인 메타데이터를 덮어쓴다)
//
// 주의: 중간 레이아웃이 title을 string으로 확정하면 그 아래 페이지의 string title이
// 루트의 template(%s — 랜딩,픽)을 더는 적용받지 못한다. 그래서 여기서 template을
// 다시 선언해, /order/[slug]의 "블룸 로스터스 주문하기"가 접미사까지 붙도록 한다.
export const metadata: Metadata = {
  ...buildMetadata({
    description: "디자인을 고르고 주문서를 작성해 보세요.",
    path: "/order",
    noindex: true,
  }),
  title: { default: "주문서", template: TITLE_TEMPLATE },
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
