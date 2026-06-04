"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitReview, type ReviewFormState } from "@/app/actions/reviews";

// 리뷰 작성 폼.
// action을 prop으로 주입받아(기본값 = submitReview Server Action) 테스트에서
// 가짜 액션으로 검증 상태/성공/실패 흐름을 확인할 수 있게 한다.
//
// 홈(ReviewSection)과 마이페이지 리뷰 모달 양쪽에서 재사용한다:
// - defaultAuthorName: 로그인 사용자 이름을 이름칸에 미리 채운다 (마이페이지).
// - onSuccess: 제출 성공 시 부모에게 알린다 — 모달 닫기 + 감사 토스트 트리거용.
// - variant="modal": 모달 안에 들어갈 때 자체 카드 테두리/제목을 생략한다
//   (모달 자체가 카드/제목을 제공하므로 중복 방지).
export default function ReviewForm({
  action = submitReview,
  defaultAuthorName,
  onSuccess,
  variant = "section",
}: {
  action?: (prev: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
  defaultAuthorName?: string;
  onSuccess?: () => void;
  variant?: "section" | "modal";
}) {
  const [state, formAction] = useActionState<ReviewFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const isModal = variant === "modal";
  const labelClass = isModal ? "text-ink" : "text-white";
  const helpClass = isModal ? "text-ink-muted/55" : "text-white/56";

  // 연타 제출 가드 — useFormStatus().pending 비활성화는 리렌더 이후에야 적용되므로
  // 그 전에 들어온 두 번째 클릭은 막지 못한다. 제출 시작 시 동기적으로 플래그를 세워
  // 동일 폼의 중복 제출(중복 리뷰 저장)을 차단한다.
  const isSubmittingRef = useRef(false);

  // 성공하면 입력값 초기화 (revalidateTag로 리스트는 서버가 갱신)
  // + 부모에게 성공을 알린다 (모달 닫기/토스트). state 객체 자체를 의존성에 둬
  //   매 제출 성공마다 새 state가 와서 onSuccess가 빠짐없이 호출되게 한다.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onSuccess?.();
    }
    // onSuccess는 부모가 안정적으로 넘긴다는 전제 — state 변화에만 반응시킨다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
      className={
        isModal
          ? ""
          : "mx-auto mt-10 max-w-6xl border border-white/12 bg-surface-dark-2 p-6 sm:p-8"
      }
    >
      {/* 모달 변형에서는 모달 헤더가 제목/설명을 제공하므로 생략 */}
      {!isModal && (
        <>
          <h3 className="font-display text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-white">
            후기를 남겨주세요
          </h3>
          <p className="mt-1 text-sm leading-[1.43] tracking-[-0.224px] text-white/56">
            랜딩,픽에서 만든 페이지가 마음에 드셨다면 한마디 부탁드려요.
          </p>
        </>
      )}

      {state.ok && (
        <p className="mt-4 rounded-lg border border-accent/30 bg-white px-4 py-3 text-sm font-normal text-accent">
          소중한 후기 감사합니다. 잠시 후 목록에 반영돼요.
        </p>
      )}
      {state.error && (
        <p className="mt-4 rounded-lg border border-accent/30 bg-white px-4 py-3 text-sm font-normal text-accent">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="review-authorName" className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
            이름
          </label>
          <input
            // key를 state.values에 묶어, 검증 실패로 새 state가 오면 input을
            // 리마운트해 defaultValue(에코된 제출값)를 다시 반영한다.
            // (비제어 input은 리렌더만으로는 defaultValue 변경이 적용되지 않음)
            // 첫 마운트 시엔 에코값이 없으므로 defaultAuthorName(로그인 이름)을 채운다.
            key={`authorName-${state.values?.authorName ?? defaultAuthorName ?? ""}`}
            id="review-authorName"
            name="authorName"
            type="text"
            placeholder="홍길동"
            defaultValue={state.values?.authorName ?? defaultAuthorName ?? ""}
            aria-invalid={!!state.fieldErrors?.authorName}
            className={`w-full rounded-full border bg-white px-5 py-3 text-[17px] tracking-[-0.374px] text-ink placeholder:text-ink-muted/35 transition-colors focus:outline-none focus:ring-2 ${
              state.fieldErrors?.authorName
                ? "border-accent focus:ring-accent/30"
                : "border-hairline focus:border-accent focus:ring-accent/20"
            }`}
          />
          {state.fieldErrors?.authorName && (
            <p className="mt-1.5 text-xs font-medium text-accent">
              {state.fieldErrors.authorName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="review-body" className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
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
            className={`w-full resize-none rounded-[18px] border bg-white px-5 py-3 text-[17px] leading-[1.47] tracking-[-0.374px] text-ink placeholder:text-ink-muted/35 transition-colors focus:outline-none focus:ring-2 ${
              state.fieldErrors?.body
                ? "border-accent focus:ring-accent/30"
                : "border-hairline focus:border-accent focus:ring-accent/20"
            }`}
          />
          {state.fieldErrors?.body && (
            <p className="mt-1.5 text-xs font-medium text-accent">{state.fieldErrors.body}</p>
          )}
        </div>

        <p className={`text-xs leading-none tracking-[-0.12px] ${helpClass}`}>
          등록된 후기는 검토 후 홈 화면에 표시됩니다.
        </p>
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
      className="self-start rounded-full bg-accent px-[22px] py-[11px] text-[17px] font-normal tracking-[-0.374px] text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "등록 중…" : "후기 등록"}
    </button>
  );
}
