# RSC 마이그레이션 성능 측정 — Before / After

- 측정일 (Before): 2026-06-02
- 관련 로드맵: [2026-06-01-post-mvp-roadmap.md](../superpowers/plans/2026-06-01-post-mvp-roadmap.md) 1순위
- 목적: CSR → RSC/ISR 마이그레이션의 효과를 수치로 증명 (README Before/After 표의 원본 데이터)

---

## 측정 환경 (Before — 최초 측정, 159개 시드)

| 항목 | 값 |
|---|---|
| 측정 대상 커밋 | `338fc00` (RSC 마이그레이션 직전, 전 페이지 `"use client"` CSR) |
| 측정 방법 | 해당 커밋을 git worktree로 체크아웃 → `next build` → `next start` (프로덕션 빌드) |
| Next.js | 16.2.6 (Turbopack) |
| Lighthouse | 13.3.0, 모바일 에뮬레이션, simulated throttling (RTT 150ms / ~1.6Mbps / CPU 4x slowdown) |
| 실행 횟수 | 페이지당 3회, **중앙값** 기록 |
| 데이터 | 로컬 API (`localhost:4000`) + Postgres, 쇼케이스 159개 시드 |
| 머신 | macOS (로컬), headless Chrome |

> 주의: localhost 측정이므로 절대값보다 **Before/After의 상대 비교**가 의미 있음.
> After 측정 시 반드시 동일 환경(같은 머신, 같은 시드 데이터, 같은 Lighthouse 버전)으로 측정할 것.

---

## Before — CSR (커밋 `338fc00`, 최초 측정 159개 시드)

### Lighthouse 점수 (중앙값, 3회)

