import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "멜스튜디오 — 업종별 랜딩페이지 쇼케이스",
  description:
    "내 사업을 홍보할 웹사이트를 찾으시나요? 카페부터 병원까지, 업종에 맞는 랜딩페이지를 데스크탑·모바일로 미리보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
