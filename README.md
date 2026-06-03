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

## 진행 로드맵

- [x] ① 데이터 토대 (DB + API)
- [x] ②-a 쇼케이스 무한스크롤 페이지 (/showcase)
- [ ] ②-b 클라우드 스토리지(MinIO) 이미지 + 가상화
- [ ] ③ 주문 + 결제(PortOne) + 소셜로그인(카카오·구글·네이버) — 주문서/생성/마이페이지 UI는 완료(목)
- [x] ④ 실시간 채팅(Socket.IO) — 고객 위젯 + 관리자 인박스(/admin/chat) + DB 영속화
