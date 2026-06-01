# 쇼케이스 무한스크롤 페이지 (/showcase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 헤더 "쇼케이스" 메뉴 클릭 시 `/showcase` 페이지로 이동해 무한스크롤로 전체 랜딩페이지를 탐색할 수 있게 한다.

**Architecture:** 백엔드는 무변경(커서 페이지네이션 기존 구현 재사용). 프론트에 `useInfiniteQuery` + IntersectionObserver 센티널 기반의 신규 라우트를 추가하고, 시드 데이터를 결정적 생성기로 160개로 확장한다.

**Tech Stack:** Next.js 16 / React 19 / @tanstack/react-query 5 (useInfiniteQuery) / Express + Prisma (무변경) / Vitest

**Spec:** `docs/superpowers/specs/2026-06-01-showcase-infinite-scroll-design.md`

---

## File Structure

```
apps/api/src/data/
├─ seed-data.ts                  # 수정: 결정적 생성기 + ALL_SEED_SHOWCASES 추가
└─ seed-data.test.ts             # 신규: 생성기 단위 테스트
apps/api/prisma/seed.ts          # 수정: ALL_SEED_SHOWCASES 사용

apps/web/src/
├─ lib/queries.ts                # 수정: useInfiniteShowcases 훅 추가
├─ components/
│  ├─ TagBar.tsx                 # 수정: counts prop 옵셔널화
│  ├─ SiteHeader.tsx             # 신규: 공용 헤더 (로고 + 내비)
│  └─ InfiniteShowcaseGrid.tsx   # 신규: 그리드 + 센티널 + 로딩/끝 상태
├─ app/
│  ├─ page.tsx                   # 수정: 인라인 헤더 → SiteHeader 교체
│  └─ showcase/page.tsx          # 신규: 무한스크롤 목록 페이지
README.md                        # 수정: 로드맵 갱신
```

**책임 경계**
- `seed-data.ts` 생성기: 난수 없이 인덱스 조합만으로 항목 생성 (시드 멱등성 유지, 테스트 가능)
- `useInfiniteShowcases`: 커서 → 페이지 연결 로직만. UI는 모름
- `InfiniteShowcaseGrid`: 렌더 + 센티널 감지만. 데이터 패칭은 모름 (props로 콜백 수신)
- `showcase/page.tsx`: 상태(카테고리/모달) + 훅과 그리드 배선

**알려진 제약 (이번 범위에서 수용)**
- 메인 페이지(`useAllShowcases`)는 limit=100이라 시드 확장 후 160개 중 100개만 표시됨. 메인 페이지의 전수 표시는 ②-b(가상화) 단계에서 해결. `/showcase`에서는 전부 볼 수 있음.

---

## Task 1: 시드 데이터 결정적 생성기 (TDD)

**Files:**
- Modify: `apps/api/src/data/seed-data.ts`
- Test: `apps/api/src/data/seed-data.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `apps/api/src/data/seed-data.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { LAYOUTS } from "@melstudio/shared";
import {
  SEED_CATEGORIES,
  SEED_SHOWCASES,
  generateShowcases,
  ALL_SEED_SHOWCASES,
} from "./seed-data";

