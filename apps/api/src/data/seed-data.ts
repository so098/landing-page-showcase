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

// ── 무한스크롤 체감용 추가 생성 데이터 ──────────────────────────
// 결정적(deterministic) 생성: 난수 없이 인덱스 조합으로만 만들어 시드 멱등성을 유지한다.

const GEN_PER_CATEGORY = 125;

const GEN_PREFIXES = [
  "루미", "오드", "베르", "솔레", "마노", "허브", "노바", "유노",
  "리브", "테라", "모노", "아벨", "코지", "하루", "온더",
];

const GEN_SUFFIXES: Record<string, string[]> = {
  cafe: ["커피", "로스터리", "베이커리", "티룸", "디저트바"],
  beauty: ["뷰티랩", "살롱", "스파", "네일바", "에스테틱"],
  fitness: ["짐", "필라테스", "요가스튜디오", "복싱클럽", "PT스튜디오"],
  education: ["아카데미", "클래스", "스쿨", "랩", "스튜디오"],
  shop: ["스토어", "마켓", "셀렉트샵", "부티크", "편집샵"],
  clinic: ["의원", "클리닉", "한의원", "치과", "피부과"],
  restaurant: ["키친", "다이닝", "비스트로", "그릴", "테이블"],
  realestate: ["부동산", "오피스", "스테이", "스튜디오", "라운지"],
};

const GEN_BLURBS: Record<string, string[]> = {
  cafe: ["시그니처 블렌드 소개", "디저트 신메뉴 출시", "원두 정기구독 안내", "브런치 메뉴 홍보", "매장 오픈 이벤트"],
  beauty: ["시술 예약 랜딩", "신규 고객 이벤트", "뷰티 클래스 모집", "멤버십 안내", "포트폴리오 소개"],
  fitness: ["체험 수업 신청", "회원권 프로모션", "트레이너 소개", "챌린지 모집", "신규 오픈 안내"],
  education: ["수강생 모집", "커리큘럼 안내", "무료 체험 신청", "설명회 예약", "수강 후기 소개"],
  shop: ["신상품 출시", "시즌 세일 안내", "정기구독 서비스", "브랜드 스토리", "사전예약 이벤트"],
  clinic: ["진료 예약 안내", "비대면 상담 신청", "시술 전후 안내", "건강검진 패키지", "신규 장비 도입"],
  restaurant: ["예약 페이지", "신메뉴 출시", "프라이빗 다이닝", "케이터링 안내", "오픈 기념 이벤트"],
  realestate: ["분양 안내", "입주 상담 신청", "공간 대관 안내", "투어 예약", "입지 소개"],
};

const GEN_ACCENTS = [
  "#C2410C", "#DB2777", "#0F766E", "#2563EB", "#7C3AED",
  "#EA580C", "#16A34A", "#E11D48", "#0891B2", "#A16207",
];

const GEN_LAYOUTS = ["hero", "split", "grid", "minimal"];

export function generateShowcases(
  perCategory: number = GEN_PER_CATEGORY,
): typeof SEED_SHOWCASES {
  const out: typeof SEED_SHOWCASES = [];
  SEED_CATEGORIES.forEach((cat, catIdx) => {
    const suffixes = GEN_SUFFIXES[cat.slug];
    const blurbs = GEN_BLURBS[cat.slug];
    for (let i = 0; i < perCategory; i++) {
      // 제목 조합(프리픽스 15종)이 한 바퀴 돌면 "2호점", "3호점"…으로 구분
      const round = Math.floor(i / GEN_PREFIXES.length);
      const baseTitle = `${GEN_PREFIXES[i % GEN_PREFIXES.length]} ${suffixes[i % suffixes.length]}`;
      out.push({
        slug: `${cat.slug}-gen-${i + 1}`,
        title: round === 0 ? baseTitle : `${baseTitle} ${round + 1}호점`,
        category: cat.slug,
        blurb: blurbs[i % blurbs.length],
        accent: GEN_ACCENTS[(catIdx + i) % GEN_ACCENTS.length],
        layout: GEN_LAYOUTS[(catIdx + i) % GEN_LAYOUTS.length],
      });
    }
  });
  return out;
}

// 시드에 사용하는 전체 목록 (원본 39 + 생성 1,000 = 1,039)
export const ALL_SEED_SHOWCASES = [...SEED_SHOWCASES, ...generateShowcases()];

