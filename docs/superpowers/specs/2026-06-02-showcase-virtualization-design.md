# 쇼케이스 무한스크롤 가상화 (/showcase) — 설계서

- 작성일: 2026-06-02 (수정: 라이브러리 → **직접 구현**으로 변경)
- 상태: 설계 승인됨
- 상위 문서: [2026-06-01-post-mvp-roadmap.md](../plans/2026-06-01-post-mvp-roadmap.md) — 2순위
- 선행 작업: ② /showcase 무한스크롤 완료 ([설계서](2026-06-01-showcase-infinite-scroll-design.md)), 1순위 RSC 마이그레이션(하이브리드 ISR)

---

## 1. 목표

`/showcase` 무한스크롤 그리드에 **행 단위 윈도우 가상화를 직접 구현**해 적용한다.
데이터가 1,000개 이상이어도 DOM 노드 수가 화면에 보이는 만큼만 유지되고 스크롤이 부드럽게 동작하게 한다.
Before/After를 **동일 조건(1,000개)** 에서 측정해 README에 기록한다.

> **왜 직접 구현인가**: `@tanstack/react-virtual` 같은 검증된 라이브러리가 있지만,
> 가상화의 핵심 원리(가시 범위 계산, 오프셋 보정, 높이 실측)를 체득하고
> 면접에서 코드로 증명하는 것이 이 프로젝트의 목적이다.
> 실무라면 라이브러리를 쓴다 — 이 판단 기준 자체도 면접 답변이 된다.

**범위 (이번 단계)**
- 시드 데이터 160 → 1,000개 확장 (결정적 생성 유지, `createMany`)
- Before 측정 (가상화 없음, 1,000개): DOM 노드 수 / 스크롤 성능 / JS 힙
- **윈도우 가상화 직접 구현** — 순수 계산 코어 + React 훅 분리, 행 단위 가상화
- 스크롤 위치 복원: 모달 열기/닫기 + 다른 페이지 갔다 뒤로가기
- After 측정 (같은 1,000개) → `docs/perf/` 기록 + README Before/After 표
- 테스트: 가상화 코어 단위 테스트 + RTL(그리드/훅) + **Playwright E2E 신규 도입**

**범위 제외**
- 메인 페이지(`/`) 슬라이더 — 5개뿐이라 가상화 불필요
- CI에서 E2E 자동 실행 — 3순위(배포+CI)에서
- MinIO 실제 이미지

---

## 2. 사용자 흐름 (변경 없음 — 성능만 개선)

```
/showcase 진입
   → 첫 12개 카드 (SSR/ISR, HTML 포함)
   → 스크롤 → 다음 페이지 자동 로드 (가상화: 보이는 행만 DOM에 존재)
   → 카드 클릭 → 모달 → 닫기 → 같은 위치
   → 다른 페이지 이동 → 뒤로가기 → 같은 위치 + 데이터 복원
   → 끝까지 스크롤 → "전부 봤어요 🌸"
```

UI/UX는 100% 동일하게 유지한다. 바뀌는 것은 DOM 구조(가상화)뿐이다.

---

## 3. 아키텍처

### 3.1 백엔드 (apps/api) — 시드 확장만

API는 변경하지 않는다 (커서 페이지네이션 그대로).

**시드 확장** — `apps/api/src/data/seed-data.ts`
- `GEN_PER_CATEGORY`: 15 → **120** → 원본 40 + 8 카테고리 × 120 = **1,000개**
- `seed.ts`: 쇼케이스 삽입을 개별 `create` 루프 → **`createMany`** 로 변경 (1,000개 시드 수 초 이내)
- 시드 단위 테스트 업데이트: 총 개수(1,000), slug 유일성, 카테고리/레이아웃 유효성

### 3.2 프론트 (apps/web)

