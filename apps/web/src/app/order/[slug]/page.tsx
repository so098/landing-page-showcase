"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useShowcaseBySlug, useCategories } from "@/lib/queries";
import SiteHeader from "@/components/SiteHeader";
import OrderForm from "@/components/OrderForm";

// 쇼케이스(디자인)를 고른 뒤 진입하는 주문서
export default function OrderWithShowcasePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { showcase, isLoading, isError } = useShowcaseBySlug(slug);
  const categoriesQuery = useCategories();

  const categoryLabel = useMemo(() => {
    if (!showcase) return "";
    const cat = categoriesQuery.data?.find((c) => c.id === showcase.category);
    return cat?.label ?? showcase.category;
  }, [categoriesQuery.data, showcase]);

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-4">
        {isError ? (
          <p className="py-24 text-center text-wine/60">
            데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요.
          </p>
        ) : isLoading ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : !showcase ? (
          <div className="py-24 text-center">
            <p className="text-wine/60">해당 디자인을 찾을 수 없어요.</p>
            <Link
              href="/showcase"
              className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-crimson"
            >
              쇼케이스 둘러보기
            </Link>
          </div>
        ) : (
          <OrderForm showcase={showcase} categoryLabel={categoryLabel} />
        )}
      </main>
    </div>
  );
}
