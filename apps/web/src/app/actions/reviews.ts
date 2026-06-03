"use server";

import { updateTag } from "next/cache";
import { ReviewCreateSchema } from "@melstudio/shared";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// useActionState가 다루는 폼 상태.
// - fieldErrors: 필드별 검증 에러 (이름/내용)
// - error: 제출 자체 실패 (네트워크/서버) 안내
// - ok: 성공 여부 — 폼에서 입력 초기화/안내에 사용
// - values: 검증/제출 실패 시 사용자가 입력한 값을 에코 — 입력칸 복원용
//           (설계서 §4 "검증 실패 → 입력값 유지" 요구사항)
export type ReviewFormState = {
  fieldErrors?: { authorName?: string; body?: string };
  error?: string;
  ok?: boolean;
  values?: { authorName?: string; body?: string };
};

// 리뷰 작성 Server Action.
// 폼 제출이 항상 Next.js(같은 프로세스)를 거치므로, Express 웹훅 대신
// 여기서 직접 "reviews" 태그 캐시를 무효화해 홈을 즉시 갱신한다.
//
// Next 16에서 단일 인자 revalidateTag는 deprecated(프로필 인자 필요).
// 대신 updateTag를 쓴다 — Server Action 전용이며 read-your-own-writes 보장:
// 제출 직후 다음 요청에서 작성자 본인이 자기 리뷰를 바로 본다(스펙 의도와 일치).
export async function submitReview(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  // 제출값은 검증/제출 실패 시 입력칸 복원에 쓰이므로 미리 추출해 둔다.
  const authorName = String(formData.get("authorName") ?? "");
  const body = String(formData.get("body") ?? "");
  const values = { authorName, body };

  const parsed = ReviewCreateSchema.safeParse({ authorName, body });

  if (!parsed.success) {
    const fieldErrors: ReviewFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "authorName" && !fieldErrors.authorName) fieldErrors.authorName = issue.message;
      if (key === "body" && !fieldErrors.body) fieldErrors.body = issue.message;
    }
    return { fieldErrors, values };
  }

  try {
    const res = await fetch(`${BASE}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      return { error: "잠시 후 다시 시도해 주세요.", values };
    }
  } catch {
    return { error: "잠시 후 다시 시도해 주세요.", values };
  }

  // 새 리뷰가 포함되도록 홈의 reviews 태그 캐시를 무효화
  updateTag("reviews");
  return { ok: true };
}
