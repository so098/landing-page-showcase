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

export function saveOrder(state: SavedOrderState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ORDER_KEY, JSON.stringify(state));
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
