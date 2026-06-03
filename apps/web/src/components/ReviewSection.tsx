import type { Review } from "@melstudio/shared";
import ReviewForm from "./ReviewForm";

// 날짜 포맷: 2026.05.28 (서버에서 ko-KR 기준으로 포맷 — 클라이언트 로케일 영향 없음)
const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(iso: string): string {
  // ko-KR은 "2026. 05. 28." 형태로 내므로 점+공백을 점으로 정리
  return dateFmt.format(new Date(iso)).replace(/\.\s?/g, ".").replace(/\.$/, "");
}

// 홈 고객 리뷰 섹션 — 서버 컴포넌트.
// 데이터는 page.tsx(ISR)가 fetchReviews로 받아 props로 주입한다.
// 리뷰가 없으면(빌드 시 API 다운 등) 섹션을 통째로 숨긴다.
export default function ReviewSection({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="text-center">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          고객 <span className="text-crimson">리뷰</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-wine/65">
          멜스튜디오로 랜딩페이지를 만든 사장님들의 후기예요.
        </p>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="flex flex-col rounded-3xl border border-rose/15 bg-cream p-6 shadow-soft"
          >
            <p className="flex-1 text-sm leading-relaxed text-wine/80">{r.body}</p>
            <p className="mt-5 text-xs font-semibold text-wine/55">
              {r.authorName} · {formatDate(r.createdAt)}
            </p>
          </li>
        ))}
      </ul>

      <ReviewForm />
    </section>
  );
}
