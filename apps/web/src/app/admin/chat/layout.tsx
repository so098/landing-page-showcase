import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

// 관리자 채팅 인박스는 내부 운영 화면이라 검색에 노출하지 않는다.
// 클라이언트 페이지(page.tsx)는 metadata를 export할 수 없어 RSC 레이아웃에서 noindex를 건다.
export const metadata: Metadata = buildMetadata({
  title: "관리자 채팅",
  description: "고객 문의를 실시간으로 응대하는 관리자 인박스.",
  path: "/admin/chat",
  noindex: true,
});

export default function AdminChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
