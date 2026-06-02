# 쇼케이스 무한스크롤 가상화 (직접 구현) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/showcase` 무한스크롤에 윈도우 가상화를 직접 구현해 1,000개+ 데이터에서도 DOM 노드 수를 일정하게 유지하고, Before/After를 동일 조건에서 측정해 기록한다.

**Architecture:** 가상화를 2층으로 분리 — ① `lib/virtualizer.ts` 순수 계산 코어(오프셋 누적합 + 이진 탐색 가시 범위, DOM 의존 없음) ② `hooks/useWindowVirtualizer.ts` React 통합(window 스크롤 rAF 쓰로틀 + ResizeObserver 실측). `InfiniteShowcaseGrid`는 아이템을 열 수(2/3/4)만큼 행으로 묶어 보이는 행만 absolute+translateY로 렌더한다. 측정은 Playwright로 자동화한다.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, Vitest + RTL (jsdom), Playwright (신규), Prisma + PostgreSQL (시드만)

**Spec:** [2026-06-02-showcase-virtualization-design.md](../specs/2026-06-02-showcase-virtualization-design.md)

**전제 조건:**
- Docker(postgres) 실행 중: `docker compose up -d --wait`
- 모든 명령은 리포 루트(`/Users/hansoyoung/Desktop/landing-page-sales`) 기준
- 커밋은 반드시 명시된 파일만 `git add` (작업 트리에 무관한 변경이 있음 — `git add -A` 금지)

---

## Task 1: 시드 데이터 1,039개로 확장

**Files:**
- Modify: `apps/api/src/data/seed-data.test.ts`
- Modify: `apps/api/src/data/seed-data.ts`
- Modify: `apps/api/prisma/seed.ts`

현재: 원본 39 + 카테고리별 15개 생성 = 159개.
변경: 카테고리별 **125개** 생성 → 39 + 8×125 = **1,039개**.
생성 제목이 15개 주기로 반복되므로, 2바퀴째부터 "N호점"을 붙여 구분한다.

- [ ] **Step 1: 시드 테스트를 새 기대값으로 수정 (실패하는 테스트)**

`apps/api/src/data/seed-data.test.ts` 전체를 다음으로 교체:

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
  it("카테고리당 125개씩 생성한다 (8 x 125 = 1,000개)", () => {
    expect(generateShowcases().length).toBe(SEED_CATEGORIES.length * 125);
  });

  it("전체 시드는 원본 39 + 생성 1,000 = 1,039개다", () => {
    expect(ALL_SEED_SHOWCASES.length).toBe(SEED_SHOWCASES.length + 1000);
    expect(ALL_SEED_SHOWCASES.length).toBe(1039);
  });

  it("slug가 전체에서 유일하다", () => {
    const slugs = ALL_SEED_SHOWCASES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("제목이 반복 주기를 넘어가면 'N호점'으로 구분된다", () => {
    const gen = generateShowcases();
    // 카테고리당 첫 15개는 호점 없음, 16번째(인덱스 15)부터 2호점
    expect(gen[0].title).not.toMatch(/호점$/);
    expect(gen[15].title).toMatch(/2호점$/);
    expect(gen[30].title).toMatch(/3호점$/);
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

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm run test -w @melstudio/api -- src/data/seed-data.test.ts`
Expected: FAIL — "카테고리당 125개씩" (실제 15개), "1,039개다" (실제 159), "N호점" (없음)

- [ ] **Step 3: seed-data.ts 수정**

`apps/api/src/data/seed-data.ts`에서 다음 두 부분을 수정.

(a) `GEN_PER_CATEGORY` 상수 변경 (82행 부근):

```ts
const GEN_PER_CATEGORY = 125;
```

(b) `generateShowcases` 함수 교체 (118행 부근) — 제목 반복 시 "N호점" 추가:

```ts
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
```

마지막 행의 주석도 수정:

```ts
// 시드에 사용하는 전체 목록 (원본 39 + 생성 1,000 = 1,039)
export const ALL_SEED_SHOWCASES = [...SEED_SHOWCASES, ...generateShowcases()];
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -w @melstudio/api -- src/data/seed-data.test.ts`
Expected: PASS (7개 테스트)

- [ ] **Step 5: seed.ts를 createMany로 변경 (1,039개 시드 속도)**

`apps/api/prisma/seed.ts`의 쇼케이스 삽입 루프를 교체. 현재:

```ts
  for (const s of ALL_SEED_SHOWCASES) {
    const categoryId = categoryIdBySlug.get(s.category);
    if (!categoryId) throw new Error(`Unknown category slug: ${s.category}`);
    await prisma.showcase.create({
      data: {
        slug: s.slug,
        title: s.title,
        blurb: s.blurb,
        accent: s.accent,
        layout: s.layout,
        categoryId,
      },
    });
  }
```

다음으로 교체:

```ts
  // createMany: 1,039개를 한 번에 삽입 (개별 create 루프는 너무 느림)
  await prisma.showcase.createMany({
    data: ALL_SEED_SHOWCASES.map((s) => {
      const categoryId = categoryIdBySlug.get(s.category);
      if (!categoryId) throw new Error(`Unknown category slug: ${s.category}`);
      return {
        slug: s.slug,
        title: s.title,
        blurb: s.blurb,
        accent: s.accent,
        layout: s.layout,
        categoryId,
      };
    }),
  });
```

주의: `createMany`는 `createdAt`을 모두 같은 시각으로 넣는다. 커서 페이지네이션은
`orderBy: [{ createdAt: "asc" }, { id: "asc" }]`로 id 2차 정렬이 있으므로 순서가 안정적이다 (변경 불필요).

- [ ] **Step 6: 전체 api 테스트 + 시드 실행으로 검증**

Run: `npm run test -w @melstudio/api`
Expected: 전체 PASS (기존 26개 + 시드 테스트)

Run: `npm run db:seed`
Expected: `[seed] categories=8, showcases=1039` 출력

Run: `docker exec melstudio-postgres psql -U melstudio -d melstudio -t -c 'SELECT count(*) FROM "Showcase";'`
Expected: `1039`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/data/seed-data.ts apps/api/src/data/seed-data.test.ts apps/api/prisma/seed.ts
git commit -m "feat(api): 시드 데이터 1,039개로 확장 (가상화 테스트용) + createMany 시드"
```

---

## Task 2: Playwright E2E 환경 구축

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/showcase.spec.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/.gitignore` (없으면 루트 `.gitignore`)

- [ ] **Step 1: Playwright 설치**

```bash
npm install -D @playwright/test -w @melstudio/web
npx playwright install chromium
```

- [ ] **Step 2: playwright.config.ts 작성**

`apps/web/playwright.config.ts` 생성:

```ts
import { defineConfig } from "@playwright/test";

// E2E 전제: API(4000) + DB(docker)가 떠 있고 시드 완료 상태.
// web은 프로덕션 빌드를 webServer로 자동 기동한다.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  // 측정 정확도를 위해 직렬 실행
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx next build && npx next start -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
```

- [ ] **Step 3: 스모크 E2E 작성**

`apps/web/e2e/showcase.spec.ts` 생성:

```ts
import { test, expect } from "@playwright/test";

test.describe("/showcase", () => {
  test("페이지가 로드되고 첫 카드들이 보인다", async ({ page }) => {
    await page.goto("/showcase");
    await expect(
      page.getByRole("heading", { name: /쇼케이스/ }),
    ).toBeVisible();
    // 첫 페이지 카드 12개 (서버 렌더)
    const cards = page.getByRole("button", { name: /미리보기 열기/ });
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(12);
  });
});
```

- [ ] **Step 4: package.json에 스크립트 추가**

`apps/web/package.json`의 scripts에 추가:

```json
    "test:e2e": "playwright test"
```

- [ ] **Step 5: E2E 실행해 통과 확인**

전제: `docker compose up -d --wait` + API 실행 중 (`npm run dev:api` 백그라운드 또는 별도 터미널).

Run: `npm run test:e2e -w @melstudio/web`
Expected: 1 passed

- [ ] **Step 6: gitignore에 Playwright 산출물 추가**

루트 `.gitignore`에 다음 줄 추가:

```
# playwright
apps/web/test-results/
apps/web/playwright-report/
apps/web/blob-report/
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e/showcase.spec.ts apps/web/package.json package-lock.json .gitignore
git commit -m "test(web): Playwright E2E 환경 구축 + /showcase 스모크 테스트"
```

---

## Task 3: 측정 스크립트 + Before 측정 (가상화 없음, 1,039개)

**Files:**
- Create: `apps/web/e2e/measure.spec.ts`
- Create: `docs/perf/showcase-virtualization-before-after.md`

- [ ] **Step 1: 측정 스크립트 작성**

`apps/web/e2e/measure.spec.ts` 생성:

```ts
import { test, expect } from "@playwright/test";

// 성능 측정 스크립트 — 테스트라기보다 측정 자동화.
// 끝까지 스크롤하며 DOM 노드 수 / 프레임 시간 / JS 힙을 수집해 콘솔에 출력한다.
// 실행: npm run test:e2e -w @melstudio/web -- measure
// (Before/After 측정 시 동일 조건: 1,039개 시드, 프로덕션 빌드, workers=1)

test("측정: /showcase 끝까지 스크롤 — DOM 노드 / 프레임 / 힙", async ({ page }) => {
  await page.goto("/showcase");
  await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

  // ── 끝까지 스크롤하면서 프레임 시간 수집 ──
  const result = await page.evaluate(async () => {
    const frameDeltas: number[] = [];
    let last = performance.now();
    let running = true;
    const loop = () => {
      const now = performance.now();
      frameDeltas.push(now - last);
      last = now;
      if (running) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // "전부 봤어요"가 나올 때까지 스크롤 (최대 5분 안전장치)
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 300));
      if (document.body.innerText.includes("전부 봤어요")) break;
    }

    // 끝에서 한 번 더 위로 갔다가 아래로 (스크롤 성능 측정 구간)
    const total = document.body.scrollHeight;
    for (let y = total; y > 0; y -= 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 16));
    }
    for (let y = 0; y < total; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 16));
    }

    running = false;

    const domNodes = document.querySelectorAll("*").length;
    const cards = document.querySelectorAll('button[aria-label$="미리보기 열기"]').length;
    const heapMB =
      ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? 0) / 1048576;

    // 프레임 통계 (첫 5개는 워밍업 제외)
    const frames = frameDeltas.slice(5);
    const avgFrame = frames.reduce((a, b) => a + b, 0) / frames.length;
    const longFrames = frames.filter((f) => f > 50).length;
    const maxFrame = Math.max(...frames);

    return {
      domNodes,
      cards,
      heapMB: Math.round(heapMB * 10) / 10,
      avgFrameMs: Math.round(avgFrame * 100) / 100,
      longFrames,
      maxFrameMs: Math.round(maxFrame),
      totalFrames: frames.length,
    };
  });

  console.log("=== 측정 결과 ===");
  console.log(JSON.stringify(result, null, 2));

  // 끝까지 로드됐는지 확인 (측정 유효성)
  await expect(page.getByText("전부 봤어요")).toBeVisible();
});
```

- [ ] **Step 2: Before 측정 실행 (가상화 없는 현재 코드)**

전제: Task 1의 시드(1,039개) 완료, API 실행 중.

**주의: 포트 3000에 dev 서버가 떠 있으면 먼저 종료할 것** —
`reuseExistingServer: true`라서 dev 서버를 재사용해 측정이 왜곡된다.
확인: `lsof -nP -iTCP:3000 -sTCP:LISTEN` → 있으면 종료 후 측정.

Run: `npm run test:e2e -w @melstudio/web -- measure`
Expected: PASS + 콘솔에 JSON 측정 결과 출력. 결과를 기록해 둔다.
예상되는 Before 수치 (참고): domNodes 50,000+, cards 1,039, longFrames 다수

- [ ] **Step 3: 측정 기록 문서 생성 (Before 채움)**

`docs/perf/showcase-virtualization-before-after.md` 생성 — `{{ }}` 자리에 Step 2의 실측값 기입:

```markdown
# /showcase 가상화 성능 측정 — Before / After