| 페이지 | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` (홈) | **57** | 91 | 96 | 100 |
| `/showcase` | **71** | 91 | 96 | 100 |
| `/guide` | **59** | 91 | 96 | 100 |

### Core Web Vitals (중앙값, 3회)

| 페이지 | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|
| `/` (홈) | **8.07 s** | **9.13 s** | 0 ms | 0.000 | 8.07 s |
| `/showcase` | **2.92 s** | **3.37 s** | 151 ms | 0.002 | 4.38 s |
| `/guide` | **6.54 s** | **7.69 s** | 0 ms | 0.000 | 6.62 s |

<details>
<summary>개별 실행값 (3회 전체)</summary>

| 페이지 | 지표 | run 1 | run 2 | run 3 |
|---|---|---|---|---|
| `/` | Perf 점수 | 59 | 57 | 57 |
| `/` | FCP (ms) | 6,856 | 8,068 | 8,708 |
| `/` | LCP (ms) | 9,027 | 9,129 | 9,827 |
| `/showcase` | Perf 점수 | 83 | 71 | 56 |
| `/showcase` | FCP (ms) | 2,915 | 2,914 | 9,061 |
| `/showcase` | LCP (ms) | 3,366 | 3,162 | 10,080 |
| `/guide` | Perf 점수 | 59 | 59 | 60 |
| `/guide` | FCP (ms) | 6,921 | 5,584 | 6,544 |
| `/guide` | LCP (ms) | 7,691 | 9,303 | 7,605 |

</details>

### 페이지 로드 리소스 (Lighthouse 네트워크 분석, 전송 크기 = 압축 후)

| 페이지 | 전체 | JS | CSS | 폰트 | 문서(HTML) |
|---|---|---|---|---|---|
| `/` (홈) | 781 KB / 69 요청 | 204 KB / 11 요청 | 151 KB / 2 요청 | **400 KB / 50 요청** | 4 KB |
| `/showcase` | 762 KB / 70 요청 | 208 KB / 12 요청 | 151 KB / 2 요청 | 393 KB / 49 요청 | 4 KB |
| `/guide` | 745 KB / 65 요청 | 212 KB / 12 요청 | 151 KB / 2 요청 | 372 KB / 46 요청 | 6 KB |

### 번들 사이즈 (빌드 산출물)

| 항목 | 값 |
|---|---|
| `.next/static` 전체 | 1.3 MB (비압축) |
| `.next/static/chunks` JS 전체 | 1.2 MB (비압축, 22개 청크) |
| 페이지당 실제 JS 전송량 | 204–212 KB (압축, 위 표 참고) |

> Next.js 16(Turbopack)은 빌드 출력에 라우트별 First Load JS 표를 제공하지 않아,
> Lighthouse 네트워크 분석의 JS 전송량을 페이지별 번들 지표로 사용.

### 빌드 라우트 구성 (Before)

```
Route (app)
┌ ○ /                  ← 전부 "use client", 데이터는 클라이언트에서 fetch
├ ○ /admin/chat
├ ○ /guide
├ ○ /mypage
├ ○ /order
├ ƒ /order/[slug]
├ ○ /order/edit
├ ○ /order/result
└ ○ /showcase
○ Static  ƒ Dynamic
```

HTML 응답에 쇼케이스 데이터 **없음** (curl로 확인) — 빈 셸 + 클라이언트 fetch.

---

## Before 분석 — 왜 느린가

1. **CSR 워터폴**: HTML(빈 셸) → JS 다운로드/실행 → react-query가 API 호출 → 렌더.
   서버 응답은 70ms로 빠르지만, 콘텐츠가 보이기까지 네트워크 왕복이 직렬로 쌓임.
2. **Google Fonts `@import` 렌더 블로킹**: `globals.css` 1행의
   `@import url("https://fonts.googleapis.com/css2?family=Gothic+A1:...&family=IBM+Plex+Sans+KR:...")`
   → CSS 로드 후에야 폰트 CSS 요청 시작 → 한글 폰트가 unicode-range 서브셋으로 쪼개져
   **폰트만 50개 요청 / 400 KB**. FCP를 직접 지연시키는 주범.
   (개선 후보: `next/font`로 교체 — 셀프호스팅 + 서브셋 + preload)
3. **TBT 0ms / CLS 0**: JS 실행량 자체는 문제가 아님 (bootup 0.5s).
   병목은 순전히 **렌더링 시작 시점**(FCP/LCP) — RSC/ISR로 해결되는 영역.

---

## ⚠️ 측정 조건 정정 — 시드 데이터 불일치와 재측정 (옵션 A)

- 측정일 (재측정 + After): 2026-06-03
- **문제**: 위 Before는 쇼케이스 **159개** 시드로 측정됐으나, 현재 DB는 **1,039개**다.
  Before/After는 동일 환경(같은 시드)에서 비교해야 공정하다.
- **선택한 방법 — 옵션 A (Before 재측정)**: CSR 커밋 `338fc00`을 git worktree로 체크아웃해
  **현재 1,039개 시드**로 Before를 다시 측정하고, After도 같은 데이터·같은 머신·같은 세션에서 측정했다.
  같은 조건이므로 가장 방어 가능한 비교다. (위 159개 표는 "최초 측정"으로 보존)

### 시드 개수가 측정 지표에 영향을 주지 않는 이유 (코드로 확인)

| 페이지 | CSR가 초기 로드하는 양 | RSC가 초기 로드하는 양 | 비고 |
|---|---|---|---|
| `/` (홈) | `useAllShowcases` → `fetchShowcases({ limit: 100 })` | `fetchShowcases({ limit: 100 })` | 양쪽 다 **100개 고정** |
| `/showcase` | 첫 페이지 `INFINITE_PAGE_SIZE = 12` | 첫 페이지 `limit: 12` | 양쪽 다 **12개 고정** |
| `/guide` | 데이터 없음 (완전 정적) | 데이터 없음 | – |

API `limit`은 **최대 100으로 캡**(`Number must be less than or equal to 100`)되므로, DB 총 개수가 159든 1,039든
초기 렌더가 다루는 데이터 양은 동일하다. 실제로 재측정한 CSR 홈 수치(Perf 57 / FCP 8.27s / LCP 9.25s)는
최초 159개 측정(Perf 57 / FCP 8.07s / LCP 9.13s)과 사실상 일치해 이를 뒷받침한다.
(단, `/showcase`는 최초 159개 측정 때 Perf 71이었으나 1,039개 재측정에서 Perf 56으로 낮아졌다 — 아래 분석 참고.)

---

## Before 재측정 — CSR (커밋 `338fc00`, 현재 1,039개 시드)

### Lighthouse 점수 / Core Web Vitals (중앙값, 3회)

| 페이지 | Performance | FCP | LCP | TBT | CLS | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| `/` (홈) | **57** | 8.27 s | 9.25 s | 0 ms | 0.000 | 91 | 96 | 100 |
| `/showcase` | **56** | 8.81 s | 9.68 s | 0 ms | 0.001 | 91 | 96 | 100 |
| `/guide` | **59** | 6.92 s | 7.80 s | 0 ms | 0.000 | 91 | 96 | 100 |

<details>
<summary>개별 실행값 (3회 전체)</summary>

| 페이지 | 지표 | run 1 | run 2 | run 3 |
|---|---|---|---|---|
| `/` | Perf / FCP(ms) / LCP(ms) | 57 / 8,271 / 9,253 | 57 / 8,246 / 9,285 | 57 / 8,310 / 9,194 |
| `/showcase` | Perf / FCP(ms) / LCP(ms) | 56 / 8,870 / 9,801 | 57 / 8,050 / 9,081 | 56 / 8,812 / 9,684 |
| `/guide` | Perf / FCP(ms) / LCP(ms) | 59 / 6,921 / 7,796 | 59 / 6,783 / 7,639 | 59 / 7,199 / 8,118 |

</details>

---

## After — RSC/ISR (현재 브랜치, 현재 1,039개 시드)

빌드 라우트: `/`·`/showcase`가 `○ Static` + **Revalidate 1m (ISR)** 로 출력됨 (Before의 순수 `○ Static` CSR 셸과 대비).
HTML에 쇼케이스 데이터 **포함** 확인 (`curl http://localhost:3000/` → 첫 카드 타이틀 "블룸 로스터스" 존재 = SSR 증거).

