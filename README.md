# 멜스튜디오 — 업종별 랜딩페이지 쇼케이스·판매 플랫폼

> 업종별 랜딩페이지를 둘러보고(쇼케이스), 상담하고(실시간 채팅), AI로 생성·주문하는 풀스택 웹 서비스. **프론트엔드 단독 개발**로 측정·아키텍처·배포까지 한 사이클을 직접 돌렸습니다.

**🔗 라이브 데모 — [www.landingpick.com](https://www.landingpick.com)** · API 헬스체크 — [api.landingpick.com/health](https://api.landingpick.com/health)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio)
![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform&logoColor=white)
![AWS ECS](https://img.shields.io/badge/AWS-ECS%20Fargate-FF9900?logo=amazonaws&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)

---

## 이 포트폴리오가 증명하려는 것

이 레포의 테마는 단 하나, **"측정하고 개선했어요"** 입니다.

- **측정으로 진짜 병목을 규명** — 가상화를 라이브러리 없이 직접 구현해 Before/After를 측정하고, RSC 마이그레이션에서는 *점수가 오르지 않은 이유*까지 정량적으로 밝혔습니다.
- **프론트엔드지만 풀 사이클을 단독으로** — Terraform IaC로 AWS 인프라를 정의하고, ECS Fargate에 컨테이너 배포, GitHub Actions로 CI/CD까지 라이브로 굴립니다.
- **AI 자율 개발 루프의 "검증 파이프라인"을 직접 설계** — 생성→QA→감시의 다층 검증 구조를 사람이 설계하고, 통과한 것만 커밋합니다. (자세히는 [아래](#5-ai-자율-개발-루프-내가-설계한-건-코드가-아니라-검증-파이프라인))

---

## 1. 기술 스택

| 영역 | 사용 기술 |
|---|---|
| **Web** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · TanStack Query |
| **API** | Express · Prisma · PostgreSQL · Socket.IO · Zod · Pino |
| **공유** | `packages/shared` — Zod 스키마/타입으로 web↔api 계약 단일화 |
| **AI** | `packages/ai-landing` — Anthropic 기반 랜딩 생성 파이프라인 + S3 서빙 |
| **인프라** | Terraform · AWS (ECS Fargate ARM64 · RDS · ALB · ACM · ECR · S3 · SSM) |
| **CI/CD** | GitHub Actions (OIDC) — 테스트 → 빌드 → ECR → 마이그레이션 → ECS 롤링 |
| **품질** | Vitest · React Testing Library · Playwright(E2E) — 테스트 32개 파일 |

npm-workspaces 모노레포 구조입니다.

```
landing-page-sales/
├── apps/web      Next.js 16 — 쇼케이스 / 채팅 위젯 / 마이페이지 / 주문 / 관리자
├── apps/api      Express + Prisma — routes → services → prisma 레이어링
├── packages/shared       Zod 스키마·타입 (web↔api 단일 계약 소스)
├── packages/ai-landing   AI 랜딩 생성 파이프라인 (생성 · 품질검증 · S3 업로드)
└── infra/        Terraform — VPC·ECS·RDS·ALB·ACM·ECR·S3·OIDC
```

---

## 2. 측정 → 개선 ★

성능 작업은 **동일 조건**(프로덕션 빌드 `next build && next start`, 같은 1,039개 시드, workers=1)에서 Before/After를 측정해 `docs/perf/`에 근거를 남겼습니다.

### 2-1. 무한스크롤 가상화 — 라이브러리 없이 직접 구현

쇼케이스 1,039개를 끝까지 로드한 상태에서 Playwright로 자동 측정(동일 조건 비교):

| 지표 | Before (가상화 없음) | After (가상화) |
|---|---|---|
| DOM 노드 수 | 39,556 | **1,611** |
| 렌더된 카드 수 | 1,039 (전체) | **40** (가시 영역만) |
| 평균 프레임 시간 | 30.5ms | **23.16ms** |
| 50ms+ long frame | 226개 | **74개** |

- **설계**: DOM/React에 의존하지 않는 순수 계산 코어(`apps/web/src/lib/virtualizer.ts`, 85줄)와 React 훅(`apps/web/src/hooks/useWindowVirtualizer.ts`, 170줄)을 분리. 코어는 단위 테스트, 훅은 RTL로 테스트.
- **왜 직접 구현했나**: 윈도잉 계산(가시 범위·오버스캔·총 높이 추정)을 직접 다뤄봐야 면접에서 "왜 이 카드만 렌더되나"를 설명할 수 있기 때문.
- 상세: [docs/perf/showcase-virtualization-before-after.md](docs/perf/showcase-virtualization-before-after.md)

### 2-2. CSR → RSC/ISR 마이그레이션 — *점수가 안 올랐는데, 왜인지 규명한* 사례

전 페이지 `"use client"` CSR → 홈·쇼케이스 첫 페이지를 RSC + ISR(60s)로 전환했습니다. 같은 머신·세션·시드에서 Lighthouse 13.3.0(모바일, simulated throttling), 페이지당 3회 중앙값 비교:

| 페이지 | 지표 | Before (CSR) | After (RSC/ISR) |
|---|---|---|---|
| `/` (홈) | Performance | 57 | 56 |
| `/` (홈) | FCP / LCP | 8.27s / 9.25s | 10.01s / 10.63s |
| `/showcase` | FCP / LCP | 8.81s / 9.68s | 9.23s / 10.10s |
| 홈 JS 전송량 | | 203 KB | **185 KB** |
| 초기 HTML에 데이터 포함 | | ✗ (빈 셸) | **✓ (SSR)** |

> **Lighthouse 점수는 오르지 않았습니다 — 측정이 진짜 병목을 드러냈기 때문입니다.**
> RSC는 데이터 fetch 워터폴을 없앴지만, 이 페이지들의 FCP/LCP를 지배한 건 데이터가 아니라 **렌더 블로킹 Google Fonts `@import`**(한글 서브셋 ~400KB / ~50 요청)였습니다. 두 버전 모두 같은 폰트 로드에 묶여 first paint가 동일하게 지연됐습니다. RSC가 실제로 바꾼 축은 **SSR·홈 JS 18KB 감소·ISR 캐싱**이며, *다음 측정 가능한 개선은 폰트를 `next/font`로 교체하는 것*임을 데이터가 정량적으로 가리킵니다.

성능 측정의 목적은 점수 자랑이 아니라 **병목 규명과 다음 액션 도출**이라는 걸 보여주는 파트입니다.

- 상세 (전체 표 + 근거): [docs/perf/rsc-migration-before-after.md](docs/perf/rsc-migration-before-after.md)

---

## 3. 아키텍처

### 페이지마다 렌더링 전략이 다르다 (의도된 설계)

| 페이지 | 전략 | 이유 |
|---|---|---|
| `/` (홈), `/showcase` 첫 페이지 | **RSC + ISR(60s)** | 서버에서 fetch, 데이터를 HTML에 포함 → 초기 콘텐츠 즉시 노출 |
| `/showcase` 2페이지~ | **클라이언트 무한스크롤** (하이브리드) | 첫 페이지는 SSR 데이터를 `initialData`로 주입해 중복 fetch 차단 |
| `/guide` | **완전 정적** | 변하지 않는 콘텐츠 |
| 마이페이지 · 채팅 · 주문서 · 관리자 | **클라이언트** | 개인화/실시간 |

### 타입 계약: `packages/shared`가 단일 소스

- web↔api 간 모든 데이터 형태를 **Zod 스키마 하나**로 정의.
- API 서비스 계층이 Prisma row → shared 타입으로 변환 (DB의 `slug`가 퍼블릭 `id`가 되고, cuid는 외부 노출 안 함).
- web의 `lib/api.ts`가 API 응답을 같은 Zod 스키마로 `parse()`해 **런타임 검증** → 계약 위반을 런타임에 잡아냄.

### API 레이어링

`routes → services → prisma`. `createApp()`(앱 생성)과 `index.ts`(서버 기동)를 분리해 supertest가 `createApp()`을 직접 띄움. Socket.IO 채팅 게이트웨이는 같은 HTTP 서버에 부착.

---

## 4. 실시간 채팅

Socket.IO 기반 — 고객 채팅 위젯 + 관리자 인박스(`/admin/chat`) + DB 영속화(`ChatRoom` / `Message`). 연결이 끊겨도 메시지가 보존되고, 관리자는 여러 방을 한 인박스에서 응대합니다.

---

## 5. AI 자율 개발 루프 — 내가 설계한 건 코드가 아니라 *검증 파이프라인* ★

이 레포의 일부 기능은 **생성자 → QA → 감시자**의 자율 루프로 구현됩니다. 핵심은 "AI가 코드를 짰다"가 아니라, **사람이 다층 검증 구조를 설계했고 통과한 것만 커밋된다**는 점입니다.

```
[로드맵 체크리스트 1항목]
      │
      ▼
 generator   기존 코드 패턴 분석 → TDD로 구현
      │
      ▼
 qa-reviewer  ① 결정적 게이트: 전체 테스트 + lint (실패 시 즉시 불합격)
      │        ② 의미 검토: CLAUDE.md 컨벤션·엣지케이스 (게이트 통과 시에만)
      │        ③ (스위치 ON이면) Playwright 실제 브라우저 구동 검증
      │        └─ 허점 발견 시 → generator 수정 라운드로 되돌림
      ▼
 watcher      푸시된 커밋을 GitHub로 검사
      │        시크릿(gitleaks)·파괴적 명령·의도치 않은 파일·컨벤션 위반 차단
      ▼
 [오케스트레이터(사람)가 QA 통과 후 커밋]
```

- 정의: `.claude/agents/`, 설계서: `docs/superpowers/specs/2026-06-03-generator-qa-loop-design.md`
- **설계 포인트**: 단일 에이전트의 자기검증은 신뢰할 수 없으므로, *구현자와 검증자를 독립 분리*하고 QA가 자율적으로 허점을 판단해 되돌리는 루프를 구성. 커밋 권한은 사람이 쥡니다.
- **검증 비용 분리 ([토스 Skill 품질 루브릭](https://toss.tech/article/skill-quality-rubric)에서 차용)**: *"결정적인 것은 규칙 기반, 의미적인 것은 모델 기반."* QA는 기계가 100% 판정하는 결함(테스트·lint 실패)을 **앞단 게이트**로 먼저 거른다 — 게이트에서 걸리면 값비싼 의미 검토를 건너뛰어 모델 호출을 아끼고, 검증을 재현 가능하게 만든다. 감시자의 시크릿 검사도 같은 이유로 도구(gitleaks)를 우선 신뢰한다(노출은 회수 불가 → False Positive 감수).

### AI 랜딩 생성

`packages/ai-landing`은 Anthropic 기반 랜딩 생성 파이프라인(생성 → 품질 규칙 검증 → 자산 처리)입니다. 생성된 페이지는 단순 파일 서빙이 아니라 **S3 업로드 후 스트리밍 + 불변(immutable) 캐시**로 서빙해, 동일 페이지 재요청 시 원본을 다시 읽지 않습니다. RDS에는 S3 키만 기록합니다.

---

## 6. 인프라 / 배포

전 인프라를 **Terraform으로 코드화**(`infra/`)해 재현 가능하게 관리합니다.

- **네트워크**: VPC·서브넷·IGW (NAT 회피로 무과금 구성)
- **컴퓨트**: ECS Fargate (ARM64) + ALB, `/health` 라이브
- **데이터**: RDS PostgreSQL, 자격증명은 SSM Parameter Store
- **레지스트리/스토리지**: ECR(이미지) · S3(이미지 자산·생성 랜딩, 비공개 버킷)
- **HTTPS**: ACM 인증서 + 80→443 리다이렉트, 정규 도메인(`www.landingpick.com`)
- **CI/CD**: GitHub Actions가 **OIDC**로 AWS 인증(장기 키 없음) → 테스트 → 빌드 → ECR 푸시 → 마이그레이션 → ECS 롤링 배포

---

## 7. 실제 vs 목(mock) 경계

> 포트폴리오의 정직성을 위해, **어디까지가 실제로 동작하고 어디가 목인지** 명시합니다.

| | 영역 |
|---|---|
| ✅ **실제 동작** | 쇼케이스(DB 1,039개 + 무한스크롤 + 가상화) · 리뷰(페이지네이션) · 실시간 채팅(DB 영속) · AI 랜딩 생성(S3) · AWS 배포 · CI/CD |
| 🟡 **목(UI 완성, 백엔드 연동 전)** | 결제(PortOne) · 소셜로그인(카카오·구글·네이버) · 주문 처리 |

목 영역은 `apps/web/src/lib/`(인증 `auth.ts`/localStorage, 주문 `orderStorage.ts`/sessionStorage)에 격리되어 있고, 백엔드 연동 시 `packages/shared`로 승격하는 구조입니다.

---

## 8. 빠른 시작

```bash
cp .env.example apps/api/.env   # 최초 1회
npm install                     # 최초 1회
npm run setup                   # 최초 1회: Docker 대기 → 마이그레이션 → 시드(카테고리 8 + 쇼케이스 1,039)
npm start                       # 매일: Docker 기동 + api(4000)·web(3000) 동시 실행
```

웹: http://localhost:3000 · API: http://localhost:4000

| 스크립트 | 설명 |
|---|---|
| `npm start` | Docker 기동(준비 대기) + 개발 서버 — **데이터 보존** |
| `npm run setup` | Docker + 마이그레이션 + 시드 — **데이터 초기화/리셋** (최초 1회) |
| `npm run dev` | 개발 서버만 (Docker는 별도 기동 필요) |
| `npm run stop` | Docker 컨테이너 종료 |

### 테스트

```bash
npm test                          # 루트: api + shared 테스트
npm run test -w @melstudio/web    # 웹 (Vitest + RTL, jsdom)
npm run test:e2e -w @melstudio/web   # E2E (Playwright, 프로덕션 빌드 직접 기동)
```

> E2E는 성능 측정 오염을 막기 위해 dev 서버를 재사용하지 않고 프로덕션 빌드를 직접 띄웁니다. 실행 전 dev 웹 서버를 종료하세요.

---

## 9. 진행 로드맵

- [x] ① 데이터 토대 (DB + API)
- [x] ②-a 쇼케이스 무한스크롤 + 가상화 (`/showcase`)
- [x] ④ 실시간 채팅 (Socket.IO) — 고객 위젯 + 관리자 인박스 + DB 영속화
- [x] 🚀 배포 (Terraform + AWS ECS) + CI/CD (GitHub Actions OIDC) — 라이브
- [x] 🤖 AI 랜딩 생성 (Anthropic + S3 서빙)
- [ ] ②-b 클라우드 스토리지 이미지 자산 파이프라인 (수집 → S3 + RDS)
- [ ] ③ 결제(PortOne) + 소셜로그인 실연동 — 주문서/생성/마이페이지 UI는 완료(목)

---

<sub>프론트엔드 단독 개발 · 측정 근거는 <code>docs/perf/</code>, 설계서는 <code>docs/superpowers/specs/</code>에 있습니다.</sub>