- 관련 스펙: [2026-06-02-showcase-virtualization-design.md](../superpowers/specs/2026-06-02-showcase-virtualization-design.md)
- 측정 도구: Playwright (`apps/web/e2e/measure.spec.ts`), Chromium, 뷰포트 1280×800
- 조건: **동일 시드 1,039개**, 프로덕션 빌드(`next build && next start`), workers=1
- 방법: 끝까지 스크롤(전체 로드) → 위로 끝까지 → 다시 아래로 스크롤하며 프레임 수집

## 결과

| 지표 | Before (가상화 없음) | After (가상화) |
|---|---|---|
| 측정일 | {{날짜}} | – |
| DOM 노드 수 (전체 로드 후) | {{domNodes}} | – |
| 렌더된 카드 수 | {{cards}} (= 전체) | – |
| JS 힙 (MB) | {{heapMB}} | – |
| 평균 프레임 시간 (ms) | {{avgFrameMs}} | – |
| 50ms 초과 long frame 수 | {{longFrames}} | – |
| 최대 프레임 시간 (ms) | {{maxFrameMs}} | – |

## 분석

(After 측정 후 작성)
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/measure.spec.ts docs/perf/showcase-virtualization-before-after.md
git commit -m "test(web): 가상화 Before/After 측정 스크립트 + Before(1,039개, 가상화 없음) 기록"
```

---

## Task 4: 가상화 순수 계산 코어 (`lib/virtualizer.ts`)

**Files:**
- Create: `apps/web/src/lib/virtualizer.test.ts`
- Create: `apps/web/src/lib/virtualizer.ts`

DOM/React 의존이 전혀 없는 순수 함수들. 가상화의 수학적 핵심.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/lib/virtualizer.test.ts` 생성:

