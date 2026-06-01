// 주문서 → 생성 결과 페이지 간 데이터 전달용 sessionStorage 헬퍼.
// (백엔드 연동 전 목(mock) 단계 — API 연동 시 주문 ID 기반 조회로 대체 예정)

export type SavedOrderState = {
  showcaseId?: string;
  form: {
    businessName: string;
    phone: string;
    email: string;
    industry: string;
    links: string;
    targetProfile: string;
    targetPain: string;
    targetMessage: string;
    targetHesitation: string;
    avoidFeel: string;
    referenceSites: string;
    preferredColors: string;
    copyText: string;
  };
  purpose: string | null;
  selectedInfo: string[];
  infoContents: Record<string, string>;
  pages: string[];
  moods: string[];
  hasBrandColors: boolean | null;
};

const ORDER_KEY = "melstudio:order";
const EDITS_KEY = "melstudio:edits-remaining";

// 페이지당 수정 가능 횟수
export const EDIT_LIMIT = 3;

export function saveOrder(state: SavedOrderState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ORDER_KEY, JSON.stringify(state));
  // 새 페이지가 생성되면 수정 횟수도 초기화
  sessionStorage.setItem(EDITS_KEY, String(EDIT_LIMIT));
}

// 남은 수정 횟수 조회 (기록 없으면 기본 3회)
export function getRemainingEdits(): number {
  if (typeof window === "undefined") return EDIT_LIMIT;
  const raw = sessionStorage.getItem(EDITS_KEY);
  if (raw === null) return EDIT_LIMIT;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(EDIT_LIMIT, n)) : EDIT_LIMIT;
}

// 수정 1회 차감 후 남은 횟수 반환
export function consumeEdit(): number {
  const next = Math.max(0, getRemainingEdits() - 1);
  if (typeof window !== "undefined") sessionStorage.setItem(EDITS_KEY, String(next));
  return next;
}

export function loadOrder(): SavedOrderState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ORDER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedOrderState;
  } catch {
    return null;
  }
}
