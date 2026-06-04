import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import ChatWidget from "@/components/ChatWidget";
import SiteFooter from "@/components/SiteFooter";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  TITLE_TEMPLATE,
  TITLE_DEFAULT,
} from "@/lib/metadata";

// 사이트 기본 metadata. 하위 페이지는 title.template 덕분에 고유 제목만 넘기면
// "<제목> — 랜딩,픽"으로 확장된다. metadataBase가 있어야 OG/canonical의 상대 경로가
// 절대 URL로 해석된다.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      {/* sticky-footer 패턴: 본문이 짧아도 푸터가 화면 맨 아래에 붙도록
          body를 세로 flex로 두고 본문 래퍼에 flex-1을 준다. */}
      <body className="flex min-h-dvh flex-col font-body antialiased">
        <Providers>
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