```ts
import { describe, it, expect } from "vitest";
import {
  buildOffsets,
  totalHeight,
  findRowIndex,
  computeRange,
  getVirtualRows,
} from "./virtualizer";

describe("buildOffsets", () => {
  it("실측값이 없으면 추정값으로 누적합을 만든다", () => {
    // 3행 × 추정 100px → [0, 100, 200, 300]
    expect(buildOffsets(3, 100, new Map())).toEqual([0, 100, 200, 300]);
  });

  it("실측값이 있는 행은 실측값을 쓴다", () => {
    const measured = new Map([[1, 150]]);
    // [0, 100, 100+150, 250+100]
    expect(buildOffsets(3, 100, measured)).toEqual([0, 100, 250, 350]);
  });

  it("행이 0개면 [0]", () => {
    expect(buildOffsets(0, 100, new Map())).toEqual([0]);
  });
});

describe("totalHeight", () => {
  it("마지막 오프셋이 전체 높이다", () => {
    expect(totalHeight([0, 100, 250, 350])).toBe(350);
    expect(totalHeight([0])).toBe(0);
  });
});

describe("findRowIndex", () => {
  const offsets = [0, 100, 200, 300, 400]; // 4행, 각 100px

  it("y가 속한 행 인덱스를 찾는다 (이진 탐색)", () => {
    expect(findRowIndex(offsets, 0)).toBe(0);
    expect(findRowIndex(offsets, 99)).toBe(0);
    expect(findRowIndex(offsets, 100)).toBe(1);
    expect(findRowIndex(offsets, 250)).toBe(2);
    expect(findRowIndex(offsets, 399)).toBe(3);
  });

  it("범위를 벗어나면 경계로 클램프한다", () => {
    expect(findRowIndex(offsets, -50)).toBe(0);
    expect(findRowIndex(offsets, 99999)).toBe(3);
  });
});

describe("computeRange", () => {
  // 100행 × 100px, 뷰포트 500px
  const offsets = buildOffsets(100, 100, new Map());

  it("스크롤 0이면 첫 화면 행들 + overscan", () => {
    const r = computeRange({
      offsets,
      scrollY: 0,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 2,
    });
    // 가시: 0~4행 (0~500px), overscan 위 0 아래 +2 → 0~6
    expect(r.start).toBe(0);
    expect(r.end).toBe(6);
  });

  it("중간으로 스크롤하면 해당 범위 + 위아래 overscan", () => {
    const r = computeRange({
      offsets,
      scrollY: 5000,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 2,
    });
    // 가시: 50~54행, overscan → 48~56
    expect(r.start).toBe(48);
    expect(r.end).toBe(56);
  });

  it("scrollMargin(그리드 위 영역)을 보정한다", () => {
    const r = computeRange({
      offsets,
      scrollY: 1000,
      viewportHeight: 500,
      scrollMargin: 1000, // 그리드가 문서 1000px 지점에서 시작
      overscan: 0,
    });
    // 컨테이너 기준 0~500px → 0~4행
    expect(r.start).toBe(0);
    expect(r.end).toBe(4);
  });

  it("마지막 근처에서는 end가 마지막 행을 넘지 않는다", () => {
    const r = computeRange({
      offsets,
      scrollY: 9900,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 3,
    });
    expect(r.end).toBe(99);
    expect(r.start).toBe(96); // 99(가시 시작) - 3 overscan
  });

  it("행이 없으면 빈 범위", () => {
    const r = computeRange({
      offsets: [0],
      scrollY: 0,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 2,
    });
    expect(r.end).toBeLessThan(r.start);
  });
});

describe("getVirtualRows", () => {
  it("범위의 행들을 {index, start, height}로 반환한다", () => {
    const offsets = [0, 100, 250, 350];
    expect(getVirtualRows(offsets, { start: 1, end: 2 })).toEqual([
      { index: 1, start: 100, height: 150 },
      { index: 2, start: 250, height: 100 },
    ]);
  });

  it("빈 범위면 빈 배열", () => {
    expect(getVirtualRows([0, 100], { start: 0, end: -1 })).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -w @melstudio/web -- src/lib/virtualizer.test.ts`
Expected: FAIL — "Cannot find module './virtualizer'" 또는 함수 미정의

- [ ] **Step 3: 구현**

`apps/web/src/lib/virtualizer.ts` 생성:

```ts
// 가상화 순수 계산 코어 — DOM/React 의존 없음.
// 행 높이는 실측값(measured)이 있으면 그것을, 없으면 추정값(estimate)을 쓴다.
//
// 용어:
// - offsets: 누적합 테이블. offsets[i] = i번째 행의 시작 y (컨테이너 기준).
//   길이는 rowCount + 1이며 마지막 원소가 전체 높이.
// - scrollMargin: 그리드 컨테이너가 문서 상단에서 떨어진 거리 (헤더/타이틀 영역).

export type VirtualRow = {
  index: number;
  start: number; // 컨테이너 기준 y (px)
  height: number;
};

export type Range = { start: number; end: number }; // end < start 이면 빈 범위

export function buildOffsets(
  rowCount: number,
  estimateHeight: number,
  measured: Map<number, number>,
): number[] {
  const offsets = new Array<number>(rowCount + 1);
  offsets[0] = 0;
  for (let i = 0; i < rowCount; i++) {
    offsets[i + 1] = offsets[i] + (measured.get(i) ?? estimateHeight);
  }
  return offsets;
}

export function totalHeight(offsets: number[]): number {
  return offsets[offsets.length - 1] ?? 0;
}

// offsets에서 y가 속한 행 인덱스 (이진 탐색). 범위 밖이면 경계로 클램프.
export function findRowIndex(offsets: number[], y: number): number {
  const rowCount = offsets.length - 1;
  if (rowCount <= 0) return 0;
  if (y < offsets[1]) return 0;
  if (y >= offsets[rowCount]) return rowCount - 1;

  let lo = 0;
  let hi = rowCount - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1] <= y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function computeRange(args: {
  offsets: number[];
  scrollY: number;
  viewportHeight: number;
  scrollMargin: number;
  overscan: number;
}): Range {
  const { offsets, scrollY, viewportHeight, scrollMargin, overscan } = args;
  const rowCount = offsets.length - 1;
  if (rowCount <= 0) return { start: 0, end: -1 };

  // 컨테이너 기준 가시 구간
  const top = scrollY - scrollMargin;
  const bottom = top + viewportHeight;

  const start = Math.max(0, findRowIndex(offsets, top) - overscan);
  const end = Math.min(rowCount - 1, findRowIndex(offsets, bottom) + overscan);
  return { start, end };
}

export function getVirtualRows(offsets: number[], range: Range): VirtualRow[] {
  const rows: VirtualRow[] = [];
  for (let i = range.start; i <= range.end; i++) {
    rows.push({
      index: i,
      start: offsets[i],
      height: offsets[i + 1] - offsets[i],
    });
  }
  return rows;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -w @melstudio/web -- src/lib/virtualizer.test.ts`
Expected: PASS (전체)

주의: `computeRange`의 "마지막 근처" 테스트가 실패하면 `findRowIndex` 경계 처리(`y < offsets[1]` / `y >= offsets[rowCount]`)를 확인할 것.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/virtualizer.ts apps/web/src/lib/virtualizer.test.ts
git commit -m "feat(web): 가상화 순수 계산 코어 — 오프셋 누적합 + 이진 탐색 가시 범위"
```

---

## Task 5: `useColumnCount` 훅 — 반응형 열 수 감지

**Files:**
- Create: `apps/web/src/hooks/useColumnCount.test.tsx`
- Create: `apps/web/src/hooks/useColumnCount.ts`
- Modify: `apps/web/vitest.setup.tsx` (matchMedia 목 추가)

- [ ] **Step 1: vitest.setup.tsx에 matchMedia 목 추가**

`apps/web/vitest.setup.tsx` 맨 아래에 추가 (jsdom에는 matchMedia가 없음):

```tsx
// matchMedia 목 — 기본: 아무 쿼리도 매치 안 됨 (모바일 2열).
// 개별 테스트에서 window.matchMedia를 다시 목킹해 브레이크포인트를 시뮬레이션한다.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })),
});
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/hooks/useColumnCount.test.tsx` 생성:

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useColumnCount from "./useColumnCount";

// matchMedia를 특정 min-width들만 매치되도록 목킹
function mockViewport(matchedQueries: string[]) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchedQueries.includes(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("useColumnCount", () => {
  it("아무 브레이크포인트도 안 맞으면 2열 (모바일)", () => {
    mockViewport([]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(2);
  });

  it("sm(640px+)이면 3열", () => {
    mockViewport(["(min-width: 640px)"]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(3);
  });

  it("lg(1024px+)이면 4열 (sm도 같이 매치돼도 lg 우선)", () => {
    mockViewport(["(min-width: 640px)", "(min-width: 1024px)"]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(4);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test -w @melstudio/web -- src/hooks/useColumnCount.test.tsx`
Expected: FAIL — "Cannot find module './useColumnCount'"

- [ ] **Step 4: 구현**

`apps/web/src/hooks/useColumnCount.ts` 생성:

```ts
"use client";

import { useSyncExternalStore } from "react";

// 그리드 열 수 감지 — Tailwind 브레이크포인트와 동일하게 유지할 것.
// (InfiniteShowcaseGrid의 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 와 짝)
const BREAKPOINTS = [
  { query: "(min-width: 1024px)", columns: 4 }, // lg
  { query: "(min-width: 640px)", columns: 3 }, // sm
] as const;

// SSR 기본값: 모바일 우선 2열
const DEFAULT_COLUMNS = 2;

function subscribe(onChange: () => void): () => void {
  const lists = BREAKPOINTS.map((b) => window.matchMedia(b.query));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function getSnapshot(): number {
  for (const { query, columns } of BREAKPOINTS) {
    if (window.matchMedia(query).matches) return columns;
  }
  return DEFAULT_COLUMNS;
}

function getServerSnapshot(): number {
  return DEFAULT_COLUMNS;
}

export default function useColumnCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -w @melstudio/web -- src/hooks/useColumnCount.test.tsx`
Expected: PASS (3개)

