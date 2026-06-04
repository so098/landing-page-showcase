# Phase 1A — api 컨테이너화 + 로컬 검증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** api(Express+Socket.IO)를 실행 가능한 Docker 이미지로 컨테이너화하고, 로컬에서 빌드→실행→`/health` 통과를 검증한다.

**Architecture:** 모노레포의 `@melstudio/shared`가 TS 소스(`main=src/index.ts`)라, tsc로 컴파일한 JS가 런타임에 `.ts`를 require하지 못한다. v1은 **tsx 런타임**(on-the-fly 트랜스파일)으로 이 문제를 우회해 확실히 동작하는 이미지를 만든다. Prisma Client는 **컨테이너(linux) 안에서 generate**해 엔진 플랫폼을 일치시킨다. 이미지 슬림화(tsup 번들)는 크기/콜드스타트를 **측정한 뒤** 별도 후속에서 개선한다(레포 테마: 측정하고 개선).

**Tech Stack:** Docker, node:22-slim, npm workspaces, tsx, Prisma, Express, Socket.IO.

**범위 주의:** 이 계획은 "컨테이너화 + 로컬 검증"만 다룬다. AWS 인프라(ECR/ECS/ALB/RDS/Terraform)와 CD는 **사용자 AWS 계정 셋업이 선행**이므로 별도 계획(Phase 1B)으로 분리한다. 설계서: `docs/superpowers/specs/2026-06-04-monetization-deployment-design.md`.

**선행 확인된 사실:**
- `apps/api/src/index.ts`는 `env.API_PORT`(기본 4000)에서 listen, host 미지정 → 0.0.0.0 바인딩(컨테이너 OK).
- `apps/api/src/lib/env.ts`: `DATABASE_URL`(유효 URL 필수), `API_PORT`(기본 4000), `WEB_ORIGIN`(기본 localhost:3000). **부팅 시 파싱**되므로 `DATABASE_URL`이 없으면 시작 실패. Prisma는 lazy 연결이라 `/health`엔 실제 DB 불필요(더미 URL로 부팅 가능).
- `apps/api/src/app.ts`: `GET /health` → `{ "status": "ok" }`.
- `apps/api/package.json`: `type: module`, `tsx`(devDep), `prisma`/`@prisma/client` 5.22, `prisma:generate` 스크립트 존재.
- prisma generator에 `binaryTargets` 없음 → 컨테이너 안에서 generate하면 linux 엔진 생성.
- 호스트가 Apple Silicon이면 빌드 기본 플랫폼 arm64. Fargate도 arm64(Graviton)로 맞추면 일치 + 저렴(Phase 1B에서 결정).

---

### Task 1: `.dockerignore` 작성

**Files:**
- Create: `.dockerignore` (레포 루트)

빌드 컨텍스트에서 불필요/대용량 항목을 제외해 빌드를 빠르게 하고, 호스트 `node_modules`(플랫폼 다름)·빌드 산출물이 이미지에 새어들지 않게 한다.

- [ ] **Step 1: `.dockerignore` 생성**

```
# 의존성/산출물 — 컨테이너 안에서 새로 설치/생성한다
**/node_modules
**/dist
**/.next
**/.turbo

# VCS / 로컬 환경
.git
.gitignore
**/.env
**/.env.*

# 테스트/E2E/문서 — 런타임에 불필요
**/*.test.ts
**/*.test.tsx
apps/web/e2e
docs
*.md

# IDE
.vscode
.idea
```

- [ ] **Step 2: 커밋**

```bash
git add .dockerignore
git commit -m "build(api): Docker 빌드 컨텍스트 제외 목록(.dockerignore)"
```

---

### Task 2: api `Dockerfile` 작성 (tsx 런타임 v1)

**Files:**
- Create: `apps/api/Dockerfile`

**근거:** 모노레포 루트의 `package-lock.json`을 써야 `npm ci`가 동작하므로, 빌드 컨텍스트는 **레포 루트**로 잡고 `-f apps/api/Dockerfile`로 지정한다. 워크스페이스 매니페스트를 먼저 복사해 의존성 레이어를 캐시한다. 루트 `package.json`의 workspaces가 `apps/*`를 가리키므로 `npm ci`가 깨지지 않도록 `apps/web/package.json`도 복사한다(소스는 복사 안 함 → 이미지엔 web 코드 없음). 이미지 크기 최적화는 Task 5(측정) 이후 별도 후속.

- [ ] **Step 1: `apps/api/Dockerfile` 생성**

```dockerfile
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
RUN npm ci

# 2) 런타임에 필요한 소스만 복사 (web 소스는 제외)
COPY packages/shared packages/shared
COPY apps/api apps/api

# 3) 컨테이너(linux) 안에서 Prisma Client 생성 → linux 엔진이 정확히 박힌다
RUN npm run prisma:generate -w @melstudio/api

ENV NODE_ENV=production
EXPOSE 4000
# tsx로 TS 진입점을 직접 실행 (shared의 TS import도 tsx가 해석)
CMD ["npx", "tsx", "apps/api/src/index.ts"]
```

