"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Toast from "./Toast";

// OAuth 실패 시 API가 web을 `/?error=csrf|oauth|provider`로 리다이렉트한다.
// 그 쿼리를 읽어 사용자에게 일반 안내 토스트를 띄운다(원문/시크릿은 노출 안 함).
// useSearchParams를 쓰므로 부모는 <Suspense>로 감싸야 한다.
const MESSAGES: Record<string, string> = {
  csrf: "보안 검증에 실패했어요. 다시 시도해 주세요.",
  oauth: "로그인 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
  provider: "지금은 이용할 수 없는 로그인 방식이에요.",
};

export default function AuthErrorToast() {
  const error = useSearchParams().get("error");
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  if (!error || dismissed) return null;

  const message = MESSAGES[error] ?? "로그인에 실패했어요. 다시 시도해 주세요.";

  function handleDismiss() {
    setDismissed(true);
    // 새로고침 시 토스트가 다시 뜨지 않도록 URL에서 error 쿼리를 제거한다.
    router.replace(pathname);
  }

  return <Toast message={message} tone="error" duration={5000} onDismiss={handleDismiss} />;
}
