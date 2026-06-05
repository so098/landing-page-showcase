# syntax=docker/dockerfile:1
# api(Express + Socket.IO) 컨테이너 — v1: tsx 런타임으로 TS 진입점을 직접 실행.
# @melstudio/shared가 TS 소스라 컴파일 JS가 런타임에 .ts를 require하지 못하는
# 모노레포 문제를 tsx(on-the-fly 트랜스파일)로 우회한다.
# 빌드 컨텍스트 = 레포 루트:  docker build -f apps/api/Dockerfile -t melstudio-api .
FROM node:22-slim
WORKDIR /app

# Prisma 쿼리 엔진이 openssl을 필요로 한다
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# 1) 워크스페이스 매니페스트만 먼저 복사 → 소스 변경 시 npm ci 재실행 방지(레이어 캐시)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/ai-landing/package.json packages/ai-landing/
RUN npm ci

# 2) 런타임에 필요한 소스만 복사 (web 소스는 제외)
# ai-landing은 src만 들어옴(.dockerignore가 assets/generated/scripts 제외)
COPY packages/shared packages/shared
COPY packages/ai-landing packages/ai-landing
COPY apps/api apps/api

# 3) 컨테이너(linux) 안에서 Prisma Client 생성 → linux 엔진이 정확히 박힌다
RUN npm run prisma:generate -w @melstudio/api

ENV NODE_ENV=production
EXPOSE 4000
# tsx로 TS 진입점을 직접 실행 (shared의 TS import도 tsx가 해석)
CMD ["npx", "tsx", "apps/api/src/index.ts"]