Run: `npm run test -w @melstudio/web`
Expected: 기존 테스트 포함 전체 PASS (setup 변경이 기존 테스트를 깨지 않는지 확인)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/useColumnCount.ts apps/web/src/hooks/useColumnCount.test.tsx apps/web/vitest.setup.tsx
git commit -m "feat(web): useColumnCount 훅 — matchMedia 기반 반응형 열 수 감지"
```

---

## Task 6: `useWindowVirtualizer` 훅 — React 통합

**Files:**
- Create: `apps/web/src/hooks/useWindowVirtualizer.test.tsx`
- Create: `apps/web/src/hooks/useWindowVirtualizer.ts`
- Modify: `apps/web/vitest.setup.tsx` (ResizeObserver 목 추가)

- [ ] **Step 1: vitest.setup.tsx에 ResizeObserver 목 추가**

`apps/web/vitest.setup.tsx` 맨 아래에 추가:

```tsx
// ResizeObserver 목 (행 높이 실측용) — 테스트에서 인스턴스에 접근할 수 있게 전역 목록 유지
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observed: Element[] = [];
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.observed = [];
  }
  // 테스트 헬퍼: 측정값을 강제로 발생시킨다
  trigger(height: number) {
    this.callback(
      this.observed.map((el) => ({
        target: el,
        contentRect: { height } as DOMRectReadOnly,
      })) as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});
// 테스트에서 import 없이 접근: (window as any).__MockResizeObserver
(window as unknown as Record<string, unknown>).__MockResizeObserver = MockResizeObserver;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/hooks/useWindowVirtualizer.test.tsx` 생성:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useWindowVirtualizer from "./useWindowVirtualizer";

// jsdom: window.innerHeight 기본 768, window.scrollY 기본 0

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { writable: true, value: y });
}

describe("useWindowVirtualizer", () => {
  beforeEach(() => {
    setScrollY(0);
    // rAF를 동기 실행으로 목킹 (쓰로틀 없이 즉시 계산)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("스크롤 0에서 첫 화면 행들만 반환한다", () => {
    const { result } = renderHook(() =>
      useWindowVirtualizer({ rowCount: 100, estimateHeight: 100, overscan: 2 }),
    );
    // 뷰포트 768px / 행 100px → 가시 0~7행 + overscan 2 → 0~9
    const indexes = result.current.virtualRows.map((r) => r.index);
    expect(indexes[0]).toBe(0);
    expect(indexes[indexes.length - 1]).toBe(9);
    expect(result.current.totalHeight).toBe(100 * 100);
  });

  it("스크롤하면 가시 범위가 이동한다", () => {
    const { result } = renderHook(() =>
      useWindowVirtualizer({ rowCount: 100, estimateHeight: 100, overscan: 2 }),
    );

    act(() => {
      setScrollY(5000);
      window.dispatchEvent(new Event("scroll"));
    });

    const indexes = result.current.virtualRows.map((r) => r.index);
    // 가시 50~57행 + overscan → 48~59
    expect(indexes[0]).toBe(48);
    expect(indexes).toContain(50);
    expect(indexes[indexes.length - 1]).toBe(59);
  });

  it("행 실측값이 반영되면 totalHeight가 갱신된다", () => {
    const { result } = renderHook(() =>
      useWindowVirtualizer({ rowCount: 10, estimateHeight: 100, overscan: 2 }),
    );
    expect(result.current.totalHeight).toBe(1000);

    // 0번 행을 실측 200px로 보고
    const el = document.createElement("div");
    act(() => {
      result.current.measureRow(0)(el);
      // ResizeObserver 목으로 측정 발생
      const MockRO = (window as unknown as Record<string, unknown>)
        .__MockResizeObserver as {
        instances: { trigger: (h: number) => void }[];
      };
      MockRO.instances[MockRO.instances.length - 1].trigger(200);
    });

    expect(result.current.totalHeight).toBe(1000 + 100); // 0번 행 100 → 200
  });

  it("rowCount가 줄어들면 (필터 변경) 범위가 클램프된다", () => {
    const { result, rerender } = renderHook(
      ({ rowCount }) =>
        useWindowVirtualizer({ rowCount, estimateHeight: 100, overscan: 2 }),
      { initialProps: { rowCount: 100 } },
    );

    act(() => {
      setScrollY(5000);
      window.dispatchEvent(new Event("scroll"));
    });

    rerender({ rowCount: 3 }); // 필터로 행이 3개로 줄어듦

    const indexes = result.current.virtualRows.map((r) => r.index);
    expect(Math.max(...indexes)).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test -w @melstudio/web -- src/hooks/useWindowVirtualizer.test.tsx`
Expected: FAIL — "Cannot find module './useWindowVirtualizer'"

- [ ] **Step 4: 구현**

`apps/web/src/hooks/useWindowVirtualizer.ts` 생성:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildOffsets,
  computeRange,
  getVirtualRows,
  totalHeight as calcTotalHeight,
  type VirtualRow,
} from "@/lib/virtualizer";

// 윈도우 스크롤 기반 행 가상화 훅 (직접 구현).
//
// - 스크롤/리사이즈: rAF 쓰로틀로 프레임당 최대 1회 재계산
// - 행 높이: estimateHeight로 시작 → ResizeObserver 실측으로 보정
// - 실측 보정 시 가시 영역 위쪽 행이 변하면 scrollBy로 위치 보정 (스크롤 튐 방지)
// - SSR: window가 없으므로 scrollY=0, 뷰포트는 기본값으로 첫 행들을 렌더

type Options = {
  rowCount: number;
  estimateHeight: number;
  overscan?: number;
};

type Result = {
  virtualRows: VirtualRow[];
  totalHeight: number;
  /** 그리드 컨테이너 ref — scrollMargin(문서 상단 오프셋) 계산용 */
  containerRef: (el: HTMLElement | null) => void;
  /** 행 ref 팩토리 — <div ref={measureRow(index)}> 로 사용 */
  measureRow: (index: number) => (el: HTMLElement | null) => void;
};

const SSR_VIEWPORT_HEIGHT = 800;

