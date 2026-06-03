# 멜스튜디오 — 업종별 랜딩페이지 쇼케이스 (풀스택)

npm-workspaces 모노레포.

- `apps/web` — Next.js 16 / React 19 / Tailwind
- `apps/api` — Express + Prisma + PostgreSQL
- `packages/shared` — Zod 스키마/타입 (web↔api 공유)

## 빠른 시작

```bash
cp .env.example apps/api/.env   # 최초 1회
npm install                     # 최초 1회
npm run setup                   # 최초 1회: Docker 대기 → 마이그레이션 → 시드(8 + 1,039)
npm start                       # 매일: Docker 기동 + api(4000)·web(3000) 동시 실행
```

웹: http://localhost:3000 · API: http://localhost:4000

| 스크립트 | 설명 |
|---|---|
| `npm start` | Docker 기동(준비 대기) + 개발 서버 — **데이터 보존** |
| `npm run setup` | Docker + 마이그레이션 + 시드 — **데이터 초기화/리셋** (최초 1회) |
| `npm run dev` | 개발 서버만(Docker 별도 기동 필요) |
| `npm test` | 전체 테스트 |
| `npm run stop` | Docker 컨테이너 종료 |

> `setup`의 시드는 데이터를 지우고 다시 넣으므로, 평소엔 `npm start`를 쓰세요.

## 테스트

```bash
npm test
```

## 성능

### /showcase 무한스크롤 가상화 (직접 구현, 라이브러리 없음)

쇼케이스 1,039개를 끝까지 로드한 상태에서 측정 (Playwright 자동화, 동일 조건 비교):

| 지표 | Before (가상화 없음) | After (가상화) |
|---|---|---|
| DOM 노드 수 | 39,556 | 1,611 |
| 렌더된 카드 수 | 1,039 (전체) | 40 (가시 영역만) |
| 평균 프레임 시간 | 30.5ms | 23.16ms |
| 50ms+ long frame | 226개 | 74개 |

- 구현: 순수 계산 코어(`apps/web/src/lib/virtualizer.ts`) + React 훅(`apps/web/src/hooks/useWindowVirtualizer.ts`) 분리 설계
- 상세: [docs/perf/showcase-virtualization-before-after.md](docs/perf/showcase-virtualization-before-after.md)

### CSR → RSC/ISR 마이그레이션 (측정으로 진짜 병목을 찾은 사례)

전 페이지 `"use client"` CSR(커밋 `338fc00`) → 홈·쇼케이스 첫 페이지를 RSC + ISR(60s)로 전환.
**같은 머신·같은 세션·같은 1,039개 시드, Lighthouse 13.3.0(모바일, simulated throttling), 페이지당 3회 중앙값**으로 비교:

| 페이지 | 지표 | Before (CSR) | After (RSC/ISR) |
|---|---|---|---|
| `/` (홈) | Performance | 57 | 56 |
| `/` (홈) | FCP / LCP | 8.27s / 9.25s | 10.01s / 10.63s |
| `/showcase` | Performance | 56 | 56 |
| `/showcase` | FCP / LCP | 8.81s / 9.68s | 9.23s / 10.10s |
| `/guide` | Performance | 59 | 60 |
| 홈 JS 전송량 | | 203 KB | 185 KB |
| 초기 HTML에 데이터 포함 | | ✗ (빈 셸) | ✓ (SSR) |

**Lighthouse 점수는 오르지 않았다 — 측정이 진짜 병목을 드러냈기 때문이다.** RSC는 데이터 fetch 워터폴을 없앴지만,
이 페이지들의 FCP/LCP를 지배하는 건 데이터가 아니라 **렌더 블로킹 Google Fonts `@import`**(한글 서브셋 ~400KB / ~50 요청)였다.
두 버전 모두 같은 폰트 로드에 묶여 first paint가 동일하게 지연됐다. RSC가 실제로 바꾼 축은 **SSR(초기 HTML에 콘텐츠 포함)·홈 JS 18KB 감소·ISR 캐싱**이며,
다음 측정 가능한 개선은 폰트를 `next/font`로 교체하는 것임을 이 데이터가 정량적으로 가리킨다.

- 상세 (Before/After 전체 표 + 근거): [docs/perf/rsc-migration-before-after.md](docs/perf/rsc-migration-before-after.md)

## 진행 로드맵

- [x] ① 데이터 토대 (DB + API)
- [x] ②-a 쇼케이스 무한스크롤 페이지 (/showcase)
- [ ] ②-b 클라우드 스토리지(MinIO) 이미지 + 가상화
- [ ] ③ 주문 + 결제(PortOne) + 소셜로그인(카카오·구글·네이버) — 주문서/생성/마이페이지 UI는 완료(목)
- [x] ④ 실시간 채팅(Socket.IO) — 고객 위젯 + 관리자 인박스(/admin/chat) + DB 영속화