- [ ] **Step 2: 커밋**

```bash
git add apps/api/Dockerfile
git commit -m "build(api): tsx 런타임 기반 Dockerfile(v1) 추가"
```

---

### Task 3: 로컬 빌드

**Files:** (없음 — 빌드만)

- [ ] **Step 1: 이미지 빌드 (빌드 컨텍스트 = 레포 루트)**

Run:
```bash
docker build -f apps/api/Dockerfile -t melstudio-api:dev .
```
Expected: 마지막에 `naming to docker.io/library/melstudio-api:dev` / `DONE`. 에러 없이 종료(코드 0).

- [ ] **Step 2: 실패 시 진단**

`npm ci` 단계 실패 → 매니페스트 누락(워크스페이스 package.json) 확인.
`prisma:generate` 실패 → openssl 설치 라인/네트워크 확인.

---

### Task 4: 컨테이너 실행 + `/health` 검증 (이 단계의 "테스트")

**Files:** (없음 — 런타임 검증)

- [ ] **Step 1: 컨테이너 실행**

Run (더미 DATABASE_URL로 부팅 — /health는 DB 불필요):
```bash
docker run --rm -d --name melstudio-api-test \
  -e DATABASE_URL="postgresql://u:p@localhost:5432/db" \
  -e WEB_ORIGIN="http://localhost:3000" \
  -p 4010:4000 melstudio-api:dev
```
Expected: 컨테이너 ID 출력.

- [ ] **Step 2: 기동 로그 확인**

Run: `sleep 3 && docker logs melstudio-api-test`
Expected: `[api] listening on http://localhost:4000 (http + socket.io)`

- [ ] **Step 3: 헬스체크 호출**

Run: `curl -fsS http://localhost:4010/health`
Expected: `{"status":"ok"}` (HTTP 200, curl 종료코드 0)

- [ ] **Step 4: 정리**

Run: `docker stop melstudio-api-test`
Expected: 컨테이너 이름 출력(중지됨).

- [ ] **Step 5: 실패 시 진단**

`docker logs`에 `DATABASE_URL` Zod 에러 → `-e DATABASE_URL` 유효 URL인지 확인.
`/health` 무응답 → 0.0.0.0 바인딩/포트 매핑(`-p 4010:4000`) 확인.

---

### Task 5: 이미지 크기 베이스라인 기록 (후속 최적화의 Before)

**Files:**
- Modify: `docs/perf/` (신규 또는 기존 perf 노트에 추가)

레포 테마(측정→개선)에 맞춰, 슬림화 후속 작업의 Before 수치를 남긴다.

- [ ] **Step 1: 이미지 크기 측정**

Run: `docker images melstudio-api:dev --format '{{.Size}}'`
Expected: 크기 출력(예: 1.0GB 내외 — tsx+전체 devDeps 포함).

- [ ] **Step 2: 측정 기록 파일 작성**

`docs/perf/api-image-size.md`에 아래를 기록:
```markdown
# api 컨테이너 이미지 크기 — Before/After

| 단계 | 방식 | 이미지 크기 | 비고 |
|---|---|---|---|
| v1 (Before) | tsx 런타임 + 전체 의존성 | <측정값> | shared TS 문제를 tsx로 우회, devDeps 포함 |
| v2 (목표) | tsup 번들 + 멀티스테이지 슬림 | (후속) | shared 인라인, prisma external, 런타임 의존성만 |
```

- [ ] **Step 3: 커밋**

```bash
git add docs/perf/api-image-size.md
git commit -m "docs(perf): api 이미지 크기 Before(v1 tsx) 기록"
```

---

## Self-Review

- **Spec coverage:** 설계서 Phase 1의 "api 컨테이너화(Dockerfile)" 항목을 이 계획이 구현. ECR/ECS/ALB/RDS/CD/Terraform은 의도적으로 Phase 1B로 분리(AWS 계정 선행).
- **Placeholder scan:** `<측정값>`은 런타임에 채울 실측치(플레이스홀더 아님 — Task 5에서 명령으로 획득). 그 외 TODO 없음.
- **Type/명령 일관성:** 이미지 태그 `melstudio-api:dev`, 컨테이너명 `melstudio-api-test`, 포트 매핑 `4010:4000`을 Task 3~5에서 일관 사용.

## 다음 계획 (Phase 1B — AWS 계정 셋업 후 별도 작성)

1. ECR 리포 + 이미지 푸시 (CD에서 자동화)
2. Terraform: VPC/서브넷/보안그룹 (NAT 회피)
3. Terraform: RDS Postgres(프리티어) + 마이그레이션
4. Terraform: ECS 클러스터 + Task Definition + Service + ALB(+ACM/도메인)
5. SSM/Secrets Manager + IAM 역할(태스크 실행/앱)
6. CD: GitHub Actions(빌드→ECR→ECS 롤링배포 + `prisma migrate deploy`)
7. 라이브 smoke(Playwright 1) + web(Vercel) `NEXT_PUBLIC_API_URL` 연결
8. 이미지 슬림화(tsup) — Task 5의 After 측정