describe("generateShowcases", () => {
  it("카테고리당 15개씩 생성한다 (8 x 15 = 120개)", () => {
    expect(generateShowcases().length).toBe(SEED_CATEGORIES.length * 15);
  });

  it("전체 시드는 원본 40 + 생성 120 = 160개다", () => {
    expect(ALL_SEED_SHOWCASES.length).toBe(SEED_SHOWCASES.length + 120);
    expect(ALL_SEED_SHOWCASES.length).toBe(160);
  });

  it("slug가 전체에서 유일하다", () => {
    const slugs = ALL_SEED_SHOWCASES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("모든 항목의 category가 유효한 카테고리 slug다", () => {
    const valid = new Set(SEED_CATEGORIES.map((c) => c.slug));
    for (const s of ALL_SEED_SHOWCASES) {
      expect(valid.has(s.category), `invalid category: ${s.slug}`).toBe(true);
    }
  });

  it("모든 항목의 layout이 유효하다", () => {
    const valid = new Set<string>(LAYOUTS);
    for (const s of ALL_SEED_SHOWCASES) {
      expect(valid.has(s.layout), `invalid layout: ${s.slug}`).toBe(true);
    }
  });

  it("같은 입력이면 같은 결과를 낸다 (결정적)", () => {
    expect(generateShowcases()).toEqual(generateShowcases());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -w @melstudio/api`
Expected: FAIL — `seed-data.ts`에 `generateShowcases`, `ALL_SEED_SHOWCASES` export 없음 (다른 기존 테스트는 통과 유지).

- [ ] **Step 3: 생성기 구현**

`apps/api/src/data/seed-data.ts` — 파일 끝(기존 `SEED_SHOWCASES` 배열 닫힌 뒤)에 추가:
```ts

// ── 무한스크롤 체감용 추가 생성 데이터 ──────────────────────────
// 결정적(deterministic) 생성: 난수 없이 인덱스 조합으로만 만들어 시드 멱등성을 유지한다.

const GEN_PER_CATEGORY = 15;

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
      out.push({
        slug: `${cat.slug}-gen-${i + 1}`,
        title: `${GEN_PREFIXES[i % GEN_PREFIXES.length]} ${suffixes[i % suffixes.length]}`,
        category: cat.slug,
        blurb: blurbs[i % blurbs.length],
        accent: GEN_ACCENTS[(catIdx + i) % GEN_ACCENTS.length],
        layout: GEN_LAYOUTS[(catIdx + i) % GEN_LAYOUTS.length],
      });
    }
  });
  return out;
}

// 시드에 사용하는 전체 목록 (원본 40 + 생성 120 = 160)
export const ALL_SEED_SHOWCASES = [...SEED_SHOWCASES, ...generateShowcases()];
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -w @melstudio/api`
Expected: PASS — seed-data 테스트 6개 + 기존 테스트 전부.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/data/seed-data.ts apps/api/src/data/seed-data.test.ts
git commit -m "feat(api): deterministic seed generator (40 -> 160 showcases)"
```

---

## Task 2: 시드 적용 + DB 재시드

**Files:**
- Modify: `apps/api/prisma/seed.ts:2,19`

- [ ] **Step 1: seed.ts가 확장 목록을 쓰도록 수정**

`apps/api/prisma/seed.ts` 상단 import 변경:
```ts
import { SEED_CATEGORIES, ALL_SEED_SHOWCASES } from "../src/data/seed-data.js";
```

본문 루프 변경 (`for (const s of SEED_SHOWCASES)` → ):
```ts
  for (const s of ALL_SEED_SHOWCASES) {
```

- [ ] **Step 2: DB 재시드 (Docker Postgres 기동 상태에서)**

Run:
```bash
docker compose up -d postgres
npm run db:seed -w @melstudio/api
```
Expected: `[seed] categories=8, showcases=160`

- [ ] **Step 3: 기존 API 테스트가 확장된 DB에서도 통과하는지 확인**

Run: `npm run test -w @melstudio/api`
Expected: PASS — 서비스/라우트 테스트는 개수 고정 단언이 카테고리(8)뿐이라 영향 없음.

- [ ] **Step 4: API 동작 수동 확인**

Run:
```bash
npm run dev:api &
sleep 2
curl -s "http://localhost:4000/api/showcases?limit=12" | head -c 300
echo ""
curl -s "http://localhost:4000/api/showcases?limit=12&category=cafe" | head -c 300
kill %1
```
Expected: 두 호출 모두 `{"items":[...12개...],"nextCursor":"c..."}` 형태. category=cafe는 cafe 항목만.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed expanded showcase list (160 items)"
```

---

## Task 3: web — useInfiniteShowcases 훅 + TagBar counts 옵셔널화

**Files:**
- Modify: `apps/web/src/lib/queries.ts`
- Modify: `apps/web/src/components/TagBar.tsx:7,12,32-38`

- [ ] **Step 1: useInfiniteShowcases 훅 추가**

`apps/web/src/lib/queries.ts` — 전체를 다음으로 교체:
```ts
"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchShowcases } from "./api";

const INFINITE_PAGE_SIZE = 12;

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

// ① 단계: 전체를 한 번에 받아 기존 클라이언트 필터/페이지네이션 유지
// (무한스크롤·가상화는 ② /gallery 에서 도입)
export function useAllShowcases() {
  return useQuery({
    queryKey: ["showcases", "all"],
    queryFn: () => fetchShowcases({ limit: 100 }),
  });
}

// ②-a: /showcase 무한스크롤 — 커서 페이지네이션을 useInfiniteQuery로 연결
export function useInfiniteShowcases(category: string) {
  return useInfiniteQuery({
    queryKey: ["showcases", "infinite", category],
    queryFn: ({ pageParam }) =>
      fetchShowcases({ limit: INFINITE_PAGE_SIZE, cursor: pageParam, category }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
```

- [ ] **Step 2: TagBar counts prop 옵셔널화**

`apps/web/src/components/TagBar.tsx` — 전체를 다음으로 교체:
```tsx
"use client";

import type { Category } from "@melstudio/shared";

export default function TagBar({
  categories,
  counts,
  active,
  onChange,
}: {
  categories: Category[]; // "all" 포함(페이지에서 앞에 추가해 전달)
  counts?: Record<string, number>; // 없으면 카운트 배지 미표시 (무한스크롤 페이지)
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 py-1 md:flex-wrap md:justify-center md:overflow-visible">
      {categories.map((cat) => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`group flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              isActive
                ? "border-transparent bg-rose-grad text-white shadow-petal"
                : "border-rose/20 bg-white/70 text-wine/70 hover:border-rose/50 hover:bg-white hover:text-crimson"
            }`}
          >
            {cat.label}
            {counts && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  isActive ? "bg-white/25 text-white" : "bg-petal/50 text-crimson-deep"
                }`}
              >
                {counts[cat.id] ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: 빌드로 검증 (메인 페이지 회귀 없음 확인)**

Run: `npm run build -w @melstudio/web`
Expected: `✓ Compiled successfully` — 메인 페이지는 counts를 넘기므로 동작 동일.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/queries.ts apps/web/src/components/TagBar.tsx
git commit -m "feat(web): infinite showcases query hook + optional tagbar counts"
```

---

## Task 4: web — SiteHeader 공용 컴포넌트 + 메인 페이지 적용

**Files:**
- Create: `apps/web/src/components/SiteHeader.tsx`
- Modify: `apps/web/src/app/page.tsx:46-74` (인라인 헤더 → SiteHeader)

- [ ] **Step 1: SiteHeader 작성**

Create `apps/web/src/components/SiteHeader.tsx`:
```tsx
"use client";

import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-grad text-white shadow-petal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
          </svg>
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">
          멜스튜디오<span className="text-crimson">.</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-7 text-sm font-medium text-wine/60 sm:flex">
        <Link href="/showcase" className="transition-colors hover:text-crimson">
          쇼케이스
        </Link>
        <a href="#" className="transition-colors hover:text-crimson">
          요금
        </a>
        <a
          href="#"
          className="rounded-full bg-ink px-4 py-2 text-white transition-all hover:bg-crimson"
        >
          제작 문의
        </a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: 메인 페이지의 인라인 헤더를 SiteHeader로 교체**

`apps/web/src/app/page.tsx`:

(a) import 추가 (기존 import 블록에):
```tsx
import SiteHeader from "@/components/SiteHeader";
```

(b) `{/* ── 헤더 ── */}` 주석부터 `</header>`까지의 인라인 헤더 블록(46~74행 부근)을 다음 한 줄로 교체:
```tsx
      {/* ── 헤더 ── */}
      <SiteHeader />
```

> 비고: 기존 헤더의 "쇼케이스" 링크는 `#showcase` 앵커였으나, SiteHeader에서는 `/showcase` 라우트로 변경된다 (스펙 결정사항).

- [ ] **Step 3: 빌드 검증**

Run: `npm run build -w @melstudio/web`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/SiteHeader.tsx apps/web/src/app/page.tsx
git commit -m "feat(web): shared site header, showcase nav links to /showcase"
```

---

## Task 5: web — InfiniteShowcaseGrid 컴포넌트

**Files:**
- Create: `apps/web/src/components/InfiniteShowcaseGrid.tsx`

- [ ] **Step 1: InfiniteShowcaseGrid 작성**

Create `apps/web/src/components/InfiniteShowcaseGrid.tsx`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import type { Showcase } from "@melstudio/shared";
import ShowcaseCard from "./ShowcaseCard";

export default function InfiniteShowcaseGrid({
  items,
  labelOf,
  onOpen,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  items: Showcase[];
  labelOf: (categorySlug: string) => string;
  onOpen: (item: Showcase) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 센티널이 뷰포트(아래 400px 여유)에 들어오면 다음 페이지 로드
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, onLoadMore]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-rose/30 bg-white/50 px-6 py-24 text-center">
        <span className="text-4xl">🌸</span>
        <p className="mt-4 font-display text-lg font-bold text-ink">
          준비된 페이지가 없어요
        </p>
        <p className="text-sm text-wine/50">다른 업종을 선택해 보세요.</p>
      </div>
    );
  }

  return (
    <div>
      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <ShowcaseCard
            key={item.id}
            item={item}
            index={i % 12}
            categoryLabel={labelOf(item.category)}
            onOpen={onOpen}
          />
        ))}
      </div>

      {/* 무한스크롤 센티널 + 하단 상태 */}
      <div
        ref={sentinelRef}
        className="mt-10 flex items-center justify-center py-6"
      >
        {isFetchingNextPage ? (
          <span className="flex items-center gap-2 text-sm text-wine/50">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose/30 border-t-crimson" />
            불러오는 중…
          </span>
        ) : !hasNextPage ? (
          <span className="text-sm text-wine/40">전부 봤어요 🌸</span>
        ) : null}
      </div>
    </div>
  );
}
```

> 설계 메모:
> - `index={i % 12}`: ShowcaseCard의 등장 애니메이션 딜레이(`index * 70ms`)가 무한 목록에서 무한정 길어지지 않도록 페이지 단위로 순환.
> - 그리드 열: 2/3/4열 (페이지당 12개 = 모든 열 수의 배수라 줄 깨짐 없음). 메인 페이지의 5열 슬라이더와 다른 의도적 선택.
> - 중복 호출 방어는 호출자(page)에서 `isFetchingNextPage` 가드 + React Query 자체 중복 방지로 처리.

- [ ] **Step 2: 빌드 검증**

Run: `npm run build -w @melstudio/web`
Expected: `✓ Compiled successfully` (아직 사용처 없음 — 컴파일만 확인).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/InfiniteShowcaseGrid.tsx
git commit -m "feat(web): infinite showcase grid with intersection-observer sentinel"
```

---

## Task 6: web — /showcase 페이지

**Files:**
- Create: `apps/web/src/app/showcase/page.tsx`

- [ ] **Step 1: /showcase 페이지 작성**

Create `apps/web/src/app/showcase/page.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import type { Category, Showcase } from "@melstudio/shared";
import { useCategories, useInfiniteShowcases } from "@/lib/queries";
import SiteHeader from "@/components/SiteHeader";
import TagBar from "@/components/TagBar";
import InfiniteShowcaseGrid from "@/components/InfiniteShowcaseGrid";
import PreviewModal from "@/components/PreviewModal";

export default function ShowcasePage() {
  const [active, setActive] = useState<string>("all");
  const [selected, setSelected] = useState<Showcase | null>(null);

  const categoriesQuery = useCategories();
  const showcasesQuery = useInfiniteShowcases(active);

  // 페이지들을 평탄화해 단일 목록으로
  const items = useMemo(
    () => showcasesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [showcasesQuery.data],
  );

  const tabs: Category[] = useMemo(
    () => [{ id: "all", label: "전체" }, ...(categoriesQuery.data ?? [])],
    [categoriesQuery.data],
  );

  const labelOf = useMemo(() => {
    const m = new Map(tabs.map((t) => [t.id, t.label]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [tabs]);

  const isLoading = categoriesQuery.isLoading || showcasesQuery.isLoading;
  const isError = categoriesQuery.isError || showcasesQuery.isError;

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      {/* ── 타이틀 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-6 text-center sm:pt-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          쇼케이스 <span className="text-crimson">전체 보기</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-wine/70">
          업종 태그를 고르고 아래로 스크롤하면 더 많은 디자인이 나와요.
        </p>
      </section>

      {/* ── 태그 + 무한스크롤 그리드 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="sticky top-0 z-30 -mx-5 mb-10 bg-blush/70 px-5 py-4 backdrop-blur-md">
          <TagBar categories={tabs} active={active} onChange={setActive} />
        </div>

        {isError ? (
          <p className="py-24 text-center text-wine/60">
            데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요.
          </p>
        ) : isLoading ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : (
          <InfiniteShowcaseGrid
            items={items}
            labelOf={labelOf}
            onOpen={setSelected}
            hasNextPage={showcasesQuery.hasNextPage ?? false}
            isFetchingNextPage={showcasesQuery.isFetchingNextPage}
            onLoadMore={() => {
              if (!showcasesQuery.isFetchingNextPage) {
                void showcasesQuery.fetchNextPage();
              }
            }}
          />
        )}
      </section>

      {/* ── 미리보기 모달 ── */}
      <PreviewModal
        item={selected}
        categoryLabel={selected ? labelOf(selected.category) : ""}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
```

> 설계 메모:
> - 카테고리 탭 변경 → `useInfiniteShowcases(active)`의 queryKey가 바뀌므로 React Query가 자동으로 첫 페이지부터 재조회 (서버 필터링).
> - TagBar에 `counts`를 넘기지 않음 → 카운트 배지 미표시 (무한스크롤에서는 전체 개수를 모르므로).

- [ ] **Step 2: 빌드 검증**

Run: `npm run build -w @melstudio/web`
Expected: `✓ Compiled successfully` + 라우트 목록에 `/showcase` 표시.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/showcase/page.tsx
git commit -m "feat(web): /showcase page with infinite scroll and category filter"
```

---

## Task 7: E2E 수동 검증 + README 로드맵 갱신

**Files:**
- Modify: `README.md` (로드맵 섹션)

- [ ] **Step 1: 전체 스택 기동**

Run (별도 터미널 권장):
```bash
docker compose up -d
npm run db:seed -w @melstudio/api   # 아직 안 했다면 (160개 확인)
npm run dev                          # api(4000) + web(3000)
```

- [ ] **Step 2: E2E 수동 검증 체크리스트**

브라우저 http://localhost:3000 에서:
1. 메인 페이지 헤더 "쇼케이스" 클릭 → `/showcase` 이동 확인
2. 첫 12개 카드 표시 확인
3. 스크롤 다운 → 추가 12개씩 자동 로드 확인 (하단 "불러오는 중…" 잠깐 표시)
4. "전체" 탭에서 끝까지 스크롤 → 160개 모두 로드 후 "전부 봤어요 🌸" 표시
5. 업종 탭(예: 카페·베이커리) 클릭 → 해당 업종만 첫 페이지부터 다시 로드
6. 카드 클릭 → 데스크탑/모바일 미리보기 모달 열림, ESC로 닫힘
7. `/showcase`에서 로고 클릭 → 메인(`/`) 복귀
8. 메인 페이지 기존 동작(태그 필터 + 5개 슬라이더 + 모달) 회귀 없음 확인

- [ ] **Step 3: API 서버 끈 상태 에러 확인**

api 프로세스만 중지 후 `/showcase` 새로고침:
Expected: "데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요." 표시.
확인 후 api 재기동.

- [ ] **Step 4: README 로드맵 갱신**

`README.md`의 로드맵 섹션을 다음으로 교체:
```markdown
## 진행 로드맵
- [x] ① 데이터 토대 (DB + API)
- [x] ②-a 쇼케이스 무한스크롤 페이지 (/showcase)
- [ ] ②-b 클라우드 스토리지(MinIO) 이미지 + 가상화
- [ ] ③ 주문 + 결제(PortOne) + 소셜로그인
- [ ] ④ 실시간 채팅(Socket.IO)
```

- [ ] **Step 5: 최종 전체 검증**

Run:
```bash
npm test
npm run build -w @melstudio/web
```
Expected: API/shared 테스트 전부 PASS + web 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: mark showcase infinite-scroll page in roadmap"
```

---

## Self-Review (작성자 점검 결과)

**Spec 커버리지**
- `/showcase` 신규 라우트 → Task 6 ✓
- `useInfiniteQuery` + 커서 연결 → Task 3 ✓
- IntersectionObserver 센티널 (rootMargin 400px) → Task 5 ✓
- 업종 태그 필터 (서버 필터링, queryKey 리셋) → Task 3, 6 ✓
- 카드 클릭 → PreviewModal 재사용 → Task 6 ✓
- 헤더 "쇼케이스" → /showcase 링크 (공용 SiteHeader) → Task 4 ✓
- 시드 ~160개 결정적 생성 + 단위 테스트 → Task 1, 2 ✓
- 상태 처리 (첫 로드/다음 페이지/끝/에러/빈 결과) → Task 5, 6 ✓
- 메인 페이지 기존 동작 무변경 → Task 4(헤더만 교체), Task 7 검증 ✓
- E2E 수동 검증 → Task 7 ✓

**Placeholder 스캔**: TBD/TODO/"적절히 처리" 류 없음. 모든 코드 스텝에 전체 코드 포함.

**타입 일관성**:
- `useInfiniteShowcases(category: string)` (Task 3) ↔ 호출 `useInfiniteShowcases(active)` (Task 6) ✓
- `InfiniteShowcaseGrid` props (Task 5) ↔ 전달 props (Task 6): items/labelOf/onOpen/hasNextPage/isFetchingNextPage/onLoadMore ✓
- `TagBar` counts 옵셔널 (Task 3) ↔ 메인 페이지는 counts 전달 유지, /showcase는 미전달 ✓
- `generateShowcases`/`ALL_SEED_SHOWCASES` (Task 1) ↔ seed.ts 사용 (Task 2) ✓

**알려진 전제**
- Task 2의 재시드와 API 테스트는 로컬 Docker Postgres 기동을 전제로 한다.
- 메인 페이지는 limit=100 제약으로 160개 중 100개만 표시 (File Structure 섹션의 알려진 제약 참고).