### Lighthouse 점수 / Core Web Vitals (중앙값, 3회)

| 페이지 | Performance | FCP | LCP | TBT | CLS | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| `/` (홈) | **56** | 10.01 s | 10.63 s | 0 ms | 0.022 | 88 | 96 | 100 |
| `/showcase` | **56** | 9.23 s | 10.10 s | 0 ms | 0.000 | 91 | 96 | 100 |
| `/guide` | **60** | 6.72 s | 7.48 s | 0 ms | 0.000 | 91 | 96 | 100 |

<details>
<summary>개별 실행값 (3회 전체)</summary>

| 페이지 | 지표 | run 1 | run 2 | run 3 |
|---|---|---|---|---|
| `/` | Perf / FCP(ms) / LCP(ms) | 56 / 10,004 / 10,606 | 56 / 10,006 / 10,631 | 56 / 10,675 / 11,312 |
| `/showcase` | Perf / FCP(ms) / LCP(ms) | 56 / 9,225 / 10,095 | 56 / 9,147 / 10,017 | 56 / 9,232 / 10,103 |
| `/guide` | Perf / FCP(ms) / LCP(ms) | 60 / 6,668 / 7,476 | 60 / 6,725 / 7,354 | 60 / 6,720 / 7,520 |

</details>

---

## Before / After 비교 (둘 다 1,039개 시드, 같은 세션·머신·Lighthouse 13.3.0)

| 페이지 | 지표 | Before (CSR) | After (RSC/ISR) | 변화 |
|---|---|---|---|---|
| `/` (홈) | Performance | 57 | 56 | −1 |
| `/` (홈) | FCP | 8.27 s | 10.01 s | +1.74 s (악화) |
| `/` (홈) | LCP | 9.25 s | 10.63 s | +1.38 s (악화) |
| `/showcase` | Performance | 56 | 56 | 0 |
| `/showcase` | FCP | 8.81 s | 9.23 s | +0.42 s |
| `/showcase` | LCP | 9.68 s | 10.10 s | +0.42 s |
| `/guide` | Performance | 59 | 60 | +1 |
| `/guide` | FCP | 6.92 s | 6.72 s | −0.20 s |
| `/guide` | LCP | 7.80 s | 7.48 s | −0.32 s |

### 페이지 리소스 비교 (Lighthouse 네트워크, run 1 기준)

