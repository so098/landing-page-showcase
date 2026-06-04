"use client";

import { useState } from "react";
import type { Review } from "@melstudio/shared";
import { fetchReviews } from "@/lib/api";
import { REVIEW_PAGE_SIZE } from "@/lib/reviews";

// 날짜 포맷: 2026.05.28
// timeZone을 고정해 서버 렌더(초기 페이지)와 클라이언트 렌더의 결과가 항상 일치하도록 한다
// (고정하지 않으면 런타임 TZ 차이로 하이드레이션 불일치가 날 수 있다).
const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

function formatDate(iso: string): string {
  // ko-KR은 "2026. 05. 28." 형태로 내므로 점+공백을 점으로 정리
  return dateFmt.format(new Date(iso)).replace(/\.\s?/g, ".").replace(/\.$/, "");
}

// 홈 고객 리뷰 섹션 — 테이블 + 번호 페이지네이션.
// 초기 페이지(page 1)는 page.tsx(ISR)가 서버에서 fetch해 props로 주입(SSR·SEO·초기 LCP).
// 페이지 번호 클릭 시 클라이언트가 해당 페이지를 API에서 직접 fetch해 행만 교체한다(하이브리드).
// 리뷰가 없으면(빌드 시 API 다운 등) 섹션을 통째로 숨긴다.
export default function ReviewSection({
  initialItems,
  total,
  pageSize = REVIEW_PAGE_SIZE,
}: {
  initialItems: Review[];
  total: number;
  pageSize?: number;
}) {
  const [items, setItems] = useState<Review[]>(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function goToPage(next: number) {
    if (next === page || next < 1 || next > totalPages || loading) return;
    setLoading(true);
    setError(false);
    try {
      const { items: rows } = await fetchReviews({ limit: pageSize, page: next });
      setItems(rows);
      setPage(next);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-surface-dark px-5 py-20 text-white">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="font-display text-[34px] font-semibold leading-[1.18] tracking-[-0.374px] sm:text-[40px]">
          고객 리뷰
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[17px] leading-[1.47] tracking-[-0.374px] text-white/72">
          랜딩,픽으로 랜딩페이지를 만든 사장님들의 후기예요.
        </p>
      </div>

      {/* 리뷰 테이블 — 작성자 · 내용 · 날짜 */}
      <div className="mx-auto mt-10 max-w-4xl overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/15 text-xs font-normal tracking-[-0.08px] text-white/56">
              <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                작성자
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                내용
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-medium">
                날짜
              </th>
            </tr>
          </thead>
          <tbody aria-busy={loading}>
            {items.map((r) => (
              <tr
                key={r.id}
                className="border-b border-white/8 align-top transition-colors hover:bg-white/[0.03]"
              >
                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium tracking-[-0.12px] text-white/72">
                  {r.authorName}
                </td>
                <td className="px-4 py-4 text-[15px] leading-[1.5] tracking-[-0.2px] text-white/88">
                  {r.body}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-xs tracking-[-0.08px] text-white/45">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-accent-sky">
          리뷰를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {/* 번호 페이지네이션 (1 2 3 …) */}
      {totalPages > 1 && (
        <nav
          aria-label="리뷰 페이지"
          className="mx-auto mt-8 flex max-w-4xl items-center justify-center gap-1.5"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
            const active = n === page;
            return (
              <button
                key={n}
                type="button"
                onClick={() => goToPage(n)}
                disabled={loading}
                aria-current={active ? "page" : undefined}
                aria-label={`${n}페이지`}
                className={`h-9 w-9 rounded-full text-sm tabular-nums transition-colors disabled:cursor-not-allowed ${
                  active
                    ? "bg-white font-semibold text-surface-dark"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {n}
              </button>
            );
          })}
        </nav>
      )}
    </section>
  );
}
