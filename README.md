# 멜스튜디오 — 업종별 랜딩페이지 쇼케이스 (풀스택)

npm-workspaces 모노레포.

- `apps/web` — Next.js 16 / React 19 / Tailwind
- `apps/api` — Express + Prisma + PostgreSQL
- `packages/shared` — Zod 스키마/타입 (web↔api 공유)

## 빠른 시작

```bash
cp .env.example apps/api/.env   # 최초 1회
npm install                     # 최초 1회
npm run setup                   # 최초 1회: Docker 대기 → 마이그레이션 → 시드(8 + 39)
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

## 진행 로드맵

- [x] ① 데이터 토대 (DB + API)
- [ ] ② 갤러리 + 클라우드 스토리지(MinIO) + 가상화 무한스크롤
- [ ] ③ 주문 + 결제(PortOne) + 소셜로그인(카카오·구글·네이버)
- [ ] ④ 실시간 채팅(Socket.IO)
