# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

멜스튜디오 — 업종별 랜딩페이지 쇼케이스/판매 플랫폼. npm-workspaces 모노레포.

- `apps/web` — Next.js 16 (App Router) / React 19 / Tailwind / React Query
- `apps/api` — Express + Prisma + PostgreSQL + Socket.IO
- `packages/shared` — Zod 스키마/타입 (web↔api 계약)

이 레포는 프론트엔드 이직용 포트폴리오로, **"측정하고 개선했어요"** 가 핵심 테마다. 성능 작업은 Before/After 수치를 측정해 `docs/perf/`와 README에 기록한다. 학습/면접 가치가 있으면 라이브러리 대신 직접 구현한다 (예: 가상화를 직접 구현 — `apps/web/src/lib/virtualizer.ts`).

## 명령어

```bash
npm start                            # 매일: Docker 기동(대기) + api(4000)·web(3000) 동시 실행 — 데이터 보존
npm run setup                        # 최초 1회: Docker + 마이그레이션 + 시드 — 데이터 초기화/리셋됨
npm run dev                          # 개발 서버만 (Docker는 별도로 떠 있어야 함)
npm run stop                         # Docker 종료
```

### 테스트

```bash
npm test                             # 루트: api + shared 테스트만 (web은 포함 안 됨!)
npm run test -w @melstudio/api       # API 테스트 (Vitest + supertest)
npm run test -w @melstudio/web       # 웹 테스트 (Vitest + RTL, jsdom)
npm run test -w @melstudio/shared    # shared 테스트

# 단일 테스트 파일 (워크스페이스 디렉터리에서)
cd apps/web && npx vitest run src/lib/virtualizer.test.ts
cd apps/api && npx vitest run src/services/showcase.service.test.ts

# E2E (Playwright) — 전제: API(4000) + DB(docker) 기동 + 시드 완료 상태
npm run test:e2e -w @melstudio/web
```

**E2E 주의**: Playwright는 프로덕션 빌드(`next build && next start`)를 직접 띄우며, 포트 3000의 기존 dev 서버를 절대 재사용하지 않는다(`reuseExistingServer: false` — 성능 측정 오염 방지). **E2E 실행 전 dev 웹 서버를 종료할 것.**

### 기타

```bash
npm run lint -w @melstudio/web                  # ESLint (web만)
npm run build                                   # web 프로덕션 빌드
npm run prisma:migrate -w @melstudio/api        # 마이그레이션 생성/적용 (dev)
npm run db:seed                                 # 시드 (카테고리 8 + 쇼케이스 1,039)
```

API workspace는 `apps/api/.env`를 읽는다 (`.env.example` 참조).

## 아키텍처

### 타입 계약: packages/shared가 단일 소스

web↔api 간 모든 데이터 형태는 `packages/shared/src/index.ts`의 Zod 스키마로 정의된다.

- **API 서비스 계층**이 Prisma row → shared 타입으로 변환한다. 이때 DB의 `slug`가 퍼블릭 `id`가 된다 (DB cuid는 외부 노출 안 함, 단 커서 페이지네이션의 cursor는 cuid).
- **web의 `lib/api.ts`** 는 API 응답을 같은 Zod 스키마로 `parse()`하여 런타임 검증한다.
- 백엔드 연동 전의 목(mock) 도메인(주문서 등)은 `apps/web/src/lib/`에 두고, API 연동 시 shared로 승격한다.

### API (apps/api)

`routes → services → prisma` 레이어링.

- `app.ts`의 `createApp()`과 `index.ts`(서버 기동)가 분리되어 있다 — supertest가 `createApp()`을 직접 사용.
- Socket.IO 채팅 게이트웨이(`sockets/chat.gateway.ts`)는 같은 HTTP 서버에 부착된다.
- 검증: `middleware/validate.ts`가 Zod 스키마로 요청을 검사.
- 테스트는 구현 파일 옆에 `*.test.ts`로 둔다.

### Web (apps/web)

**렌더링 전략이 페이지마다 다르다** (의도된 설계 — 면접 설명 포인트):

| 페이지 | 전략 |
|---|---|
| `/` (홈), `/showcase` 첫 페이지 | RSC + ISR(60s) — 서버에서 fetch, 데이터를 HTML에 포함 |
| `/showcase` 2페이지~ | 클라이언트 React Query 무한스크롤 (하이브리드) |
| `/guide` | 완전 정적 |
| 마이페이지, 채팅, 주문서 | 클라이언트 (개인화/실시간) |

- 서버 페이지(RSC)가 초기 데이터를 fetch → 클라이언트 섬(island) 컴포넌트에 `initialPage`로 주입해 중복 fetch를 막는다 (`useInfiniteShowcases`의 `initialData` 패턴).
- **가상화는 직접 구현**: 순수 계산 코어(`lib/virtualizer.ts`, DOM/React 의존 없음) + React 훅(`hooks/useWindowVirtualizer.ts`) 분리. 코어는 단위 테스트, 훅은 RTL 테스트.
- 목 레이어: 인증(`lib/auth.ts`, localStorage) / 주문(`lib/orderStorage.ts`, sessionStorage) — 실제 백엔드 연동 전 단계.
- 경로 별칭 `@/` = `apps/web/src/`.

### 인프라

Docker Compose: PostgreSQL(5432) + MinIO(9000/9001, ② 이미지 단계용). 환경변수는 `.env.example` 참조.

## 컨벤션

- **커밋 메시지**: `type(scope): 한글 설명` (예: `feat(web): 홈 리뷰 리스트 추가`, `fix(web): 무한스크롤 데드락 수정`)
- **주석/문서는 한글**, "왜"를 설명하는 주석을 적극적으로 단다 (기존 코드 참조).
- **TDD**: 테스트 먼저 작성 → 실패 확인 → 구현. 각 기능은 해당 테스트를 반드시 포함한다 (테스트는 별도 단계가 아님).
- **라이브러리 추가 전 확인**: 직접 구현이 학습/면접 가치가 있으면 직접 구현을 선호한다.
- 성능 작업은 Before/After를 동일 조건(프로덕션 빌드, 같은 시드)으로 측정해 `docs/perf/`에 기록한다.

## 로드맵 / 작업 흐름

- 진행 로드맵: `docs/superpowers/plans/2026-06-01-post-mvp-roadmap.md` (체크리스트). README에 요약 있음.
- `.claude/agents/`에 생성자(generator) → QA(qa-reviewer) → 감시자(watcher) 자율 루프 에이전트가 정의되어 있다. 커밋은 QA 통과 후 메인 세션(오케스트레이터)이 수행한다.
