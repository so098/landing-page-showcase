"use client";

import SiteHeader from "@/components/SiteHeader";
import OrderForm from "@/components/OrderForm";

// 헤더 "주문하기" 진입 — 디자인을 고르지 않고 바로 작성하는 주문서
export default function OrderEntryPage() {
  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-4">
        <OrderForm showcase={null} categoryLabel="" />
      </main>
    </div>
  );
}
