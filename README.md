# 멜스튜디오 — 업종별 랜딩페이지 쇼케이스 (풀스택)

npm-workspaces 모노레포.

- `apps/web` — Next.js 16 / React 19 / Tailwind
- `apps/api` — Express + Prisma + PostgreSQL
- `packages/shared` — Zod 스키마/타입 (web↔api 공유)

## 빠른 시작

```bash
cp .env.example apps/api/.env   # 최초 1회
docker compose up -d            # postgres + minio
npm install
npm run db:seed                 # 시드(카테고리 8 + 쇼케이스 39)
npm run dev                     # api(4000) + web(3000) 동시 기동
```

웹: http://localhost:3000 · API: http://localhost:4000

## 테스트

```bash
npm test
```

## 진행 로드맵

- [x] ① 데이터 토대 (DB + API)
- [ ] ② 갤러리 + 클라우드 스토리지(MinIO) + 가상화 무한스크롤
- [ ] ③ 주문 + 결제(PortOne) + 소셜로그인(카카오·구글·네이버)
- [ ] ④ 실시간 채팅(Socket.IO)
