// ─────────────────────────────────────────────────────────────
// 쇼케이스 데이터
//
// 실제 스크린샷 연동 방법:
//   1. public/showcase/<id>/ 폴더를 만들고 아래 파일을 넣으세요
//        - desktop.png  (데스크탑 캡처)
//        - mobile.png   (모바일 캡처)
//        - thumb.png    (카드 썸네일, 없으면 desktop.png 권장)
//   2. 해당 항목의 desktop / mobile / thumb 필드에 경로를 적으세요
//        예) desktop: "/showcase/cafe-bloom/desktop.png"
//   3. 경로가 비어 있으면 자동으로 "핑크 미니 목업" 플레이스홀더가 렌더됩니다.
// ─────────────────────────────────────────────────────────────

export type CategoryId =
  | "all"
  | "cafe"
  | "beauty"
  | "fitness"
  | "education"
  | "shop"
  | "clinic"
  | "restaurant"
  | "realestate";

export type Category = {
  id: CategoryId;
  label: string;
};

export type MockLayout = "hero" | "split" | "grid" | "minimal";

export type Showcase = {
  id: string;
  title: string;
  category: Exclude<CategoryId, "all">;
  blurb: string;
  /** 플레이스홀더 목업 강조색 (실제 스크린샷이 없을 때 사용) */
  accent: string;
  /** 플레이스홀더 목업 레이아웃 변형 */
  layout: MockLayout;
  /** 실제 스크린샷 경로 (선택) */
  desktop?: string;
  mobile?: string;
  thumb?: string;
};

export const CATEGORIES: Category[] = [
  { id: "all", label: "전체" },
  { id: "cafe", label: "카페·베이커리" },
  { id: "beauty", label: "뷰티·살롱" },
  { id: "fitness", label: "헬스·피트니스" },
  { id: "education", label: "교육·클래스" },
  { id: "shop", label: "쇼핑몰" },
  { id: "clinic", label: "병원·클리닉" },
  { id: "restaurant", label: "레스토랑" },
  { id: "realestate", label: "부동산·공간" },
];

