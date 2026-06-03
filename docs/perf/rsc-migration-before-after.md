# RSC 마이그레이션 성능 측정 — Before / After

- 측정일 (Before): 2026-06-02
- 관련 로드맵: [2026-06-01-post-mvp-roadmap.md](../superpowers/plans/2026-06-01-post-mvp-roadmap.md) 1순위
- 목적: CSR → RSC/ISR 마이그레이션의 효과를 수치로 증명 (README Before/After 표의 원본 데이터)

---

## 측정 환경 (Before)

| 항목 | 값 |
|---|---|
| 측정 대상 커밋 | `629a40a` (RSC 마이그레이션 직전, 전 페이지 `"use client"` CSR) |
| 측정 방법 | 해당 커밋을 git worktree로 체크아웃 → `next build` → `next start` (프로덕션 빌드) |
| Next.js | 16.2.6 (Turbopack) |
| Lighthouse | 13.3.0, 모바일 에뮬레이션, simulated throttling (RTT 150ms / ~1.6Mbps / CPU 4x slowdown) |
| 실행 횟수 | 페이지당 3회, **중앙값** 기록 |
| 데이터 | 로컬 API (`localhost:4000`) + Postgres, 쇼케이스 159개 시드 |
| 머신 | macOS (로컬), headless Chrome |

> 주의: localhost 측정이므로 절대값보다 **Before/After의 상대 비교**가 의미 있음.
> After 측정 시 반드시 동일 환경(같은 머신, 같은 시드 데이터, 같은 Lighthouse 버전)으로 측정할 것.

---

## Before — CSR (커밋 `629a40a`)

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

## After — RSC/ISR (측정 예정)

> 1순위 작업(홈 리뷰 리스트, 메타데이터/SEO) 완료 후 동일 방법으로 측정해 여기에 기록.

| 페이지 | Performance | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| `/` (홈) | – | – | – | – | – |
| `/showcase` | – | – | – | – | – |
| `/guide` | – | – | – | – | – |

---

## 재현 방법

```bash
# 1. Before 커밋 체크아웃 (worktree)
git worktree add /tmp/melstudio-csr-baseline 629a40a
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
