"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import OrderForm from "@/components/OrderForm";

// 헤더 "주문하기" 진입 — 디자인을 고르지 않고 바로 작성하는 주문서.
// ?edit=1   : 이전 주문서 내용을 불러와 수정
// ?mode=human : 사람에게 주문하기(카톡 연락) 모드
function OrderEntry() {
  const searchParams = useSearchParams();
  const restore = searchParams.get("edit") === "1";
  const mode = searchParams.get("mode") === "human" ? "human" : "ai";

  return <OrderForm showcase={null} categoryLabel="" mode={mode} restore={restore} />;
}

export default function OrderEntryPage() {
  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-4">
        <Suspense fallback={<p className="py-24 text-center text-ink-muted/50">불러오는 중…</p>}>
          <OrderEntry />
        </Suspense>
      </main>
    </div>
  );
}