// ── 홈 리뷰 시드 ──
// 풀네임으로 저장 (응답 시 서버에서 마스킹). 업종을 다양하게 섞었다.
// daysAgo: 기준일(시드 실행 시점)로부터 며칠 전 — 난수 대신 결정적 분산으로 멱등성 유지.
export const SEED_REVIEWS: { authorName: string; body: string; daysAgo: number }[] = [
  { authorName: "김민수", body: "카페 오픈 준비로 정신없었는데, 원하는 분위기를 정확히 잡아주셨어요. 손님들 반응이 정말 좋습니다.", daysAgo: 1 },
  { authorName: "이서연", body: "필라테스 스튜디오 예약 페이지를 맡겼는데, 예약 전환이 눈에 띄게 늘었어요. 모바일 화면이 특히 깔끔합니다.", daysAgo: 3 },
  { authorName: "박지훈", body: "치과 홈페이지를 새로 만들었습니다. 진료 안내가 한눈에 들어와서 전화 문의가 줄고 예약이 늘었어요.", daysAgo: 5 },
  { authorName: "최유진", body: "네일샵 포트폴리오 페이지가 너무 예뻐요. 인스타에서 들어온 손님들이 바로 예약을 남겨주십니다.", daysAgo: 8 },
  { authorName: "정현우", body: "코딩 부트캠프 모집 페이지를 만들었는데, 신청서 작성까지 흐름이 자연스러워서 등록률이 올랐습니다.", daysAgo: 11 },
  { authorName: "강수아", body: "플라워 정기구독 랜딩페이지 제작했어요. 사진이 돋보이게 배치돼서 브랜드 느낌이 확 살았습니다.", daysAgo: 14 },
  { authorName: "남궁민", body: "헬스장 회원권 페이지를 의뢰했습니다. 가격표가 명확하게 정리돼서 상담 문의 질이 좋아졌어요.", daysAgo: 18 },
  { authorName: "윤채원", body: "베이커리 주문 페이지가 마음에 쏙 들어요. 케이크 주문이 카톡으로 바로 연결돼서 편합니다.", daysAgo: 22 },
  { authorName: "임도현", body: "어학원 회화 클래스 신청 페이지를 만들었어요. 반응형이 잘 돼서 어디서 봐도 깔끔하게 나옵니다.", daysAgo: 27 },
  { authorName: "한지민", body: "리빙 소품 쇼핑몰 페이지를 맡겼는데, 디자인 톤이 일관돼서 단골 손님이 늘었어요. 추천합니다.", daysAgo: 33 },
  { authorName: "오세훈", body: "감성 사진관 예약 페이지를 만들었습니다. 촬영 컨셉이 사진으로 잘 전달돼서 예약 문의가 늘었어요.", daysAgo: 37 },
  { authorName: "신예은", body: "한식 다이닝 메뉴 소개 페이지가 정말 깔끔합니다. 코스 구성이 한눈에 들어와서 예약률이 좋아졌어요.", daysAgo: 40 },
  { authorName: "권태양", body: "퍼스널 트레이닝 상담 페이지를 의뢰했어요. 신청 폼이 간단해서 상담 신청이 두 배로 늘었습니다.", daysAgo: 44 },
  { authorName: "배수지", body: "수제 비누 공방 클래스 페이지를 만들었습니다. 모바일에서 신청이 매끄럽게 돼서 만족스러워요.", daysAgo: 48 },
  { authorName: "조민재", body: "법률 상담 사무소 홈페이지를 새로 했어요. 신뢰감 있는 디자인 덕분에 상담 전화가 늘었습니다.", daysAgo: 52 },
  { authorName: "문가영", body: "디저트 카페 메뉴 페이지가 너무 예뻐요. 시그니처 메뉴가 돋보이게 배치돼서 매출이 올랐습니다.", daysAgo: 56 },
  { authorName: "양준호", body: "이사 견적 신청 페이지를 만들었는데, 견적 요청 폼이 잘 정리돼서 문의 전환이 확 늘었어요.", daysAgo: 60 },
  { authorName: "서아린", body: "요가원 클래스 시간표 페이지를 의뢰했습니다. 시간표가 명확해서 회원 등록이 편해졌어요.", daysAgo: 64 },
  { authorName: "홍성민", body: "반려동물 미용 예약 페이지를 만들었어요. 시술 메뉴와 가격이 잘 정리돼서 예약이 늘었습니다.", daysAgo: 68 },
  { authorName: "전유나", body: "공방 원데이 클래스 페이지가 마음에 들어요. 작품 사진이 잘 보여서 신청률이 좋아졌습니다.", daysAgo: 72 },
  { authorName: "고도현", body: "치킨 프랜차이즈 창업 문의 페이지를 만들었습니다. 창업 절차가 한눈에 들어와 문의가 늘었어요.", daysAgo: 76 },
  { authorName: "남윤서", body: "왁싱샵 예약 페이지를 의뢰했어요. 시술 종류가 깔끔하게 분류돼서 첫 방문 손님이 늘었습니다.", daysAgo: 80 },
  { authorName: "류진우", body: "독서실 등록 안내 페이지를 만들었습니다. 좌석 안내와 요금이 명확해서 등록 문의가 좋아졌어요.", daysAgo: 84 },
  { authorName: "백하늘", body: "꽃집 화환 주문 페이지가 정말 편해요. 주문이 카톡으로 바로 연결돼서 처리가 빨라졌습니다.", daysAgo: 88 },
  { authorName: "표지원", body: "필름 카메라 대여 페이지를 만들었어요. 대여 절차가 간단해서 첫 이용 고객이 많이 늘었습니다.", daysAgo: 92 },
  { authorName: "구자훈", body: "곱창 전문점 메뉴 페이지를 의뢰했습니다. 메뉴 사진이 먹음직스럽게 나와서 방문이 늘었어요.", daysAgo: 96 },
  { authorName: "심다은", body: "속눈썹 연장 예약 페이지가 깔끔합니다. 디자인별 사진이 잘 보여서 재방문 손님이 늘었어요.", daysAgo: 100 },
  { authorName: "황재현", body: "악기 레슨 신청 페이지를 만들었어요. 강사 소개와 커리큘럼이 잘 정리돼 등록이 늘었습니다.", daysAgo: 104 },
  { authorName: "곽서영", body: "비건 베이커리 소개 페이지를 의뢰했습니다. 브랜드 가치가 잘 전달돼서 단골이 늘었어요.", daysAgo: 108 },
  { authorName: "지민호", body: "스터디카페 이용 안내 페이지를 만들었어요. 요금제가 명확해서 신규 가입이 눈에 띄게 늘었습니다.", daysAgo: 112 },
  { authorName: "차예린", body: "네일 아트 포트폴리오 페이지가 너무 예뻐요. 작업물이 돋보여서 인스타 유입이 많아졌습니다.", daysAgo: 116 },
  { authorName: "주성호", body: "한정식 예약 페이지를 의뢰했습니다. 룸 안내와 코스가 잘 정리돼서 단체 예약이 늘었어요.", daysAgo: 120 },
  { authorName: "엄지호", body: "캠핑용품 대여 페이지를 만들었어요. 품목별 사진과 가격이 명확해서 예약이 수월해졌습니다.", daysAgo: 124 },
  { authorName: "노아름", body: "어린이 미술 학원 모집 페이지가 깔끔해요. 커리큘럼이 잘 보여서 상담 신청이 늘었습니다.", daysAgo: 128 },
  { authorName: "하정수", body: "수제 가죽 공방 주문 페이지를 의뢰했습니다. 제품 디테일이 잘 살아서 주문 문의가 늘었어요.", daysAgo: 132 },
  { authorName: "민서윤", body: "필라테스 소도구 클래스 페이지를 만들었어요. 모바일 예약이 편해서 신규 회원이 늘었습니다.", daysAgo: 136 },
  { authorName: "석진영", body: "브런치 카페 메뉴 페이지가 마음에 들어요. 플레이팅 사진이 돋보여서 손님 반응이 좋습니다.", daysAgo: 140 },
  { authorName: "도하윤", body: "헤어살롱 예약 페이지를 의뢰했습니다. 디자이너별 소개가 잘 돼서 지명 예약이 늘었어요.", daysAgo: 144 },
  { authorName: "변지오", body: "공유오피스 투어 신청 페이지를 만들었어요. 공간 사진이 잘 나와서 방문 예약이 늘었습니다.", daysAgo: 148 },
  { authorName: "안채린", body: "수제청 정기구독 페이지를 의뢰했습니다. 구독 옵션이 명확해서 재구매 고객이 늘었어요.", daysAgo: 152 },
];