export const SHOWCASES: Showcase[] = [
  // 카페·베이커리
  { id: "cafe-bloom", title: "블룸 로스터스", category: "cafe", blurb: "스페셜티 원두 구독 브랜드", accent: "#C2410C", layout: "hero" },
  { id: "cafe-mellow", title: "멜로우 베이크하우스", category: "cafe", blurb: "수제 디저트 & 케이크 주문", accent: "#B45309", layout: "split" },
  { id: "cafe-noon", title: "정오의 커피", category: "cafe", blurb: "동네 카페 브랜딩 페이지", accent: "#92400E", layout: "minimal" },
  { id: "cafe-dune", title: "듄 커피바", category: "cafe", blurb: "원두 정기배송 랜딩", accent: "#A16207", layout: "grid" },
  { id: "cafe-petal", title: "페탈 티하우스", category: "cafe", blurb: "프리미엄 티 셀렉션", accent: "#BE185D", layout: "hero" },
  { id: "cafe-stone", title: "스톤 브루잉", category: "cafe", blurb: "콜드브루 구독 서비스", accent: "#7C2D12", layout: "split" },

  // 뷰티·살롱
  { id: "beauty-lush", title: "러쉬 뷰티랩", category: "beauty", blurb: "피부관리 예약 랜딩", accent: "#DB2777", layout: "split" },
  { id: "beauty-aura", title: "아우라 살롱", category: "beauty", blurb: "헤어 살롱 예약 & 시술", accent: "#E11D48", layout: "hero" },
  { id: "beauty-petale", title: "페탈 네일", category: "beauty", blurb: "네일아트 포트폴리오", accent: "#F43F5E", layout: "grid" },
  { id: "beauty-glow", title: "글로우 스킨", category: "beauty", blurb: "스킨케어 브랜드 출시", accent: "#EC4899", layout: "minimal" },
  { id: "beauty-velvet", title: "벨벳 메이크업", category: "beauty", blurb: "메이크업 클래스 모집", accent: "#BE123C", layout: "split" },

  // 헬스·피트니스
  { id: "fit-iron", title: "아이언 스튜디오", category: "fitness", blurb: "PT 회원권 랜딩", accent: "#0F766E", layout: "hero" },
  { id: "fit-pulse", title: "펄스 필라테스", category: "fitness", blurb: "필라테스 체험 예약", accent: "#0E7490", layout: "split" },
  { id: "fit-summit", title: "써밋 클라이밍", category: "fitness", blurb: "클라이밍짐 멤버십", accent: "#1D4ED8", layout: "grid" },
  { id: "fit-zen", title: "젠 요가", category: "fitness", blurb: "요가 클래스 구독", accent: "#7E22CE", layout: "minimal" },
  { id: "fit-bolt", title: "볼트 크로스핏", category: "fitness", blurb: "크로스핏 박스 오픈", accent: "#DC2626", layout: "hero" },

  // 교육·클래스
  { id: "edu-spark", title: "스파크 코딩", category: "education", blurb: "코딩 부트캠프 모집", accent: "#2563EB", layout: "split" },
  { id: "edu-lingo", title: "링고 어학원", category: "education", blurb: "회화 클래스 신청", accent: "#0891B2", layout: "hero" },
  { id: "edu-canvas", title: "캔버스 미술학원", category: "education", blurb: "취미미술 클래스", accent: "#EA580C", layout: "grid" },
  { id: "edu-note", title: "노트 음악교실", category: "education", blurb: "1:1 악기 레슨 예약", accent: "#7C3AED", layout: "minimal" },

  // 쇼핑몰
  { id: "shop-mode", title: "모드 셀렉트", category: "shop", blurb: "패션 편집샵 신상 출시", accent: "#18181B", layout: "grid" },
  { id: "shop-bloom", title: "블룸 플라워", category: "shop", blurb: "플라워 정기구독", accent: "#DB2777", layout: "hero" },
  { id: "shop-fresh", title: "프레시 마켓", category: "shop", blurb: "유기농 식료품 배송", accent: "#16A34A", layout: "split" },
  { id: "shop-tech", title: "테크기어", category: "shop", blurb: "가전 신제품 사전예약", accent: "#0D9488", layout: "grid" },
  { id: "shop-home", title: "홈앤리브", category: "shop", blurb: "리빙 소품 쇼핑몰", accent: "#A16207", layout: "minimal" },
  { id: "shop-pet", title: "포포 펫샵", category: "shop", blurb: "반려동물 용품 구독", accent: "#EA580C", layout: "hero" },

  // 병원·클리닉
  { id: "clinic-smile", title: "스마일 치과", category: "clinic", blurb: "치과 진료예약 랜딩", accent: "#0284C7", layout: "split" },
  { id: "clinic-derma", title: "더마 피부과", category: "clinic", blurb: "피부과 시술 안내", accent: "#E11D48", layout: "hero" },
  { id: "clinic-heal", title: "힐 한의원", category: "clinic", blurb: "한방 클리닉 예약", accent: "#15803D", layout: "minimal" },
  { id: "clinic-vision", title: "비전 안과", category: "clinic", blurb: "라식·라섹 상담신청", accent: "#1D4ED8", layout: "grid" },

  // 레스토랑
  { id: "rest-table", title: "테이블 14", category: "restaurant", blurb: "파인다이닝 예약 페이지", accent: "#991B1B", layout: "hero" },
  { id: "rest-grill", title: "스모크 그릴", category: "restaurant", blurb: "수제 버거 매장 오픈", accent: "#9A3412", layout: "split" },
  { id: "rest-pasta", title: "파스타 마노", category: "restaurant", blurb: "이탈리안 레스토랑", accent: "#B91C1C", layout: "grid" },
  { id: "rest-omakase", title: "오마카세 무", category: "restaurant", blurb: "예약제 스시 오마카세", accent: "#1C1917", layout: "minimal" },
  { id: "rest-vegan", title: "그린 보울", category: "restaurant", blurb: "비건 레스토랑 브랜딩", accent: "#15803D", layout: "hero" },

  // 부동산·공간
  { id: "estate-nest", title: "네스트 부동산", category: "realestate", blurb: "신축 분양 랜딩", accent: "#0F766E", layout: "split" },
  { id: "estate-loft", title: "로프트 오피스", category: "realestate", blurb: "공유오피스 입주안내", accent: "#1E293B", layout: "grid" },
  { id: "estate-stay", title: "스테이 한옥", category: "realestate", blurb: "독채 스테이 예약", accent: "#92400E", layout: "hero" },
  { id: "estate-space", title: "스페이스 대관", category: "realestate", blurb: "파티룸·스튜디오 대관", accent: "#7C3AED", layout: "minimal" },
];

/** 카테고리별 항목 수 (전체 포함) */
export function countByCategory(id: CategoryId): number {
  if (id === "all") return SHOWCASES.length;
  return SHOWCASES.filter((s) => s.category === id).length;
}
