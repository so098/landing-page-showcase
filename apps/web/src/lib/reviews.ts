// 리뷰 페이지네이션 상수 — 서버 컴포넌트(page.tsx)와 클라이언트 컴포넌트(ReviewSection)가 공유.
// "use client" 모듈에 두면 서버에서 import 시 client reference가 되어 값이 undefined가 되므로,
// 반드시 이 중립(서버/클라이언트 양쪽 import 가능) 모듈에 둔다.
export const REVIEW_PAGE_SIZE = 5;