export default function useWindowVirtualizer({
  rowCount,
  estimateHeight,
  overscan = 3,
}: Options): Result {
  const measuredRef = useRef(new Map<number, number>());
  const observersRef = useRef(new Map<number, ResizeObserver>());
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // 스크롤/실측 변화 시 리렌더 트리거
  const [, setTick] = useState(0);

  // rAF 쓰로틀: boolean 플래그 사용.
  // (rafId 비교 방식은 테스트의 동기 rAF 목에서 콜백→할당 순서 때문에 가드가 깨진다)
  const pendingRef = useRef(false);
  const rafIdRef = useRef(0);
  const scheduleUpdate = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      pendingRef.current = false;
      setTick((n) => n + 1);
    });
  }, []);

  // window 스크롤/리사이즈 구독
  useEffect(() => {
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [scheduleUpdate]);

  // ── 렌더 시점 계산 (SSR 안전) ──
  const isClient = typeof window !== "undefined";
  const scrollY = isClient ? window.scrollY : 0;
  const viewportHeight = isClient ? window.innerHeight : SSR_VIEWPORT_HEIGHT;
  const scrollMargin = container ? container.offsetTop : 0;

  const offsets = buildOffsets(rowCount, estimateHeight, measuredRef.current);
  const range = computeRange({
    offsets,
    scrollY,
    viewportHeight,
    scrollMargin,
    overscan,
  });
  const virtualRows = getVirtualRows(offsets, range);
  const total = calcTotalHeight(offsets);

  // 현재 가시 범위 시작 (실측 보정 시 스크롤 튐 방지용)
  const rangeStartRef = useRef(range.start);
  rangeStartRef.current = range.start;

  // ── 행 실측 (ResizeObserver) ──
  const measureRow = useCallback(
    (index: number) =>
      (el: HTMLElement | null) => {
        // 기존 옵저버 해제 (행 언마운트 또는 교체)
        const prev = observersRef.current.get(index);
        if (prev) {
          prev.disconnect();
          observersRef.current.delete(index);
        }
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
          const height = entries[0]?.contentRect.height ?? 0;
          if (height <= 0) return;
          const prevHeight = measuredRef.current.get(index) ?? estimateHeight;
          if (height === prevHeight) return;

          measuredRef.current.set(index, height);

          // 가시 영역 위쪽 행의 높이가 바뀌면 그 차이만큼 스크롤 보정
          if (index < rangeStartRef.current) {
            window.scrollBy(0, height - prevHeight);
          }
          scheduleUpdate();
        });
        observer.observe(el);
        observersRef.current.set(index, observer);
      },
    [estimateHeight, scheduleUpdate],
  );

  // 언마운트 시 옵저버 전체 해제
  useEffect(() => {
    const observers = observersRef.current;
    return () => {
      observers.forEach((o) => o.disconnect());
      observers.clear();
    };
  }, []);

  return {
    virtualRows,
    totalHeight: total,
    containerRef: setContainer,
    measureRow,
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -w @melstudio/web -- src/hooks/useWindowVirtualizer.test.tsx`
Expected: PASS (4개)

실패 시 흔한 원인:
- rAF 목이 동기 실행이 아니어서 setTick이 안 불림 → beforeEach의 mockImplementation 확인
- jsdom의 `window.innerHeight`가 768이 아닌 경우 → 테스트 기대값을 `Math.ceil((innerHeight)/100)+overscan` 기준으로 조정

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/useWindowVirtualizer.ts apps/web/src/hooks/useWindowVirtualizer.test.tsx apps/web/vitest.setup.tsx
git commit -m "feat(web): useWindowVirtualizer 훅 — rAF 쓰로틀 + ResizeObserver 실측 + 스크롤 보정"
```

---

## Task 7: `ShowcaseCard`에 `animate` prop 추가

**Files:**
- Modify: `apps/web/src/components/ShowcaseCard.tsx`

가상화로 카드가 재마운트될 때 fade-up 애니메이션이 반복 재생되는 것을 막는다.
기존 사용처(홈 `ShowcaseGrid`, 현재 `InfiniteShowcaseGrid`)는 기본값 `true`라 동작이 변하지 않는다.

- [ ] **Step 1: ShowcaseCard 수정**

`apps/web/src/components/ShowcaseCard.tsx`에서 props에 `animate`를 추가하고 className/style에 반영:

```tsx
"use client";

import type { Showcase } from "@melstudio/shared";
import PagePreview from "./PagePreview";

export default function ShowcaseCard({
  item,
  index,
  categoryLabel,
  onOpen,
  animate = true,
}: {
  item: Showcase;
  index: number;
  categoryLabel: string;
  onOpen: (item: Showcase) => void;
  /** false면 fade-up 애니메이션 없이 즉시 표시 (가상화 재마운트용) */
  animate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group relative flex flex-col text-left focus:outline-none ${
        animate ? "animate-fade-up" : ""
      }`}
      style={animate ? { animationDelay: `${index * 70}ms` } : undefined}
      aria-label={`${item.title} 미리보기 열기`}
    >
```

(이하 카드 내부 JSX는 기존 그대로 유지 — 변경 없음)

- [ ] **Step 2: 기존 테스트가 깨지지 않는지 확인**

Run: `npm run test -w @melstudio/web`
Expected: 전체 PASS (HomeShowcaseSection.test.tsx 등 기존 테스트 영향 없음)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ShowcaseCard.tsx
git commit -m "feat(web): ShowcaseCard animate prop — 가상화 재마운트 시 애니메이션 생략"
```

---

## Task 8: `InfiniteShowcaseGrid` 가상화 적용 (재작성)

**Files:**
- Create: `apps/web/src/components/InfiniteShowcaseGrid.test.tsx`
- Modify: `apps/web/src/components/InfiniteShowcaseGrid.tsx` (전체 재작성)

- [ ] **Step 1: 실패하는 RTL 테스트 작성**

`apps/web/src/components/InfiniteShowcaseGrid.test.tsx` 생성:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { Showcase } from "@melstudio/shared";
import InfiniteShowcaseGrid from "./InfiniteShowcaseGrid";

// 1,000개 더미 아이템
const ITEMS: Showcase[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `item-${i}`,
  title: `쇼케이스 ${i}`,
  blurb: `설명 ${i}`,
  category: "cafe",
  accent: "#C2410C",
  layout: "hero",
  desktop: null,
  mobile: null,
  thumb: null,
}));

const defaultProps = {
  items: ITEMS,
  labelOf: () => "카페·베이커리",
  onOpen: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  onLoadMore: vi.fn(),
};

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { writable: true, value: y });
}

