import { z } from "zod";

// 주문서(랜딩페이지 제작 신청서) 폼 정의 — docs/superpowers/plans/주문서.md 기반.
// 백엔드 연동 전이라 검증은 클라이언트에서 수행한다.
// (API 연동 단계에서 packages/shared 로 승격 예정)

// ── 제작 목적 ──
export const PURPOSES = [
  "고객 상담 신청",
  "고객 예약 유도",
  "고객 구매/결제",
  "고객 이벤트 신청",
  "서비스 소개/브랜드 홍보",
] as const;
export type Purpose = (typeof PURPOSES)[number];

// ── 추가할 정보 (복수선택 후 작성) ──
export const INFO_OPTIONS = [
  "대표 서비스 명",
  "가격/패키지",
  "소요시간",
  "진행방식",
  "예약/구매조건",
  "주의사항",
  "자주묻는 질문",
] as const;

// ── 필수 페이지 (복수선택, 기본 1페이지 + 추가 페이지당 비용) ──
export const PAGE_OPTIONS = [
  "메인(랜딩)",
  "브랜드/회사 소개",
  "서비스/메뉴 상세",
  "예약/문의",
  "오시는 길(지도)",
  "갤러리/포트폴리오",
  "고객 후기",
  "이벤트/프로모션",
] as const;
export const BASE_PAGE = PAGE_OPTIONS[0];
export const ADDITIONAL_PAGE_PRICE = 10000; // 1페이지 추가당 (원)

// ── 디자인 방향: 원하는 분위기 ──
export const MOODS = [
  "차분한",
  "고급스러운",
  "귀여운",
  "전문적인",
  "감성적인",
  "미니멀한",
  "강렬한",
] as const;

// ── 자료 업로드 안내 항목 ──
export const MATERIAL_TYPES = [
  "로고",
  "사진",
  "제품/서비스 이미지",
  "기존 소개서",
  "후기 자료",
  "가격표",
  "지도/주소",
  "사업자 정보",
] as const;

export const OrderFormSchema = z.object({
  showcaseId: z.string().min(1, "쇼케이스를 선택해 주세요."),

  // ── 사장님 정보 ──
  businessName: z.string().trim().min(1, "업체명(브랜드명)을 입력해 주세요."),
  phone: z
    .string()
    .trim()
    .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 휴대폰 번호를 입력해 주세요."),
  email: z.email("올바른 이메일을 입력해 주세요."),
  industry: z.string().trim().min(1, "업종을 입력해 주세요."),
  links: z.string().trim().max(500, "링크는 500자 이내로 입력해 주세요.").optional(),

  // ── 제작 목적 ──
  purpose: z.enum(PURPOSES, { error: "제작 목적을 선택해 주세요." }),

  // ── 타깃 고객 ──
  targetProfile: z.string().trim().max(200).optional(), // 나이/성별/지역
  targetPain: z.string().trim().max(500).optional(), // 고객이 가진 고민
  targetMessage: z.string().trim().max(500).optional(), // 고객이 알아야 할 것
  targetHesitation: z.string().trim().max(500).optional(), // 사용을 망설이는 이유

  // ── 추가할 정보 (선택 항목별 작성 내용) ──
  infoSections: z.record(z.string(), z.string()).optional(),

  // ── 필수 페이지 ──
  pages: z.array(z.string()).min(1, "필수 페이지를 1개 이상 선택해 주세요."),

  // ── 디자인 방향 ──
  moods: z.array(z.string()).optional(),
  avoidFeel: z.string().trim().max(300).optional(), // 피하고 싶은 느낌
  referenceSites: z.string().trim().max(500).optional(), // 참고 사이트/이미지
  preferredColors: z.string().trim().max(200).optional(), // 원하는 컬러
  hasBrandColors: z.boolean().optional(), // 로고/브랜드 컬러 유무

  // ── 문구 작성 ──
  copyText: z.string().trim().max(2000, "문구는 2000자 이내로 입력해 주세요.").optional(),
});
export type OrderForm = z.infer<typeof OrderFormSchema>;
