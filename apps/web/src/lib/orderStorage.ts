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
const GENERATED_KEY = "melstudio:generated-landing";
const EDITS_KEY = "melstudio:edits-remaining";
const REFUND_KEY = "melstudio:refund";

// 환불 처리 결과 — 결제가 목(mock) 단계라 환불도 목으로만 기록한다.
// 실제 환불 API/상태는 5순위 결제 연동 시 백엔드로 승격한다.
export type GeneratedLandingState = {
  jobId: string;
  previewUrl?: string;
  status: string;
  modelUsed: string;
  generatedAt: string;
  quality: Array<{ name: string; ok: boolean; stdout: string; stderr: string }>;
  notes: string[];
};

export type RefundState = {
  reason: string;
  refundedAt: string; // ISO 문자열
};

// 페이지당 수정 가능 횟수
export const EDIT_LIMIT = 3;

export function saveOrder(state: SavedOrderState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ORDER_KEY, JSON.stringify(state));
  // 새 페이지가 생성되면 수정 횟수도 초기화하고, 이전 환불 기록도 비운다
  sessionStorage.setItem(EDITS_KEY, String(EDIT_LIMIT));
  sessionStorage.removeItem(GENERATED_KEY);
  sessionStorage.removeItem(REFUND_KEY);
}

export function saveGeneratedLanding(state: Omit<GeneratedLandingState, "generatedAt">): GeneratedLandingState {
  const next: GeneratedLandingState = { ...state, generatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(GENERATED_KEY, JSON.stringify(next));
  }
  return next;
}

export function loadGeneratedLanding(): GeneratedLandingState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(GENERATED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GeneratedLandingState;
  } catch {
    return null;
  }
}

// 환불 처리(목) — 사유를 시각과 함께 저장한다. 실제 환불 API는 아직 없음.
export function saveRefund(reason: string): RefundState {
  const state: RefundState = { reason, refundedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(REFUND_KEY, JSON.stringify(state));
  }
  return state;
}

// 환불 기록 조회 — 없으면 null (= 아직 환불 안 함)
export function getRefund(): RefundState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(REFUND_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RefundState;
  } catch {
    return null;
  }
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