```
apps/web/src/
├─ components/
│  ├─ InfiniteShowcaseGrid.tsx    # 재작성: 행 단위 가상화 그리드
│  ├─ ShowcaseExplorer.tsx        # 수정: 스크롤 복원 연결, 필터 변경 시 리셋
│  └─ ShowcaseCard.tsx            # 수정: stagger 애니메이션 prop 제어
├─ lib/
│  ├─ virtualizer.ts              # 신규: 가상화 순수 계산 코어 (DOM 의존 없음)
│  └─ queries.ts                   # 변경 없음 (테스트만 추가)
├─ hooks/                          # 신규 디렉터리
│  ├─ useWindowVirtualizer.ts     # 신규: 가상화 React 훅 (직접 구현)
│  ├─ useColumnCount.ts           # 신규: 반응형 열 수(2/3/4) 감지
│  └─ useScrollRestoration.ts     # 신규: sessionStorage 오프셋 저장/복원
└─ e2e/                            # 신규: Playwright E2E
```

새 의존성: `@playwright/test` (개발 전용). **런타임 의존성 추가 없음** (가상화 직접 구현).

### 3.3 가상화 직접 구현 — 2층 구조

**핵심 설계: 순수 계산 코어와 React 통합을 분리**한다.
계산 로직은 DOM 없이 단위 테스트 가능하고, 훅은 이벤트 연결만 담당한다.

#### ① `lib/virtualizer.ts` — 순수 계산 코어 (DOM/React 의존 없음)

```ts
// 행 오프셋 테이블: 실측값이 있으면 실측, 없으면 추정값으로 누적합 계산
buildOffsets(rowCount, estimateHeight, measuredHeights: Map<number, number>): number[]

// 가시 범위: 이진 탐색으로 [시작행, 끝행] 계산 + overscan 확장
computeRange(offsets, scrollY, viewportHeight, scrollMargin, overscan): { start, end }

// 전체 높이
totalHeight(offsets): number
```

#### ② `hooks/useWindowVirtualizer.ts` — React 통합 (~100줄)

```ts
useWindowVirtualizer({ rowCount, estimateHeight, overscan = 3 })
  → { virtualRows: { index, start, height }[], totalHeight, containerRef, measureRow }
```

- **스크롤**: `window` scroll 이벤트 → `requestAnimationFrame` 쓰로틀 → 가시 범위 재계산
- **행 높이 실측**: `measureRow(el, index)` — `ResizeObserver`로 행 요소 높이를 실측해
  `measuredHeights`에 반영 → 오프셋 테이블 재계산 (추정 → 실측 보정)
- **scrollMargin**: `containerRef`(그리드 컨테이너)의 문서 상단 오프셋 — 그리드 위 헤더/타이틀 영역 보정
- **리사이즈**: `window` resize → 뷰포트 높이/scrollMargin 재계산. 열 수 변경은 `useColumnCount`가
  담당하고, 변경 시 행 구성이 바뀌므로 실측 캐시를 무효화

#### ③ `InfiniteShowcaseGrid` — 가상화 그리드 렌더

1. **행 묶기**: `items`를 열 수만큼 잘라 `rows[]` 생성.
   열 수는 `useColumnCount`가 Tailwind 브레이크포인트와 동일한 `matchMedia`로 감지
   (기본 2열 / `sm` 640px+ 3열 / `lg` 1024px+ 4열).
2. **렌더**: `totalHeight` 높이의 relative 컨테이너 + `virtualRows`만
   `position: absolute; transform: translateY(start)` 배치. 행 내부는 기존 grid 클래스 재사용.
3. **무한스크롤 트리거**: IntersectionObserver 센티널 **제거** →
   `virtualRows` 마지막 인덱스가 `rows.length - 1`에 도달하면 `fetchNextPage()` 호출
   (`hasNextPage && !isFetchingNextPage` 조건은 동일).
4. **하단 상태 UI**: 로딩 스피너 / "전부 봤어요 🌸" 문구는 가상 컨테이너 아래 일반 요소로 유지.
5. **카드 애니메이션**: `animate-fade-up` stagger는 **첫 페이지 첫 로드에만** 적용.
   가상화로 재마운트되는 카드는 애니메이션 없음 (`animate` prop으로 제어).
   이유: 가상화는 스크롤마다 카드를 재마운트하므로 stagger가 반복 재생되면 어지러움.

