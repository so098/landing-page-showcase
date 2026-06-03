"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitReview, type ReviewFormState } from "@/app/actions/reviews";

// 리뷰 작성 폼.
// action을 prop으로 주입받아(기본값 = submitReview Server Action) 테스트에서
// 가짜 액션으로 검증 상태/성공/실패 흐름을 확인할 수 있게 한다.
export default function ReviewForm({
  action = submitReview,
}: {
  action?: (prev: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
}) {
  const [state, formAction] = useActionState<ReviewFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 연타 제출 가드 — useFormStatus().pending 비활성화는 리렌더 이후에야 적용되므로
  // 그 전에 들어온 두 번째 클릭은 막지 못한다. 제출 시작 시 동기적으로 플래그를 세워
  // 동일 폼의 중복 제출(중복 리뷰 저장)을 차단한다.
  const isSubmittingRef = useRef(false);

  // 성공하면 입력값 초기화 (revalidateTag로 리스트는 서버가 갱신)
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  // 액션 완료(성공/실패 모두 새 state 도착)되면 가드를 풀어 재제출을 허용한다.
  useEffect(() => {
    isSubmittingRef.current = false;
  }, [state]);

  // form action 래퍼: 진행 중이면 제출을 동기적으로 무시한다.
  function guardedAction(formData: FormData) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    formAction(formData);
  }

  return (
    <form
      ref={formRef}
      action={guardedAction}
      className="mt-10 rounded-3xl border border-rose/15 bg-cream p-6 shadow-soft sm:p-8"
    >
      <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
        후기를 남겨주세요
      </h3>
      <p className="mt-1 text-xs text-wine/55 sm:text-sm">
        멜스튜디오에서 만든 페이지가 마음에 드셨다면 한마디 부탁드려요.
      </p>

      {state.ok && (
        <p className="mt-4 rounded-xl border border-rose/20 bg-white px-4 py-3 text-sm font-medium text-crimson">
          소중한 후기 감사합니다. 잠시 후 목록에 반영돼요.
        </p>
      )}
      {state.error && (
        <p className="mt-4 rounded-xl border border-crimson/30 bg-white px-4 py-3 text-sm font-medium text-crimson">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="review-authorName" className="mb-1.5 block text-sm font-semibold text-ink">
            이름
          </label>
          <input
            // key를 state.values에 묶어, 검증 실패로 새 state가 오면 input을
            // 리마운트해 defaultValue(에코된 제출값)를 다시 반영한다.
            // (비제어 input은 리렌더만으로는 defaultValue 변경이 적용되지 않음)
            key={`authorName-${state.values?.authorName ?? ""}`}
            id="review-authorName"
            name="authorName"
            type="text"
            placeholder="홍길동"
            defaultValue={state.values?.authorName ?? ""}
            aria-invalid={!!state.fieldErrors?.authorName}
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:outline-none focus:ring-2 ${
              state.fieldErrors?.authorName
                ? "border-crimson focus:ring-crimson/30"
                : "border-rose/20 focus:border-rose focus:ring-rose/20"
            }`}
          />
          {state.fieldErrors?.authorName && (
            <p className="mt-1.5 text-xs font-medium text-crimson">
              {state.fieldErrors.authorName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="review-body" className="mb-1.5 block text-sm font-semibold text-ink">
            내용
          </label>
          <textarea
            // key/defaultValue로 검증 실패 시 입력 내용을 복원 (위 input과 동일 의도)
            key={`body-${state.values?.body ?? ""}`}
            id="review-body"
            name="body"
            rows={4}
            placeholder="어떤 점이 좋았는지 적어주세요 (10자 이상)"
            defaultValue={state.values?.body ?? ""}
            aria-invalid={!!state.fieldErrors?.body}
            className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:outline-none focus:ring-2 ${
              state.fieldErrors?.body
                ? "border-crimson focus:ring-crimson/30"
                : "border-rose/20 focus:border-rose focus:ring-rose/20"
            }`}
          />
          {state.fieldErrors?.body && (
            <p className="mt-1.5 text-xs font-medium text-crimson">{state.fieldErrors.body}</p>
          )}
        </div>

        <SubmitButton />
      </div>
    </form>
  );
}

// 제출 중 비활성화 — useFormStatus는 form 하위 컴포넌트에서만 동작
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-full bg-rose-grad px-8 py-3 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "등록 중…" : "후기 등록"}
    </button>
  );
}
