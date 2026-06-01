// 기존 apps/web/src/data/showcase.ts 에서 이관한 원본 데이터.
// (퍼블릭 slug = 기존 id, category = 기존 category slug)

export const SEED_CATEGORIES: { slug: string; label: string; order: number }[] = [
  { slug: "cafe", label: "카페·베이커리", order: 1 },
  { slug: "beauty", label: "뷰티·살롱", order: 2 },
  { slug: "fitness", label: "헬스·피트니스", order: 3 },
  { slug: "education", label: "교육·클래스", order: 4 },
  { slug: "shop", label: "쇼핑몰", order: 5 },
  { slug: "clinic", label: "병원·클리닉", order: 6 },
  { slug: "restaurant", label: "레스토랑", order: 7 },
  { slug: "realestate", label: "부동산·공간", order: 8 },
];

export const SEED_SHOWCASES: {
  slug: string;
  title: string;
  category: string;
  blurb: string;
  accent: string;
  layout: string;
}[] = [
  // 카페·베이커리
  { slug: "cafe-bloom", title: "블룸 로스터스", category: "cafe", blurb: "스페셜티 원두 구독 브랜드", accent: "#C2410C", layout: "hero" },
  { slug: "cafe-mellow", title: "멜로우 베이크하우스", category: "cafe", blurb: "수제 디저트 & 케이크 주문", accent: "#B45309", layout: "split" },
  { slug: "cafe-noon", title: "정오의 커피", category: "cafe", blurb: "동네 카페 브랜딩 페이지", accent: "#92400E", layout: "minimal" },
  { slug: "cafe-dune", title: "듄 커피바", category: "cafe", blurb: "원두 정기배송 랜딩", accent: "#A16207", layout: "grid" },
  { slug: "cafe-petal", title: "페탈 티하우스", category: "cafe", blurb: "프리미엄 티 셀렉션", accent: "#BE185D", layout: "hero" },
  { slug: "cafe-stone", title: "스톤 브루잉", category: "cafe", blurb: "콜드브루 구독 서비스", accent: "#7C2D12", layout: "split" },

  // 뷰티·살롱
  { slug: "beauty-lush", title: "러쉬 뷰티랩", category: "beauty", blurb: "피부관리 예약 랜딩", accent: "#DB2777", layout: "split" },
  { slug: "beauty-aura", title: "아우라 살롱", category: "beauty", blurb: "헤어 살롱 예약 & 시술", accent: "#E11D48", layout: "hero" },
  { slug: "beauty-petale", title: "페탈 네일", category: "beauty", blurb: "네일아트 포트폴리오", accent: "#F43F5E", layout: "grid" },
  { slug: "beauty-glow", title: "글로우 스킨", category: "beauty", blurb: "스킨케어 브랜드 출시", accent: "#EC4899", layout: "minimal" },
  { slug: "beauty-velvet", title: "벨벳 메이크업", category: "beauty", blurb: "메이크업 클래스 모집", accent: "#BE123C", layout: "split" },

  // 헬스·피트니스
  { slug: "fit-iron", title: "아이언 스튜디오", category: "fitness", blurb: "PT 회원권 랜딩", accent: "#0F766E", layout: "hero" },
  { slug: "fit-pulse", title: "펄스 필라테스", category: "fitness", blurb: "필라테스 체험 예약", accent: "#0E7490", layout: "split" },
  { slug: "fit-summit", title: "써밋 클라이밍", category: "fitness", blurb: "클라이밍짐 멤버십", accent: "#1D4ED8", layout: "grid" },
  { slug: "fit-zen", title: "젠 요가", category: "fitness", blurb: "요가 클래스 구독", accent: "#7E22CE", layout: "minimal" },
  { slug: "fit-bolt", title: "볼트 크로스핏", category: "fitness", blurb: "크로스핏 박스 오픈", accent: "#DC2626", layout: "hero" },

  // 교육·클래스
  { slug: "edu-spark", title: "스파크 코딩", category: "education", blurb: "코딩 부트캠프 모집", accent: "#2563EB", layout: "split" },
  { slug: "edu-lingo", title: "링고 어학원", category: "education", blurb: "회화 클래스 신청", accent: "#0891B2", layout: "hero" },
  { slug: "edu-canvas", title: "캔버스 미술학원", category: "education", blurb: "취미미술 클래스", accent: "#EA580C", layout: "grid" },
  { slug: "edu-note", title: "노트 음악교실", category: "education", blurb: "1:1 악기 레슨 예약", accent: "#7C3AED", layout: "minimal" },

  // 쇼핑몰
  { slug: "shop-mode", title: "모드 셀렉트", category: "shop", blurb: "패션 편집샵 신상 출시", accent: "#18181B", layout: "grid" },
  { slug: "shop-bloom", title: "블룸 플라워", category: "shop", blurb: "플라워 정기구독", accent: "#DB2777", layout: "hero" },
  { slug: "shop-fresh", title: "프레시 마켓", category: "shop", blurb: "유기농 식료품 배송", accent: "#16A34A", layout: "split" },
  { slug: "shop-tech", title: "테크기어", category: "shop", blurb: "가전 신제품 사전예약", accent: "#0D9488", layout: "grid" },
  { slug: "shop-home", title: "홈앤리브", category: "shop", blurb: "리빙 소품 쇼핑몰", accent: "#A16207", layout: "minimal" },
  { slug: "shop-pet", title: "포포 펫샵", category: "shop", blurb: "반려동물 용품 구독", accent: "#EA580C", layout: "hero" },

  // 병원·클리닉
  { slug: "clinic-smile", title: "스마일 치과", category: "clinic", blurb: "치과 진료예약 랜딩", accent: "#0284C7", layout: "split" },
  { slug: "clinic-derma", title: "더마 피부과", category: "clinic", blurb: "피부과 시술 안내", accent: "#E11D48", layout: "hero" },
  { slug: "clinic-heal", title: "힐 한의원", category: "clinic", blurb: "한방 클리닉 예약", accent: "#15803D", layout: "minimal" },
  { slug: "clinic-vision", title: "비전 안과", category: "clinic", blurb: "라식·라섹 상담신청", accent: "#1D4ED8", layout: "grid" },

  // 레스토랑
  { slug: "rest-table", title: "테이블 14", category: "restaurant", blurb: "파인다이닝 예약 페이지", accent: "#991B1B", layout: "hero" },
  { slug: "rest-grill", title: "스모크 그릴", category: "restaurant", blurb: "수제 버거 매장 오픈", accent: "#9A3412", layout: "split" },
  { slug: "rest-pasta", title: "파스타 마노", category: "restaurant", blurb: "이탈리안 레스토랑", accent: "#B91C1C", layout: "grid" },
  { slug: "rest-omakase", title: "오마카세 무", category: "restaurant", blurb: "예약제 스시 오마카세", accent: "#1C1917", layout: "minimal" },
  { slug: "rest-vegan", title: "그린 보울", category: "restaurant", blurb: "비건 레스토랑 브랜딩", accent: "#15803D", layout: "hero" },

  // 부동산·공간
  { slug: "estate-nest", title: "네스트 부동산", category: "realestate", blurb: "신축 분양 랜딩", accent: "#0F766E", layout: "split" },
  { slug: "estate-loft", title: "로프트 오피스", category: "realestate", blurb: "공유오피스 입주안내", accent: "#1E293B", layout: "grid" },
  { slug: "estate-stay", title: "스테이 한옥", category: "realestate", blurb: "독채 스테이 예약", accent: "#92400E", layout: "hero" },
  { slug: "estate-space", title: "스페이스 대관", category: "realestate", blurb: "파티룸·스튜디오 대관", accent: "#7C3AED", layout: "minimal" },
];