describe("InfiniteShowcaseGrid (가상화)", () => {
  beforeEach(() => {
    setScrollY(0);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("1,000개를 줘도 화면 분량만 렌더한다", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} />);
    const cards = screen.getAllByRole("button", { name: /미리보기 열기/ });
    // jsdom 뷰포트(768px) + overscan → 수십 개 수준. 1,000개 전부가 아님을 확인.
    expect(cards.length).toBeLessThan(100);
    expect(cards.length).toBeGreaterThan(0);
  });

  it("스크롤하면 다른 아이템들이 렌더된다 (아이템 교체)", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} />);
    // 처음에는 item-0이 있고 item-500은 없다
    expect(screen.getByLabelText("쇼케이스 0 미리보기 열기")).toBeTruthy();
    expect(screen.queryByLabelText("쇼케이스 500 미리보기 열기")).toBeNull();

    // 중간으로 스크롤 (2열 × 행 추정높이 기준 대략 중간 지점)
    act(() => {
      setScrollY(80_000);
      window.dispatchEvent(new Event("scroll"));
    });

    // item-0은 사라지고 중간 아이템이 보인다
    expect(screen.queryByLabelText("쇼케이스 0 미리보기 열기")).toBeNull();
    const cards = screen.getAllByRole("button", { name: /미리보기 열기/ });
    expect(cards.length).toBeLessThan(100);
  });

  it("마지막 행 근처에 도달하면 onLoadMore를 호출한다", () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteShowcaseGrid
        {...defaultProps}
        items={ITEMS.slice(0, 24)} // 2열 → 12행
        hasNextPage={true}
        onLoadMore={onLoadMore}
      />,
    );

    // 끝까지 스크롤
    act(() => {
      setScrollY(100_000);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(onLoadMore).toHaveBeenCalled();
  });

  it("hasNextPage=false면 '전부 봤어요'를 표시한다", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} hasNextPage={false} />);
    expect(screen.getByText(/전부 봤어요/)).toBeTruthy();
  });

  it("로딩 중이면 스피너 문구를 표시한다", () => {
    render(
      <InfiniteShowcaseGrid
        {...defaultProps}
        hasNextPage={true}
        isFetchingNextPage={true}
      />,
    );
    expect(screen.getByText(/불러오는 중/)).toBeTruthy();
  });

  it("빈 목록이면 빈 상태 UI를 보여준다", () => {
    render(<InfiniteShowcaseGrid {...defaultProps} items={[]} />);
    expect(screen.getByText(/준비된 페이지가 없어요/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -w @melstudio/web -- src/components/InfiniteShowcaseGrid.test.tsx`
Expected: FAIL — "1,000개를 줘도 화면 분량만" 테스트에서 1,000개 전부 렌더됨 (현재는 가상화 없음)

- [ ] **Step 3: InfiniteShowcaseGrid 재작성**

`apps/web/src/components/InfiniteShowcaseGrid.tsx` 전체를 다음으로 교체:

```tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Showcase } from "@melstudio/shared";
import ShowcaseCard from "./ShowcaseCard";
import useColumnCount from "@/hooks/useColumnCount";
import useWindowVirtualizer from "@/hooks/useWindowVirtualizer";

// 행 높이 추정값(px): 카드(16/11 비율) + 텍스트 + 행 간격.
// 실측(measureRow)으로 곧바로 보정되므로 대략적이어도 된다.
const ESTIMATE_ROW_HEIGHT = 320;

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
  const columns = useColumnCount();

  // 아이템을 열 수만큼 행으로 묶기
  const rows = useMemo(() => {
    const out: Showcase[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      out.push(items.slice(i, i + columns));
    }
    return out;
  }, [items, columns]);

  const { virtualRows, totalHeight, containerRef, measureRow } =
    useWindowVirtualizer({
      rowCount: rows.length,
      estimateHeight: ESTIMATE_ROW_HEIGHT,
      overscan: 3,
    });

  // 첫 마운트 여부 — 첫 페인트의 카드들만 fade-up stagger 적용
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    isFirstMountRef.current = false;
  }, []);

  // 마지막 행이 가상 범위에 들어오면 다음 페이지 로드 (센티널 대체)
  const lastVirtualIndex = virtualRows[virtualRows.length - 1]?.index ?? -1;
  useEffect(() => {
    if (
      lastVirtualIndex >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      onLoadMore();
    }
  }, [lastVirtualIndex, rows.length, hasNextPage, isFetchingNextPage, onLoadMore]);

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
      {/* 가상화 컨테이너: 전체 높이를 유지하고 보이는 행만 absolute 배치 */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: totalHeight }}
        data-testid="virtual-grid"
      >
        {virtualRows.map((vr) => (
          <div
            key={vr.index}
            ref={measureRow(vr.index)}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${vr.start}px)` }}
          >
            {/* 행 내부: 기존 그리드 클래스 재사용. pb-5가 행 간격(gap) 역할 */}
            <div className="grid grid-cols-2 gap-5 pb-5 sm:grid-cols-3 lg:grid-cols-4">
              {rows[vr.index]?.map((item, colIdx) => (
                <ShowcaseCard
                  key={item.id}
                  item={item}
                  index={colIdx}
                  categoryLabel={labelOf(item.category)}
                  onOpen={onOpen}
                  animate={isFirstMountRef.current}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 하단 상태 */}
      <div className="mt-10 flex items-center justify-center py-6">
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -w @melstudio/web -- src/components/InfiniteShowcaseGrid.test.tsx`
Expected: PASS (6개)

Run: `npm run test -w @melstudio/web`
Expected: 전체 PASS

- [ ] **Step 5: 브라우저 수동 확인 (회귀 체크)**

전제: API + docker 실행 중.

```bash
npm run dev:web
```

브라우저에서 http://localhost:3000/showcase 열고:
1. 카드가 그리드로 보이고 스크롤하면 계속 로드되는지
2. 개발자도구 Elements에서 카드 DOM이 스크롤에 따라 추가/제거되는지
3. 창 크기를 줄였다 늘렸다 해도 (2열↔4열) 레이아웃이 안 깨지는지
4. 카드 클릭 → 모달 열림 → 닫기 정상인지

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/InfiniteShowcaseGrid.tsx apps/web/src/components/InfiniteShowcaseGrid.test.tsx
git commit -m "feat(web): InfiniteShowcaseGrid 행 단위 가상화 적용 — 보이는 행만 렌더"
```

---

## Task 9: `useScrollRestoration` 훅 + ShowcaseExplorer 연결

**Files:**
- Create: `apps/web/src/hooks/useScrollRestoration.test.tsx`
- Create: `apps/web/src/hooks/useScrollRestoration.ts`
- Modify: `apps/web/src/components/ShowcaseExplorer.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/hooks/useScrollRestoration.test.tsx` 생성:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useScrollRestoration from "./useScrollRestoration";

const KEY = "showcase-scroll";

describe("useScrollRestoration", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  it("저장된 위치가 있고 카테고리/페이지 수가 맞으면 복원한다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "all", pageCount: 3 }),
    );
    renderHook(() => useScrollRestoration("all", 3));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 1234);
  });

  it("카테고리가 다르면 복원하지 않는다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "cafe", pageCount: 3 }),
    );
    renderHook(() => useScrollRestoration("all", 3));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("로드된 페이지가 저장 시점보다 적으면 (캐시 만료) 복원하지 않는다", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ offset: 1234, category: "all", pageCount: 5 }),
    );
    renderHook(() => useScrollRestoration("all", 1)); // 캐시가 비어 1페이지뿐
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("스크롤하면 현재 위치를 저장한다", () => {
    renderHook(() => useScrollRestoration("all", 2));

    Object.defineProperty(window, "scrollY", { writable: true, value: 777 });
    window.dispatchEvent(new Event("scroll"));

    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
    expect(saved).toEqual({ offset: 777, category: "all", pageCount: 2 });
  });

  it("sessionStorage가 막혀 있어도 (시크릿 모드) throw하지 않는다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => {
      renderHook(() => useScrollRestoration("all", 1));
      window.dispatchEvent(new Event("scroll"));
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -w @melstudio/web -- src/hooks/useScrollRestoration.test.tsx`
Expected: FAIL — "Cannot find module './useScrollRestoration'"

- [ ] **Step 3: 구현**

`apps/web/src/hooks/useScrollRestoration.ts` 생성:

```ts
"use client";

import { useEffect, useRef } from "react";

// /showcase 스크롤 위치 복원 (뒤로가기 대응).
//
// 저장: 스크롤할 때마다 rAF 쓰로틀로 sessionStorage에 기록
// 복원: 마운트 시 1회 — 같은 카테고리이고, React Query 캐시 데이터(pageCount)가
//       저장 시점 이상으로 로드돼 있을 때만 복원 (캐시가 비었으면 복원 무의미)
// 무효화: 카테고리가 바뀌면 새 카테고리 기준으로 다시 저장됨

const KEY = "showcase-scroll";

type Saved = { offset: number; category: string; pageCount: number };

function read(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null; // 시크릿 모드 등 — 복원 기능만 비활성화
  }
}

function write(data: Saved): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 무시 (기능 저하일 뿐 동작에는 지장 없음)
  }
}

export default function useScrollRestoration(
  category: string,
  pageCount: number,
): void {
  // ── 복원: 마운트 시 1회 ──
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = read();
    if (
      saved &&
      saved.category === category &&
      saved.pageCount > 0 &&
      pageCount >= saved.pageCount
    ) {
      window.scrollTo(0, saved.offset);
    }
  }, [category, pageCount]);

  // ── 저장: 스크롤 시 rAF 쓰로틀 (boolean 플래그 — 동기 rAF 목에서도 안전) ──
  useEffect(() => {
    let pending = false;
    let rafId = 0;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(() => {
        pending = false;
        write({ offset: window.scrollY, category, pageCount });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [category, pageCount]);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -w @melstudio/web -- src/hooks/useScrollRestoration.test.tsx`
Expected: PASS (5개)

- [ ] **Step 5: ShowcaseExplorer에 연결**

`apps/web/src/components/ShowcaseExplorer.tsx` 수정 — import 추가, 훅 호출, 필터 변경 시 스크롤 리셋:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { Category, Showcase, ShowcaseList } from "@melstudio/shared";
import { useInfiniteShowcases } from "@/lib/queries";
import useScrollRestoration from "@/hooks/useScrollRestoration";
import TagBar from "./TagBar";
import InfiniteShowcaseGrid from "./InfiniteShowcaseGrid";
import PreviewModal from "./PreviewModal";

// /showcase의 클라이언트 섬 — 무한스크롤/필터/모달 인터랙션 담당.
// 첫 페이지 데이터와 카테고리는 서버 컴포넌트(ISR)에서 props로 받는다 (하이브리드).
export default function ShowcaseExplorer({
  categories,
  initialPage,
  apiDown,
}: {
  categories: Category[];
  initialPage: ShowcaseList | null;
  apiDown: boolean;
}) {
  const [active, setActive] = useState<string>("all");
  const [selected, setSelected] = useState<Showcase | null>(null);

  const showcasesQuery = useInfiniteShowcases(active, initialPage ?? undefined);

  // 페이지들을 평탄화해 단일 목록으로
  const items = useMemo(
    () => showcasesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [showcasesQuery.data],
  );

  // 뒤로가기 스크롤 복원 (React Query 캐시에 데이터가 있을 때만)
  useScrollRestoration(active, showcasesQuery.data?.pages.length ?? 0);

  const tabs: Category[] = useMemo(
    () => [{ id: "all", label: "전체" }, ...categories],
    [categories],
  );

  const labelOf = useMemo(() => {
    const m = new Map(tabs.map((t) => [t.id, t.label]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [tabs]);

  const isError = apiDown || showcasesQuery.isError;
  const isLoading = showcasesQuery.isLoading;

  // 카테고리 변경: 스크롤 top 리셋 (저장된 오프셋은 새 카테고리 기준으로 덮어써짐)
  const handleCategoryChange = (id: string) => {
    setActive(id);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className="sticky top-0 z-30 -mx-5 mb-10 bg-blush/70 px-5 py-4 backdrop-blur-md">
        <TagBar categories={tabs} active={active} onChange={handleCategoryChange} />
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

      {/* ── 미리보기 모달 ── */}
      <PreviewModal
        item={selected}
        categoryLabel={selected ? labelOf(selected.category) : ""}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
```

- [ ] **Step 6: 전체 테스트 + 수동 확인**

Run: `npm run test -w @melstudio/web`
Expected: 전체 PASS

수동 확인 (dev 서버 + API 실행 상태):
1. /showcase에서 한참 스크롤 → 카드 클릭해 모달 열기 → 닫기 → **같은 위치인지**
2. 한참 스크롤 → 헤더에서 "이용 안내"(/guide) 클릭 → 브라우저 뒤로가기 → **같은 위치로 돌아오는지**
3. 카테고리 탭 변경 → **맨 위로 스크롤되는지**

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/hooks/useScrollRestoration.ts apps/web/src/hooks/useScrollRestoration.test.tsx apps/web/src/components/ShowcaseExplorer.tsx
git commit -m "feat(web): 스크롤 위치 복원 — sessionStorage + React Query 캐시 기반 뒤로가기 복원"
```

---

## Task 10: `useInfiniteShowcases` 훅 테스트 (기존 코드, 테스트만 추가)

**Files:**
- Create: `apps/web/src/lib/queries.test.tsx`

- [ ] **Step 1: 테스트 작성**

`apps/web/src/lib/queries.test.tsx` 생성:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ShowcaseList } from "@melstudio/shared";
import { useInfiniteShowcases } from "./queries";
import * as api from "./api";

vi.mock("./api");

const mockFetchShowcases = vi.mocked(api.fetchShowcases);

function makeItem(id: string) {
  return {
    id,
    title: `제목 ${id}`,
    blurb: "설명",
    category: "cafe",
    accent: "#C2410C",
    layout: "hero" as const,
    desktop: null,
    mobile: null,
    thumb: null,
  };
}

function makePage(ids: string[], nextCursor: string | null): ShowcaseList {
  return { items: ids.map(makeItem), nextCursor };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useInfiniteShowcases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("첫 페이지를 불러오고 items로 평탄화할 수 있다", async () => {
    mockFetchShowcases.mockResolvedValueOnce(makePage(["a", "b"], null));

    const { result } = renderHook(() => useInfiniteShowcases("all"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = result.current.data!.pages.flatMap((p) => p.items);
    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("nextCursor가 있으면 다음 페이지를 커서로 요청한다", async () => {
    mockFetchShowcases
      .mockResolvedValueOnce(makePage(["a"], "cursor-1"))
      .mockResolvedValueOnce(makePage(["b"], null));

    const { result } = renderHook(() => useInfiniteShowcases("all"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => {
      const items = result.current.data!.pages.flatMap((p) => p.items);
      expect(items.map((i) => i.id)).toEqual(["a", "b"]);
    });

    // 2번째 호출에 커서가 전달됐는지
    expect(mockFetchShowcases).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "cursor-1", category: "all" }),
    );
  });

  it("카테고리가 바뀌면 첫 페이지부터 다시 요청한다 (queryKey 분리)", async () => {
    mockFetchShowcases.mockResolvedValue(makePage(["a"], null));

    const { result, rerender } = renderHook(
      ({ category }) => useInfiniteShowcases(category),
      { wrapper, initialProps: { category: "all" } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ category: "cafe" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // cafe 카테고리로 커서 없이(첫 페이지) 호출됐는지
    expect(mockFetchShowcases).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: "cafe", cursor: null }),
    );
  });

  it("initialPage를 주면 (전체 탭) 클라이언트 재요청 없이 그 데이터로 시작한다", async () => {
    const initial = makePage(["server-1"], "cursor-next");

    const { result } = renderHook(() => useInfiniteShowcases("all", initial), {
      wrapper,
    });

    // fetch 없이 즉시 데이터 존재
    expect(result.current.data!.pages[0].items[0].id).toBe("server-1");
    expect(result.current.hasNextPage).toBe(true);
    expect(mockFetchShowcases).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm run test -w @melstudio/web -- src/lib/queries.test.tsx`
Expected: PASS (4개) — 기존 코드가 올바르면 바로 통과. 실패하면 기존 코드의 버그이므로 원인을 보고할 것 (멋대로 고치지 말 것).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/queries.test.tsx
git commit -m "test(web): useInfiniteShowcases 훅 테스트 — 평탄화/커서/카테고리 리셋/initialPage"
```

---

## Task 11: Playwright E2E 시나리오 3개

**Files:**
- Modify: `apps/web/e2e/showcase.spec.ts`

- [ ] **Step 1: E2E 시나리오 추가**

`apps/web/e2e/showcase.spec.ts`에 기존 스모크 테스트 아래 추가:

```ts
test.describe("/showcase 가상화 + 스크롤 복원", () => {
  test("끝까지 스크롤하면 전체를 탐색하고 '전부 봤어요'가 보인다", async ({
    page,
  }) => {
    test.setTimeout(300_000); // 1,039개 전체 로드
    await page.goto("/showcase");
    await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

    // 끝까지 스크롤 (전부 봤어요가 나올 때까지)
    await page.evaluate(async () => {
      const deadline = Date.now() + 4 * 60 * 1000;
      while (Date.now() < deadline) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 300));
        if (document.body.innerText.includes("전부 봤어요")) return;
      }
    });

    await expect(page.getByText("전부 봤어요")).toBeVisible();

    // 가상화 검증: 전체(1,039개)가 아니라 화면 분량만 DOM에 존재
    const renderedCards = await page
      .getByRole("button", { name: /미리보기 열기/ })
      .count();
    expect(renderedCards).toBeLessThan(100);
  });

  test("모달을 열었다 닫아도 스크롤 위치가 유지된다", async ({ page }) => {
    await page.goto("/showcase");
    await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

    // 몇 페이지 로드되도록 스크롤
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
      }
      window.scrollTo(0, 2000);
      await new Promise((r) => setTimeout(r, 300));
    });

    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(1000);

    // 보이는 카드 클릭 → 모달 → 닫기
    await page.getByRole("button", { name: /미리보기 열기/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(50);
  });

  test("다른 페이지 갔다 뒤로가기 하면 위치가 복원된다", async ({ page }) => {
    await page.goto("/showcase");
    await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

    // 몇 페이지 로드 + 특정 위치로 스크롤
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
      }
      window.scrollTo(0, 3000);
      await new Promise((r) => setTimeout(r, 500)); // 저장(rAF) 대기
    });

    const before = await page.evaluate(() => window.scrollY);

    // /guide로 이동 (클라이언트 내비게이션) 후 뒤로가기
    // SiteHeader의 /guide 링크 텍스트는 "안내"
    await page.getByRole("link", { name: "안내" }).first().click();
    await page.waitForURL("**/guide");
    await page.goBack();
    await page.waitForURL("**/showcase");

    // 복원 대기 후 위치 확인
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(200);
  });
});
```


- [ ] **Step 2: E2E 실행**

전제: docker + API 실행 중, 시드 1,039개.

Run: `npm run test:e2e -w @melstudio/web`
Expected: 측정 스크립트 포함 전체 PASS (측정 테스트도 다시 돌지만 무해)

특정 테스트만: `npm run test:e2e -w @melstudio/web -- showcase`

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/showcase.spec.ts
git commit -m "test(web): 가상화 E2E — 끝까지 스크롤/모달 위치 유지/뒤로가기 복원"
```

---

## Task 12: After 측정 + 측정 문서/README 완성

**Files:**
- Modify: `docs/perf/showcase-virtualization-before-after.md`
- Modify: `README.md`

- [ ] **Step 1: After 측정 실행**

전제: docker + API 실행 중, 시드 1,039개, **가상화 구현 완료 상태**.
**주의: 포트 3000의 dev 서버는 먼저 종료** (Before 측정과 동일 — 프로덕션 빌드로 측정).

Run: `npm run test:e2e -w @melstudio/web -- measure`
Expected: PASS + 콘솔에 After 측정 JSON 출력

- [ ] **Step 2: 측정 문서의 After 칸 채우기 + 분석 작성**

`docs/perf/showcase-virtualization-before-after.md`의 After 열에 Step 1 결과를 기입하고, 분석 섹션을 작성:

```markdown
## 분석

- DOM 노드: Before {{before}} → After {{after}} ({{배수}}배 감소) —
  가상화로 화면에 보이는 행(+overscan 3행)만 DOM에 존재
- 렌더된 카드: 1,039개 전부 → {{after_cards}}개 (가시 영역 분량)
- 평균 프레임 시간: {{before_ms}}ms → {{after_ms}}ms
- long frame: {{before_count}}개 → {{after_count}}개
- 구현: 라이브러리 없이 직접 구현 (`lib/virtualizer.ts` 순수 코어 + `hooks/useWindowVirtualizer.ts`)
```

- [ ] **Step 3: README에 성능 섹션 추가**

`README.md`의 "## 테스트" 섹션 아래에 추가:

```markdown
## 성능

### /showcase 무한스크롤 가상화 (직접 구현, 라이브러리 없음)

쇼케이스 1,039개를 끝까지 로드한 상태에서 측정 (Playwright 자동화, 동일 조건 비교):

| 지표 | Before (가상화 없음) | After (가상화) |
|---|---|---|
| DOM 노드 수 | {{before_dom}} | {{after_dom}} |
| 렌더된 카드 수 | 1,039 (전체) | {{after_cards}} (가시 영역만) |
| 평균 프레임 시간 | {{before_frame}}ms | {{after_frame}}ms |
| 50ms+ long frame | {{before_long}}개 | {{after_long}}개 |

- 구현: 순수 계산 코어(`lib/virtualizer.ts`) + React 훅(`hooks/useWindowVirtualizer.ts`) 분리 설계
- 상세: [docs/perf/showcase-virtualization-before-after.md](docs/perf/showcase-virtualization-before-after.md)
```

또한 README의 시드 개수 언급을 업데이트:
- `npm run setup` 설명의 "시드(8 + 159)" → "시드(8 + 1,039)"
- 진행 로드맵의 "②-b 클라우드 스토리지(MinIO) 이미지 + 가상화" 항목에서 가상화를 완료 표시 (또는 분리 표기)

- [ ] **Step 4: Commit**

```bash
git add docs/perf/showcase-virtualization-before-after.md README.md
git commit -m "docs: 가상화 Before/After 측정 결과 — DOM 노드/프레임 시간 비교, README 성능 섹션"
```

---

## Task 13: 로드맵 체크 + 최종 검증

**Files:**
- Modify: `docs/superpowers/plans/2026-06-01-post-mvp-roadmap.md`

- [ ] **Step 1: 전체 테스트 실행 (web + api)**

```bash
npm run test -w @melstudio/api
npm run test -w @melstudio/web
npm run test -w @melstudio/shared
```
Expected: 전체 PASS

- [ ] **Step 2: 린트 + 프로덕션 빌드 확인**

```bash
npm run lint -w @melstudio/web
npm run build -w @melstudio/web
```
Expected: 에러 없음 (warning은 기록만)

- [ ] **Step 3: 로드맵 2순위 체크박스 업데이트**

`docs/superpowers/plans/2026-06-01-post-mvp-roadmap.md`의 2순위 섹션에서 완료 항목을 `[x]`로 변경:

```markdown
**작업** (순서 변경: 시드 먼저 확장 → 동일 규모로 Before/After 비교)
- [x] 시드 데이터를 1,000개+로 확장 (생성기 perCategory 조정 + createMany)
- [x] 측정 먼저: 1,000개 전부 로드 시 DOM 노드 수 / 스크롤 성능 기록 (Before)
- [x] **윈도우 가상화 직접 구현** (라이브러리 ❌) — 순수 계산 코어 + React 훅 + InfiniteShowcaseGrid 행 단위 적용
- [x] 스크롤 위치 복원 (모달 열었다 닫아도, 뒤로가기 해도 위치 유지)
- [x] 측정: After — DOM 노드 수 일정하게 유지되는지, 스크롤 성능 기록 → README

**테스트 (이 단계에 포함)**
- [x] 가상화 코어 단위 테스트: 오프셋/가시 범위 계산 (DOM 불필요)
- [x] 가상화 그리드 RTL 테스트: 보이는 행만 렌더되는지, 스크롤 시 아이템 교체되는지
- [x] useInfiniteShowcases 훅 테스트: 페이지 평탄화, 커서 연결, 카테고리 변경 시 리셋
- [x] Playwright E2E: 끝까지 스크롤 → 전체 로드 → "전부 봤어요" 표시
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-06-01-post-mvp-roadmap.md
git commit -m "docs: 로드맵 2순위(가상화) 완료 체크"
```

- [ ] **Step 5: 사람이 확인할 것 (보고)**

구현 완료 보고 시 다음을 사용자에게 안내:
1. 브라우저에서 1,039개 스크롤이 버벅이지 않는지
2. 개발자도구 Elements에서 DOM 노드 수가 화면에 보이는 만큼만 유지되는지
3. 모달/뒤로가기 스크롤 복원 동작
4. Before/After 표 (README) 확인

---

## 실행 순서 요약

```
Task 1  시드 1,039개         (api 테스트 + DB 시드)
Task 2  Playwright 구축       (스모크 E2E)
Task 3  Before 측정           (가상화 없는 상태에서!)
Task 4  가상화 순수 코어       (TDD)
Task 5  useColumnCount        (TDD)
Task 6  useWindowVirtualizer  (TDD)
Task 7  ShowcaseCard animate  (기존 테스트 회귀 확인)
Task 8  InfiniteShowcaseGrid  (TDD, 가상화 적용)
Task 9  스크롤 복원            (TDD + Explorer 연결)
Task 10 useInfiniteShowcases  (테스트만 추가)
Task 11 E2E 시나리오 3개
Task 12 After 측정 + 문서
Task 13 로드맵 체크 + 최종 검증
```

**중요: Task 3(Before 측정)은 반드시 Task 4~9(가상화 구현) 전에 실행해야 한다.**
