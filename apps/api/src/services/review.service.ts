import type { Review, ReviewCreate, ReviewList } from "@melstudio/shared";
import { prisma } from "../lib/prisma.js";

// 이름 마스킹 — 두 번째 글자를 `*`로 치환.
// 마스킹을 서버에서 하는 이유: API 응답에 풀네임이 아예 노출되지 않게 하기 위함.
// 클라이언트 마스킹은 네트워크 탭에서 원본이 보여 의미가 없다.
//   김민수 → 김*수, 남궁민수 → 남*민수, 이준 → 이*, 외자(김) → *
export function maskName(name: string): string {
  if (name.length <= 1) return "*";
  return name[0] + "*" + name.slice(2);
}

// DB Review 행 → 퍼블릭 Review (이름 마스킹 적용)
function toReview(row: {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
}): Review {
  return {
    id: row.id,
    authorName: maskName(row.authorName),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

// 리뷰 목록 — 최신순, 페이지네이션(1-based). total로 전체 페이지 수를 계산한다.
export async function listReviews(args: {
  limit: number;
  page?: number;
}): Promise<ReviewList> {
  const page = args.page ?? 1;
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * args.limit,
      take: args.limit,
    }),
    prisma.review.count(),
  ]);
  return { items: rows.map(toReview), total };
}

export async function createReview(input: ReviewCreate): Promise<Review> {
  const row = await prisma.review.create({
    data: { authorName: input.authorName, body: input.body },
  });
  return toReview(row);
}