#### 직접 구현에서 처리해야 하는 엣지 케이스 (면접 포인트)

| 엣지 케이스 | 처리 |
|---|---|
| 행 높이가 반응형 (열 수/뷰포트 따라 변함) | 추정값으로 시작 → ResizeObserver 실측 보정 → 오프셋 재계산 |
| 실측 보정 시 스크롤 위치가 튐 | 현재 가시 행 위쪽의 높이 변화량만큼 scrollY 보정 (scroll anchoring) |
| 열 수 변경 (리사이즈) | 행 구성이 바뀌므로 실측 캐시 무효화 + 첫 가시 아이템 기준으로 위치 유지 |
| 스크롤 핸들러 성능 | rAF 쓰로틀 — 프레임당 최대 1회 계산 |
| 빠른 스크롤 시 빈 화면 | overscan(여유 행) + 추정 높이로 즉시 placeholder 위치 계산 |

### 3.4 SSR/하이드레이션 (하이브리드 ISR 유지)

- 서버는 뷰포트를 모르므로 **2열(모바일 기준) + 추정 행 높이**로 첫 2~3행을 SSR.
  → LCP 요소(첫 행 카드)는 여전히 HTML에 포함되어 1순위 RSC 작업의 이점 유지.
- 하이드레이션 후 실제 열 수/실측 높이로 보정.
  데스크탑은 첫 페인트 직후 행 재배치가 1회 발생 — 허용 (After 측정에서 CLS로 영향 확인).

### 3.5 스크롤 위치 복원

| 시나리오 | 방법 |
|---|---|
| 모달 열기/닫기 | 모달은 오버레이(그리드 언마운트 없음) + body 스크롤 락(현행 유지) → 가상화 상태 자동 보존. **추가 코드 없음, E2E로 검증** |
| 뒤로가기 | `useScrollRestoration`: 스크롤 시 throttle로 `sessionStorage`에 `{ offset, category, pageCount }` 저장 → 복귀 시 React Query 캐시(기본 gcTime 5분)에 데이터가 있으면 `window.scrollTo(0, offset)`. 캐시가 비었으면(새로고침/만료) 복원 포기, 처음부터 |
| 카테고리 필터 변경 | 스크롤 top 리셋 + 저장 오프셋 무효화 |

### 3.6 에러/엣지 케이스

| 상황 | 처리 |
|---|---|
| 다음 페이지 fetch 실패 | 기존 에러 문구 유지, 이미 로드된 행은 그대로 표시 |
| 필터 결과 0개 | 기존 빈 상태 UI ("준비된 페이지가 없어요"), 가상 컨테이너 렌더 안 함 |
| sessionStorage 접근 불가 | try-catch로 스크롤 복원만 조용히 비활성화 |
| API 다운 (SSR 시점) | 기존 apiDown 처리 유지 |

---

## 4. 측정 (Before/After — 동일 조건 1,000개)

순서: **시드 1,000개 확장 → Before 측정 → 가상화 구현 → After 측정**

| 지표 | 측정 방법 |
|---|---|
| DOM 노드 수 | 끝까지 스크롤 후 `document.querySelectorAll("*").length` — Playwright 자동화 |
| 스크롤 성능 | Playwright + CDP 트레이싱: 끝까지 자동 스크롤하는 동안 **평균 프레임 시간(ms)** 과 **50ms 초과 long frame 개수** 기록 |
| JS 힙 메모리 | `performance.memory.usedJSHeapSize` (참고 지표) |

- 기록: `docs/perf/showcase-virtualization-before-after.md` (1순위 측정과 같은 패턴)
- 참고: 기존 159개 시점 수치도 함께 기록 (시드 확장 전 1회 측정)
- 완료 후 README에 Before/After 표 추가

---

## 5. 테스트

### 단위 테스트 (Vitest, DOM 불필요) — 가상화 코어

