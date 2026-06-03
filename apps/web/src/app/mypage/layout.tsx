import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

// 마이페이지는 로그인 사용자별 개인화 화면이라 검색에 노출하지 않는다.
// 클라이언트 페이지(page.tsx)는 metadata를 export할 수 없어 RSC 레이아웃에서 noindex를 건다.
export const metadata: Metadata = buildMetadata({
  title: "내정보",
  description: "결제한 웹페이지와 제작 진행 상황을 확인하세요.",
  path: "/mypage",
  noindex: true,
});

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