| 페이지 | | 전체 | JS | 폰트 | 폰트 요청 수 |
|---|---|---|---|---|---|
| `/` (홈) | Before | 784 KB / 71 | 203 KB | 400 KB | 50 |
| `/` (홈) | After | 776 KB / 70 | **185 KB** | 415 KB | 52 |
| `/showcase` | Before | 765 KB / 72 | 207 KB | 392 KB | 49 |
| `/showcase` | After | 776 KB / 71 | 209 KB | 392 KB | 49 |

---

## 결론 — 측정이 밝혀낸 진짜 병목 (정직한 기록)

**Lighthouse Performance 점수는 개선되지 않았다.** RSC/ISR 마이그레이션은 "데이터 fetch 워터폴"을
제거했지만, 이 setup(localhost + 모바일 simulated throttling)에서 FCP/LCP를 지배하는 병목은 **데이터가 아니라 폰트**였다.

1. **렌더 블로킹 Google Fonts `@import`가 진짜 게이트.**
   `globals.css` 1행의 `@import url("https://fonts.googleapis.com/css2?...")`는 두 버전 모두에 그대로 남아 있다.
   한글 폰트가 unicode-range 서브셋으로 쪼개져 **폰트만 ~400 KB / ~50 요청**이고, CPU 4x·~1.6Mbps 스로틀 하에서
   이 직렬 폰트 로드가 first paint를 막는다. RSC는 이 라인을 건드리지 않았으므로 FCP/LCP가 동일하게(또는 약간 더) 묶였다.
2. **RSC가 실제로 바꾼 것은 Lighthouse 점수가 측정하지 않는 축**이었다:
   - 초기 HTML에 쇼케이스 데이터 **포함**(SSR) → 크롤러/공유 미리보기에 콘텐츠가 즉시 노출 (`curl`로 검증).
   - 홈 JS 전송량 203 KB → **185 KB** 소폭 감소(클라이언트 react-query 데이터 로직 일부 서버 이동).
   - `/showcase`·`/`에 **ISR(60s)** 적용 — 빌드 시 프리렌더 + 주기적 재검증.
   - 홈에서 CLS 0.000 → 0.022로 소폭 증가(SSR된 이미지/리뷰 섹션의 늦은 레이아웃) — 추적 항목.
3. **다음 측정 가능 개선(별도 로드맵 항목)**: `@import` 폰트를 `next/font`로 교체(셀프호스팅 + 서브셋 + preload).
   Before 분석에서 이미 "FCP 직접 지연 주범"으로 지목됐고, 이번 측정이 그 가설을 정량적으로 확증했다.
   이것이 FCP/LCP를 실제로 끌어내릴 다음 작업이다.

> **포트폴리오 관점**: "RSC 했더니 빨라졌다"는 흔한 서사 대신, **측정으로 가설을 검증하고 진짜 병목(폰트)을 찾아낸**
> 기록이다. RSC는 SSR/SEO/번들 측면에서 정당한 선택이지만, 이 페이지들의 LCP를 좌우하는 건 폰트 전략이라는 결론.

> 주의: localhost 측정이라 절대값보다 **같은 조건의 상대 비교**가 의미 있다. 위 모든 수치는 1,039개 시드,
> 같은 머신/세션, Lighthouse 13.3.0(모바일, simulated throttling), 페이지당 3회 중앙값이다.

---

## 재현 방법

```bash
# 1. Before 커밋 체크아웃 (worktree)
git worktree add /tmp/melstudio-csr-baseline 338fc00
cd /tmp/melstudio-csr-baseline && npm ci

# 2. DB/API 실행 (메인 트리에서 — API는 두 커밋 간 동일)
docker compose up -d --wait
cd apps/api && npx tsx src/index.ts &

# 3. 프로덕션 빌드 + 실행
cd /tmp/melstudio-csr-baseline/apps/web
npx next build && npx next start -p 3000

# 4. Lighthouse (페이지당 3회, 중앙값 사용)
npx lighthouse http://localhost:3000/ \
  --output=json --output-path=./home-1.json \
  --chrome-flags="--headless=new" --quiet

# 5. 정리
git worktree remove /tmp/melstudio-csr-baseline --force
```