| 대상 | 검증 내용 |
|---|---|
| `buildOffsets` | 추정값만 / 실측 혼합 / 실측 전체일 때 누적합 정확성 |
| `computeRange` | 스크롤 위치별 가시 범위, overscan 확장, 경계(첫/마지막 행), scrollMargin 보정 |
| `totalHeight` | 오프셋 테이블과 일치 |

> 가상화의 수학적 핵심을 DOM 없이 검증 — 코어/통합 분리 설계의 이점.

### RTL/Vitest (jsdom)

| 대상 | 검증 내용 |
|---|---|
| `useWindowVirtualizer` | 스크롤 이벤트 → 가시 범위 갱신, 실측 반영 시 오프셋 갱신 (rAF/ResizeObserver 목) |
| `useColumnCount` | matchMedia 목 — 640/1024px 경계에서 2/3/4 전환 |
| `InfiniteShowcaseGrid` | 1,000개 주입 시 렌더된 카드 수가 viewport 분량(+overscan)뿐인지, 마지막 행 도달 시 `fetchNextPage` 호출, 빈 목록 UI |
| `useInfiniteShowcases` | 페이지 평탄화, 커서 연결, 카테고리 변경 시 리셋 (QueryClient wrapper + fetch 목) |
| `useScrollRestoration` | 저장/복원/무효화, sessionStorage 예외 처리 |
| 시드 생성 (api) | 총 1,000개, slug 유일성, 카테고리/레이아웃 유효성 |

### Playwright E2E (신규 도입)

- `apps/web/e2e/` + `playwright.config.ts`
  - `webServer`: web 프로덕션 빌드(`next build && next start`) 기동
  - API/DB는 로컬 docker + 시드 완료 상태 가정 (CI 연동은 3순위)
- 시나리오:
  1. `/showcase` 진입 → 끝까지 스크롤 → "전부 봤어요 🌸" 표시
  2. 스크롤 → 카드 클릭 → 모달 닫기 → 스크롤 위치 동일
  3. 스크롤 → `/guide` 이동 → 뒤로가기 → 위치·데이터 복원
- DOM 노드 수/성능 측정 스크립트도 E2E 인프라 재활용

---

## 6. 결정 사항 / 근거

| 결정 | 근거 |
|---|---|
| **가상화 직접 구현** (`@tanstack/react-virtual` ❌) | 핵심 원리 체득 + 면접에서 코드로 증명. 필요한 기능(윈도우 스크롤, 행 단위, 추정+실측)만 구현하므로 범위 통제 가능. 실무라면 라이브러리 선택 — 이 판단 기준도 면접 답변 |
| 순수 계산 코어 / React 훅 분리 | 가상화 수학을 DOM 없이 단위 테스트, 관심사 분리 자체가 설계 어필 포인트 |
| 윈도우 스크롤 가상화 (고정 높이 컨테이너 ❌) | 현재 문서 스크롤 UX 100% 유지, 이중 스크롤바 회피 |
| 행 단위 가상화 (아이템 단위 ❌) | CSS grid 열 구조 유지, 행 높이가 균일해 추정/실측이 단순 |
| IntersectionObserver → virtualRows 끝 감지 | 가상화 표준 패턴, 센티널 DOM 불필요, 코드 단순화 |
| 시드 먼저 확장 후 동일 규모로 Before/After | 159개 vs 1,000개 비교는 불공정 — 동일 조건 비교가 측정의 설득력 핵심 |
| 시드 1,000개 (`perCategory` 120) | 로드맵 "1,000개+" 충족, 가상화 효과 극대화, createMany로 시드 시간 유지 |
| Playwright 이번 단계 도입 | 가상화는 jsdom(레이아웃 없음)으로 검증 한계 → 실 브라우저 테스트 필수. 측정 자동화에도 재활용 |
| stagger 애니메이션 첫 로드만 | 가상화 재마운트 시 반복 재생 방지 |
| content-visibility CSS 안 씀 | DOM 노드 수가 줄지 않아 측정 스토리 불가, 가상화 구현 경험이 목표 |
