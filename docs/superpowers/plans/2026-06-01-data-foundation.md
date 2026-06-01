# ① 데이터 토대 (Data Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 프론트 전용 Next.js 앱을 npm-workspaces 모노레포로 전환하고, Express+Prisma+PostgreSQL 백엔드를 추가해 정적 쇼케이스 데이터를 DB로 이전한 뒤 API로 제공한다. 기존 화면은 동일하게 동작한다.

**Architecture:** 모노레포(`apps/web` = Next.js, `apps/api` = Express, `packages/shared` = Zod 스키마/타입 단일 소스). web은 React Query로 api의 REST를 호출. DB 접근은 Prisma, 인프라는 로컬 Docker(Postgres + MinIO; MinIO는 ②에서 사용, 본 단계는 기동만).

**Tech Stack:** Next.js 16 / React 19 / Express 4 / TypeScript / Prisma 5 / PostgreSQL 16 / Zod 3 / @tanstack/react-query 5 / Vitest + supertest / Docker Compose. 패키지 매니저는 기존 npm(워크스페이스).

---

## File Structure

```
landing-page-sales/                 # 모노레포 루트
├─ package.json                     # (신규) 루트, workspaces 선언
├─ docker-compose.yml               # (신규) postgres + minio
├─ .env.example                     # (신규)
├─ .gitignore                       # (수정) 루트용
├─ apps/
│  ├─ web/                          # 기존 Next.js 전체를 이곳으로 이동
│  │  ├─ next.config.ts             # (수정) transpilePackages 추가
│  │  └─ src/
│  │     ├─ app/{layout,page,providers}.tsx
│  │     ├─ components/{TagBar,ShowcaseCard,...}.tsx
│  │     └─ lib/{api,queries}.ts    # (신규) fetch + React Query 훅
│  └─ api/                          # (신규) Express 서버
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ vitest.config.ts
│     ├─ prisma/
│     │  ├─ schema.prisma           # Category, Showcase
│     │  └─ seed.ts                 # DB 시드
│     └─ src/
│        ├─ index.ts                # listen 진입점
│        ├─ app.ts                  # express app 팩토리(테스트용)
│        ├─ lib/{env,prisma}.ts
│        ├─ middleware/{error,validate}.ts
│        ├─ services/showcase.service.ts
│        ├─ routes/{categories,showcases}.route.ts
│        └─ data/seed-data.ts       # 이관용 원본 데이터(카테고리+쇼케이스)
└─ packages/
   └─ shared/
      ├─ package.json
      └─ src/index.ts               # CategorySchema, ShowcaseSchema, 타입
```

**책임 경계**
- `packages/shared`: web↔api가 공유하는 **퍼블릭 데이터 계약**(Zod 스키마 + 추론 타입)만. 의존성 zod 뿐.
- `apps/api/services`: DB 쿼리 + DB행→퍼블릭 형태 매핑(순수 로직, 단위테스트 대상).
- `apps/api/routes`: HTTP 입출력 + 검증, 로직은 service 위임.
- `apps/web/lib`: API 호출 + React Query 훅. 컴포넌트는 훅이 주는 데이터를 그릴 뿐.

---

## Task 1: 모노레포 골격 + web 이동

**Files:**
- Create: `package.json`(root), `.gitignore`(root)
- Move: 기존 Next.js 전체 → `apps/web/`

- [ ] **Step 1: git 저장소 초기화**

Run:
```bash
cd /Users/hansoyoung/Desktop/landing-page-sales
git init
git add -A && git commit -m "chore: snapshot before monorepo conversion"
```
Expected: 첫 커밋 생성(현재 프론트 + docs 포함).

- [ ] **Step 2: web 디렉터리로 기존 앱 이동**

Run:
```bash
mkdir -p apps/web
git mv src apps/web/src
git mv public apps/web/public 2>/dev/null || true
git mv package.json apps/web/package.json
git mv package-lock.json apps/web/package-lock.json
git mv tsconfig.json apps/web/tsconfig.json
git mv next.config.ts apps/web/next.config.ts
git mv tailwind.config.ts apps/web/tailwind.config.ts
git mv postcss.config.mjs apps/web/postcss.config.mjs
git mv eslint.config.mjs apps/web/eslint.config.mjs
git mv next-env.d.ts apps/web/next-env.d.ts 2>/dev/null || true
rm -rf .next node_modules apps/web/.next apps/web/node_modules
```
Expected: 루트엔 `apps/`, `docs/`, `.git/`만. `apps/web/`에 Next.js 일체.

- [ ] **Step 3: web package.json name 변경**

`apps/web/package.json`의 `"name"`을 수정:
```json
  "name": "@melstudio/web",
```

- [ ] **Step 4: 루트 package.json 작성**

Create `package.json`:
```json
{
  "name": "melstudio",
  "private": true,
  "version": "0.1.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:web": "npm run dev -w @melstudio/web",
    "dev:api": "npm run dev -w @melstudio/api",
    "build": "npm run build -w @melstudio/web",
    "test": "npm run test -w @melstudio/api"
  }
}
```

- [ ] **Step 5: 루트 .gitignore 작성**

Create `.gitignore`:
```gitignore
node_modules/
.next/
dist/
*.log
.env
.env.local
.DS_Store
coverage/
```

- [ ] **Step 6: 설치 후 web 빌드로 이동 검증**

Run:
```bash
npm install
npm run build -w @melstudio/web
```
Expected: 기존과 동일하게 `✓ Compiled successfully` + 정적 페이지 생성.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: convert to npm-workspaces monorepo (web -> apps/web)"
```

---

## Task 2: Docker 인프라 (Postgres + MinIO) + 환경변수

**Files:**
- Create: `docker-compose.yml`, `.env.example`

- [ ] **Step 1: docker-compose.yml 작성**

Create `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: melstudio-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: melstudio
      POSTGRES_PASSWORD: melstudio
      POSTGRES_DB: melstudio
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: melstudio-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
```

- [ ] **Step 2: .env.example 작성**

Create `.env.example`:
```dotenv
# apps/api 가 읽음
DATABASE_URL=postgresql://melstudio:melstudio@localhost:5432/melstudio
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
# MinIO (② 단계에서 사용)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=showcase
# apps/web 가 읽음
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 3: 컨테이너 기동 검증**

Run:
```bash
docker compose up -d
docker compose ps
```
Expected: `melstudio-postgres`, `melstudio-minio` 모두 `running`(또는 healthy).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add docker-compose (postgres + minio) and env example"
```

---

## Task 3: packages/shared — Zod 스키마 + 타입

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/index.test.ts`

- [ ] **Step 1: shared package.json 작성**

Create `packages/shared/package.json`:
```json
{
  "name": "@melstudio/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

Create `packages/shared/src/index.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ShowcaseSchema, CategorySchema, ShowcaseListSchema, LAYOUTS } from "./index";

describe("shared schemas", () => {
  it("LAYOUTS 4종을 노출한다", () => {
    expect(LAYOUTS).toEqual(["hero", "split", "grid", "minimal"]);
  });

  it("유효한 Showcase를 통과시킨다", () => {
    const ok = ShowcaseSchema.parse({
      id: "cafe-bloom",
      title: "블룸 로스터스",
      blurb: "스페셜티 원두 구독 브랜드",
      category: "cafe",
      accent: "#C2410C",
      layout: "hero",
      desktop: null,
      mobile: null,
      thumb: null,
    });
    expect(ok.id).toBe("cafe-bloom");
  });

  it("잘못된 layout을 거부한다", () => {
    expect(() =>
      ShowcaseSchema.parse({
        id: "x", title: "x", blurb: "x", category: "cafe",
        accent: "#000", layout: "weird", desktop: null, mobile: null, thumb: null,
      }),
    ).toThrow();
  });

  it("Category와 목록 응답을 검증한다", () => {
    expect(CategorySchema.parse({ id: "cafe", label: "카페·베이커리" }).id).toBe("cafe");
    const list = ShowcaseListSchema.parse({ items: [], nextCursor: null });
    expect(list.nextCursor).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test -w @melstudio/shared` (아직 스크립트/구현 없음)
Expected: FAIL — `Cannot find module './index'` 또는 vitest 미설정 에러.

- [ ] **Step 4: shared 구현 작성**

Create `packages/shared/src/index.ts`:
```ts
import { z } from "zod";

export const LAYOUTS = ["hero", "split", "grid", "minimal"] as const;
export const LayoutSchema = z.enum(LAYOUTS);
export type MockLayout = (typeof LAYOUTS)[number];

export const CategorySchema = z.object({
  id: z.string(), // 퍼블릭 식별자 = slug ("cafe")
  label: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ShowcaseSchema = z.object({
  id: z.string(), // 퍼블릭 식별자 = slug ("cafe-bloom")
  title: z.string(),
  blurb: z.string(),
  category: z.string(), // category slug
  accent: z.string(),
  layout: LayoutSchema,
  desktop: z.string().nullable(),
  mobile: z.string().nullable(),
  thumb: z.string().nullable(),
});
export type Showcase = z.infer<typeof ShowcaseSchema>;

export const ShowcaseListSchema = z.object({
  items: z.array(ShowcaseSchema),
  nextCursor: z.string().nullable(),
});
export type ShowcaseList = z.infer<typeof ShowcaseListSchema>;
```

- [ ] **Step 5: shared에 test 스크립트 + vitest 추가**

`packages/shared/package.json`에 추가:
```json
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
```
Run: `npm install`

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm run test -w @melstudio/shared`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(shared): zod schemas and types for category/showcase"
```

---

## Task 4: apps/api 부트스트랩 + 헬스 라우트

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`, `apps/api/src/lib/env.ts`, `apps/api/src/app.ts`, `apps/api/src/index.ts`
- Test: `apps/api/src/app.test.ts`

- [ ] **Step 1: api package.json 작성**

Create `apps/api/package.json`:
```json
{
  "name": "@melstudio/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "schema": "prisma/schema.prisma"
  },
  "dependencies": {
    "@melstudio/shared": "*",
    "@prisma/client": "^5.22.0",
    "cors": "^2.8.5",
    "express": "^4.21.1",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.17.6",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: api tsconfig.json 작성**

Create `apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: vitest 설정 작성**

Create `apps/api/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: env 로더 작성**

Create `apps/api/src/lib/env.ts`:
```ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
});

export const env = EnvSchema.parse(process.env);
```

- [ ] **Step 5: 실패하는 헬스 테스트 작성**

Create `apps/api/src/app.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app";

describe("GET /health", () => {
  it("200 OK + status ok", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm install && npm run test -w @melstudio/api`
Expected: FAIL — `Cannot find module './app'`.

- [ ] **Step 7: app 팩토리 작성**

Create `apps/api/src/app.ts`:
```ts
import express, { type Express } from "express";
import cors from "cors";
import { env } from "./lib/env.js";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
```

- [ ] **Step 8: index 진입점 작성**

Create `apps/api/src/index.ts`:
```ts
import { createApp } from "./app.js";
import { env } from "./lib/env.js";

const app = createApp();
app.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT}`);
});
```

- [ ] **Step 9: 테스트 통과 확인**

`app.test.ts`는 `env`를 import하므로 `DATABASE_URL`이 필요하다. 테스트 실행 시 주입:
Run:
```bash
DATABASE_URL=postgresql://melstudio:melstudio@localhost:5432/melstudio npm run test -w @melstudio/api
```
Expected: PASS (1 test).

> 참고: 이후 테스트도 `DATABASE_URL`이 필요하다. Task 5 Step 7에서 `.env` 파일을 만들고 vitest가 자동 로드하도록 설정한다.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(api): bootstrap express app with health route"
```

---

## Task 5: Prisma 스키마 + 마이그레이션

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/src/lib/prisma.ts`, `apps/api/.env`
- Modify: `apps/api/vitest.config.ts` (.env 로드)

- [ ] **Step 1: Prisma 스키마 작성 (① 범위: Category, Showcase)**

Create `apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Category {
  id        String     @id @default(cuid())
  slug      String     @unique
  label     String
  order     Int        @default(0)
  showcases Showcase[]
}

model Showcase {
  id         String   @id @default(cuid())
  slug       String   @unique
  title      String
  blurb      String
  accent     String
  layout     String   // hero|split|grid|minimal
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  desktopKey String?
  mobileKey  String?
  thumbKey   String?
  createdAt  DateTime @default(now())

  @@index([categoryId])
}
```

- [ ] **Step 2: api/.env 작성 (로컬 전용, gitignore됨)**

Create `apps/api/.env`:
```dotenv
DATABASE_URL=postgresql://melstudio:melstudio@localhost:5432/melstudio
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
```

- [ ] **Step 3: prisma client 싱글톤 작성**

Create `apps/api/src/lib/prisma.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: 마이그레이션 생성 (Docker 기동 상태에서)**

Run:
```bash
cd apps/api
npx prisma migrate dev --name init
cd ../..
```
Expected: `prisma/migrations/<ts>_init/` 생성, Prisma Client 생성됨, "Your database is now in sync".

- [ ] **Step 5: vitest가 .env를 로드하도록 설정**

Modify `apps/api/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```
`apps/api/package.json` devDependencies에 `"dotenv": "^16.4.5"` 추가 후 `npm install`.

- [ ] **Step 6: 헬스 테스트가 env 주입 없이 통과하는지 확인**

Run: `npm run test -w @melstudio/api`
Expected: PASS (이제 .env 자동 로드로 DATABASE_URL 충족).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(api): prisma schema (category, showcase) + initial migration"
```

---

## Task 6: 시드 — 정적 데이터 → DB 이관

**Files:**
- Create: `apps/api/src/data/seed-data.ts`, `apps/api/prisma/seed.ts`

- [ ] **Step 1: seed-data.ts 작성 (기존 데이터 이전)**

기존 `apps/web/src/data/showcase.ts`의 `CATEGORIES`(단, `"all"` 제외)와 `SHOWCASES` 배열을 그대로 옮겨 담는다. 필드명은 기존과 동일(`id, title, category, blurb, accent, layout`).

Create `apps/api/src/data/seed-data.ts`:
```ts
// 기존 apps/web/src/data/showcase.ts 에서 이관한 원본 데이터.
// (퍼블릭 slug = 기존 id, category = 기존 category slug)

export const SEED_CATEGORIES: { slug: string; label: string; order: number }[] = [
  { slug: "cafe", label: "카페·베이커리", order: 1 },
  { slug: "beauty", label: "뷰티·살롱", order: 2 },
  { slug: "fitness", label: "헬스·피트니스", order: 3 },
  { slug: "education", label: "교육·클래스", order: 4 },
  { slug: "shop", label: "쇼핑몰", order: 5 },
  { slug: "clinic", label: "병원·클리닉", order: 6 },
  { slug: "restaurant", label: "레스토랑", order: 7 },
  { slug: "realestate", label: "부동산·공간", order: 8 },
];

export const SEED_SHOWCASES: {
  slug: string;
  title: string;
  category: string;
  blurb: string;
  accent: string;
  layout: string;
}[] = [
  // ↓↓↓ 기존 apps/web/src/data/showcase.ts 의 SHOWCASES 배열을 그대로 붙여넣되,
  //     각 항목의 `id:` 를 `slug:` 로만 바꾼다. (나머지 필드 동일)
  { slug: "cafe-bloom", title: "블룸 로스터스", category: "cafe", blurb: "스페셜티 원두 구독 브랜드", accent: "#C2410C", layout: "hero" },
  // ... (기존 40개 항목 전체를 동일 형식으로 이어서 붙여넣기)
];
```

> 실행자 메모: 위 `SEED_SHOWCASES`에는 기존 web 데이터 파일의 **40개 항목 전부**를 옮긴다. 변환 규칙은 `id` → `slug` 한 가지뿐이며 다른 필드는 변경 없음. 누락 없이 전부 옮길 것.

- [ ] **Step 2: seed.ts 작성**

Create `apps/api/prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import { SEED_CATEGORIES, SEED_SHOWCASES } from "../src/data/seed-data.js";

const prisma = new PrismaClient();

async function main() {
  // 멱등: 기존 데이터 삭제 후 재삽입
  await prisma.showcase.deleteMany();
  await prisma.category.deleteMany();

  const categoryIdBySlug = new Map<string, string>();
  for (const c of SEED_CATEGORIES) {
    const created = await prisma.category.create({
      data: { slug: c.slug, label: c.label, order: c.order },
    });
    categoryIdBySlug.set(c.slug, created.id);
  }

  for (const s of SEED_SHOWCASES) {
    const categoryId = categoryIdBySlug.get(s.category);
    if (!categoryId) throw new Error(`Unknown category slug: ${s.category}`);
    await prisma.showcase.create({
      data: {
        slug: s.slug,
        title: s.title,
        blurb: s.blurb,
        accent: s.accent,
        layout: s.layout,
        categoryId,
      },
    });
  }

  const cats = await prisma.category.count();
  const items = await prisma.showcase.count();
  console.log(`[seed] categories=${cats}, showcases=${items}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: 시드 실행**

Run:
```bash
npm run db:seed -w @melstudio/api
```
Expected: `[seed] categories=8, showcases=40` (기존 항목 수와 일치).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): seed categories and showcases from legacy static data"
```

---

## Task 7: showcase 서비스 (커서 페이지네이션 + 매핑)

**Files:**
- Create: `apps/api/src/services/showcase.service.ts`
- Test: `apps/api/src/services/showcase.service.test.ts`

서비스는 DB행을 `@melstudio/shared`의 퍼블릭 `Showcase`/`Category`로 매핑한다. ① 단계엔 이미지가 없으므로 `desktop/mobile/thumb`는 `null`.

- [ ] **Step 1: 실패하는 통합 테스트 작성 (실 DB 사용)**

Create `apps/api/src/services/showcase.service.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { listCategories, listShowcases } from "./showcase.service";
import { prisma } from "../lib/prisma";

beforeAll(async () => {
  // 시드가 적용된 로컬 DB를 가정 (npm run db:seed 선행)
  const count = await prisma.showcase.count();
  if (count === 0) throw new Error("DB가 비어있음. 먼저 db:seed 실행 필요");
});

describe("listCategories", () => {
  it("order 순으로 카테고리를 반환한다", async () => {
    const cats = await listCategories();
    expect(cats.length).toBe(8);
    expect(cats[0].id).toBe("cafe"); // order=1
    expect(cats[0]).toHaveProperty("label");
  });
});

describe("listShowcases", () => {
  it("limit 만큼 반환하고 nextCursor를 준다", async () => {
    const page = await listShowcases({ limit: 5 });
    expect(page.items.length).toBe(5);
    expect(typeof page.nextCursor).toBe("string");
    expect(page.items[0]).toMatchObject({
      desktop: null,
      mobile: null,
      thumb: null,
    });
    expect(page.items[0].id).toBeTypeOf("string"); // slug
  });

  it("cursor로 다음 페이지를 이어받아 중복이 없다", async () => {
    const p1 = await listShowcases({ limit: 5 });
    const p2 = await listShowcases({ limit: 5, cursor: p1.nextCursor! });
    const ids1 = new Set(p1.items.map((i) => i.id));
    for (const it of p2.items) expect(ids1.has(it.id)).toBe(false);
  });

  it("category로 필터링한다", async () => {
    const page = await listShowcases({ limit: 100, category: "cafe" });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((i) => i.category === "cafe")).toBe(true);
  });

  it("마지막 페이지는 nextCursor가 null", async () => {
    const page = await listShowcases({ limit: 1000 });
    expect(page.nextCursor).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -w @melstudio/api`
Expected: FAIL — `Cannot find module './showcase.service'`.

- [ ] **Step 3: 서비스 구현**

Create `apps/api/src/services/showcase.service.ts`:
```ts
import type { Category, Showcase, ShowcaseList } from "@melstudio/shared";
import { prisma } from "../lib/prisma.js";

export async function listCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({ orderBy: { order: "asc" } });
  return rows.map((c) => ({ id: c.slug, label: c.label }));
}

type ListArgs = {
  limit: number;
  cursor?: string | null; // showcase.id (DB cuid)
  category?: string | null; // category slug
};

export async function listShowcases(args: ListArgs): Promise<ShowcaseList> {
  const { limit, cursor, category } = args;

  const where = category
    ? { category: { slug: category } }
    : {};

  // limit+1개를 받아 다음 페이지 존재 여부 판단
  const rows = await prisma.showcase.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { category: true },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: Showcase[] = page.map((r) => ({
    id: r.slug,
    title: r.title,
    blurb: r.blurb,
    category: r.category.slug,
    accent: r.accent,
    layout: r.layout as Showcase["layout"],
    desktop: null, // ② 단계에서 키→URL 매핑
    mobile: null,
    thumb: null,
  }));

  return {
    items,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
```

> 주의: `nextCursor`는 DB의 `showcase.id`(cuid)다. 퍼블릭 `Showcase.id`는 `slug`이므로 서로 다른 값임. 커서는 불투명 토큰으로 취급한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -w @melstudio/api`
Expected: PASS (서비스 테스트 + 헬스 테스트).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): showcase service with cursor pagination and category filter"
```

---

## Task 8: 미들웨어 (검증 + 에러 처리)

**Files:**
- Create: `apps/api/src/middleware/validate.ts`, `apps/api/src/middleware/error.ts`
- Test: `apps/api/src/middleware/validate.test.ts`

- [ ] **Step 1: 실패하는 validate 테스트 작성**

Create `apps/api/src/middleware/validate.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
import { validateQuery } from "./validate";
import { errorHandler } from "./error";

function appWith() {
  const app = express();
  app.get(
    "/t",
    validateQuery(z.object({ limit: z.coerce.number().min(1).max(50) })),
    (req, res) => res.json({ limit: (req as any).valid.query.limit }),
  );
  app.use(errorHandler);
  return app;
}

describe("validateQuery + errorHandler", () => {
  it("유효 쿼리는 통과시키고 파싱값을 넣는다", async () => {
    const res = await request(appWith()).get("/t?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
  });

  it("유효하지 않으면 400 + 에러 형식", async () => {
    const res = await request(appWith()).get("/t?limit=999");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -w @melstudio/api`
Expected: FAIL — `Cannot find module './validate'`.

- [ ] **Step 3: validate 미들웨어 구현**

Create `apps/api/src/middleware/validate.ts`:
```ts
import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new ApiError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query"),
      );
    }
    (req as Request & { valid?: { query?: unknown } }).valid = {
      ...(req as any).valid,
      query: parsed.data,
    };
    next();
  };
}
```

- [ ] **Step 4: error 미들웨어 구현**

Create `apps/api/src/middleware/error.ts`:
```ts
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./validate.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  console.error("[api] unhandled error:", err);
  return res
    .status(500)
    .json({ error: { code: "INTERNAL", message: "Internal server error" } });
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -w @melstudio/api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): query validation and error-handling middleware"
```

---

## Task 9: 라우트 — GET /api/categories, GET /api/showcases

**Files:**
- Create: `apps/api/src/routes/categories.route.ts`, `apps/api/src/routes/showcases.route.ts`
- Modify: `apps/api/src/app.ts` (라우터 마운트 + 에러 핸들러)
- Test: `apps/api/src/routes/showcases.route.test.ts`

- [ ] **Step 1: 실패하는 라우트 테스트 작성**

Create `apps/api/src/routes/showcases.route.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("GET /api/categories", () => {
  it("8개 카테고리를 반환한다", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(8);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("label");
  });
});

describe("GET /api/showcases", () => {
  it("기본 limit으로 목록과 nextCursor를 반환한다", async () => {
    const res = await request(app).get("/api/showcases?limit=5");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(5);
    expect(res.body).toHaveProperty("nextCursor");
  });

  it("category 필터가 동작한다", async () => {
    const res = await request(app).get("/api/showcases?category=cafe&limit=100");
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: { category: string }) => i.category === "cafe")).toBe(true);
  });

  it("limit 범위 밖이면 400", async () => {
    const res = await request(app).get("/api/showcases?limit=9999");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -w @melstudio/api`
Expected: FAIL — `/api/categories` 404 (라우트 미마운트).

- [ ] **Step 3: categories 라우트 구현**

Create `apps/api/src/routes/categories.route.ts`:
```ts
import { Router } from "express";
import { listCategories } from "../services/showcase.service.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listCategories());
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: showcases 라우트 구현**

Create `apps/api/src/routes/showcases.route.ts`:
```ts
import { Router } from "express";
import { z } from "zod";
import { validateQuery } from "../middleware/validate.js";
import { listShowcases } from "../services/showcase.service.js";

export const showcasesRouter = Router();

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(12),
  cursor: z.string().optional(),
  category: z.string().optional(),
});

showcasesRouter.get(
  "/",
  validateQuery(QuerySchema),
  async (req, res, next) => {
    try {
      const { limit, cursor, category } = (req as unknown as {
        valid: { query: z.infer<typeof QuerySchema> };
      }).valid.query;
      res.json(await listShowcases({ limit, cursor, category }));
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 5: app.ts에 라우터 + 에러핸들러 마운트**

Modify `apps/api/src/app.ts` — 전체를 아래로 교체:
```ts
import express, { type Express } from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { categoriesRouter } from "./routes/categories.route.js";
import { showcasesRouter } from "./routes/showcases.route.js";
import { errorHandler } from "./middleware/error.js";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/categories", categoriesRouter);
  app.use("/api/showcases", showcasesRouter);

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm run test -w @melstudio/api`
Expected: PASS (전체 스위트).

- [ ] **Step 7: 서버 수동 확인**

Run:
```bash
npm run dev:api &
sleep 2
curl -s "http://localhost:4000/api/categories" | head -c 200
curl -s "http://localhost:4000/api/showcases?limit=2"
kill %1
```
Expected: 카테고리 JSON 배열 + `{ "items": [...], "nextCursor": "..." }`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(api): GET /api/categories and /api/showcases routes"
```

---

## Task 10: web — API 클라이언트 + React Query 배선

**Files:**
- Create: `apps/web/src/lib/api.ts`, `apps/web/src/lib/queries.ts`, `apps/web/src/app/providers.tsx`
- Modify: `apps/web/package.json`(deps), `apps/web/next.config.ts`(transpilePackages), `apps/web/src/app/layout.tsx`

- [ ] **Step 1: web 의존성 추가**

`apps/web/package.json`의 dependencies에 추가:
```json
    "@melstudio/shared": "*",
    "@tanstack/react-query": "^5.59.16",
```
Run: `npm install`

- [ ] **Step 2: next.config에서 shared 트랜스파일**

Modify `apps/web/next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@melstudio/shared"],
};

export default nextConfig;
```

- [ ] **Step 3: API 클라이언트 작성**

Create `apps/web/src/lib/api.ts`:
```ts
import {
  CategorySchema,
  ShowcaseListSchema,
  type Category,
  type ShowcaseList,
} from "@melstudio/shared";
import { z } from "zod";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE}/api/categories`);
  if (!res.ok) throw new Error(`categories ${res.status}`);
  return z.array(CategorySchema).parse(await res.json());
}

export async function fetchShowcases(params: {
  limit?: number;
  cursor?: string | null;
  category?: string | null;
}): Promise<ShowcaseList> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 100));
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.category && params.category !== "all") q.set("category", params.category);
  const res = await fetch(`${BASE}/api/showcases?${q.toString()}`);
  if (!res.ok) throw new Error(`showcases ${res.status}`);
  return ShowcaseListSchema.parse(await res.json());
}
```

- [ ] **Step 4: React Query 훅 작성**

Create `apps/web/src/lib/queries.ts`:
```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchShowcases } from "./api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

// ① 단계: 전체를 한 번에 받아 기존 클라이언트 필터/페이지네이션 유지
// (무한스크롤·가상화는 ② /gallery 에서 도입)
export function useAllShowcases() {
  return useQuery({
    queryKey: ["showcases", "all"],
    queryFn: () => fetchShowcases({ limit: 100 }),
  });
}
```

- [ ] **Step 5: Providers 컴포넌트 작성**

Create `apps/web/src/app/providers.tsx`:
```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 6: layout에 Providers 적용**

Modify `apps/web/src/app/layout.tsx` — `<body>` 내부를 Providers로 감싼다:
```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "멜스튜디오 — 업종별 랜딩페이지 쇼케이스",
  description:
    "내 사업을 홍보할 웹사이트를 찾으시나요? 카페부터 병원까지, 업종에 맞는 랜딩페이지를 데스크탑·모바일로 미리보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: 빌드로 배선 확인**

Run: `npm run build -w @melstudio/web`
Expected: 컴파일 성공(아직 page.tsx는 정적 데이터 사용 중이라 기존대로 통과).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(web): api client, react-query hooks and provider"
```

---

## Task 11: web — 정적 데이터 → API 데이터로 전환

기존 컴포넌트는 `@/data/showcase`의 정적 `SHOWCASES`/`CATEGORIES`/`countByCategory`/타입을 직접 import한다. 이를 (a) 타입은 `@melstudio/shared`에서, (b) 데이터는 props로 받도록 바꾼다. 화면 동작(태그 필터 + 5박스 페이지 슬라이더 + 모달)은 동일하게 유지한다.

**Files:**
- Modify: `apps/web/src/app/page.tsx`, `apps/web/src/components/TagBar.tsx`, `apps/web/src/components/ShowcaseCard.tsx`, `apps/web/src/components/PreviewModal.tsx`, `apps/web/src/components/PagePreview.tsx`, `apps/web/src/components/PlaceholderMock.tsx`, `apps/web/src/components/ShowcaseGrid.tsx`
- Delete: `apps/web/src/data/showcase.ts`

- [ ] **Step 1: 타입 import 출처를 shared로 교체**

다음 파일들에서 `import ... from "@/data/showcase"` 중 **타입**(`Showcase`, `Category`, `MockLayout`) import를 `@melstudio/shared`로 바꾼다:
- `PagePreview.tsx`: `import type { Showcase } from "@melstudio/shared";`
- `PlaceholderMock.tsx`: `import type { Showcase } from "@melstudio/shared";`
- `PreviewModal.tsx`: `import type { Showcase } from "@melstudio/shared";`
- `ShowcaseCard.tsx`: `import type { Showcase } from "@melstudio/shared";`
- `ShowcaseGrid.tsx`: `import type { Showcase } from "@melstudio/shared";`

> 비고: `CategoryId` 유니온 타입은 더 이상 쓰지 않는다(런타임 카테고리). 사용처는 `string`으로 대체한다.

- [ ] **Step 2: TagBar를 props 기반으로 리팩터**

Modify `apps/web/src/components/TagBar.tsx` — 전체 교체:
```tsx
"use client";

import type { Category } from "@melstudio/shared";

export default function TagBar({
  categories,
  counts,
  active,
  onChange,
}: {
  categories: Category[]; // "all" 포함(페이지에서 앞에 추가해 전달)
  counts: Record<string, number>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 py-1 md:flex-wrap md:justify-center md:overflow-visible">
      {categories.map((cat) => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`group flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              isActive
                ? "border-transparent bg-rose-grad text-white shadow-petal"
                : "border-rose/20 bg-white/70 text-wine/70 hover:border-rose/50 hover:bg-white hover:text-crimson"
            }`}
          >
            {cat.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                isActive ? "bg-white/25 text-white" : "bg-petal/50 text-crimson-deep"
              }`}
            >
              {counts[cat.id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: ShowcaseCard의 카테고리 라벨을 props로**

Modify `apps/web/src/components/ShowcaseCard.tsx` — `CATEGORIES` import와 `categoryLabel` 함수를 제거하고, 라벨을 prop으로 받는다.
- 상단 import에서 `import { CATEGORIES } from "@/data/showcase";`와 `categoryLabel` 함수 삭제.
- 컴포넌트 시그니처를 다음으로 변경:
```tsx
export default function ShowcaseCard({
  item,
  index,
  categoryLabel,
  onOpen,
}: {
  item: Showcase;
  index: number;
  categoryLabel: string;
  onOpen: (item: Showcase) => void;
}) {
```
- 본문에서 `{categoryLabel(item.category)}` → `{categoryLabel}` 으로 변경.

- [ ] **Step 4: ShowcaseGrid가 categoryLabel을 카드로 전달**

Modify `apps/web/src/components/ShowcaseGrid.tsx`:
- 시그니처에 `labelOf` 추가:
```tsx
export default function ShowcaseGrid({
  items,
  labelOf,
  onOpen,
}: {
  items: Showcase[];
  labelOf: (categorySlug: string) => string;
  onOpen: (item: Showcase) => void;
}) {
```
- 카드 렌더 부분을 다음으로 변경:
```tsx
        {current.map((item, i) => (
          <ShowcaseCard
            key={item.id}
            item={item}
            index={i}
            categoryLabel={labelOf(item.category)}
            onOpen={onOpen}
          />
        ))}
```

- [ ] **Step 5: PreviewModal의 카테고리 라벨도 props로**

Modify `apps/web/src/components/PreviewModal.tsx`:
- `import { CATEGORIES } from "@/data/showcase";`와 `categoryLabel` 함수 삭제.
- 시그니처에 `categoryLabel?: string` 추가:
```tsx
export default function PreviewModal({
  item,
  categoryLabel,
  onClose,
}: {
  item: Showcase | null;
  categoryLabel: string;
  onClose: () => void;
}) {
```
- 본문 내 `{categoryLabel(item.category)}` → `{categoryLabel}` 으로 변경.

- [ ] **Step 6: page.tsx를 API 데이터로 전환**

Modify `apps/web/src/app/page.tsx` — 데이터 소스/상태 부분 교체. (헤더·히어로·푸터 JSX는 유지)
- 상단 import 교체:
```tsx
"use client";

import { useMemo, useState } from "react";
import type { Category, Showcase } from "@melstudio/shared";
import { useCategories, useAllShowcases } from "@/lib/queries";
import TagBar from "@/components/TagBar";
import ShowcaseGrid from "@/components/ShowcaseGrid";
import PreviewModal from "@/components/PreviewModal";
```
- 컴포넌트 본문 상단(상태/파생값)을 다음으로 교체:
```tsx
export default function Home() {
  const [active, setActive] = useState<string>("all");
  const [selected, setSelected] = useState<Showcase | null>(null);

  const categoriesQuery = useCategories();
  const showcasesQuery = useAllShowcases();

  const showcases = useMemo(
    () => showcasesQuery.data?.items ?? [],
    [showcasesQuery.data],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: showcases.length };
    for (const s of showcases) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [showcases]);

  const tabs: Category[] = useMemo(
    () => [{ id: "all", label: "전체" }, ...(categoriesQuery.data ?? [])],
    [categoriesQuery.data],
  );

  const labelOf = useMemo(() => {
    const m = new Map(tabs.map((t) => [t.id, t.label]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [tabs]);

  const filtered = useMemo(
    () => (active === "all" ? showcases : showcases.filter((s) => s.category === active)),
    [active, showcases],
  );

  const isLoading = categoriesQuery.isLoading || showcasesQuery.isLoading;
  const isError = categoriesQuery.isError || showcasesQuery.isError;
```
- 히어로 통계의 하드코딩 수치를 동적으로:
  - `{SHOWCASES.length}` → `{showcases.length}`
  - `8` (업종 수) → `{Math.max(0, tabs.length - 1)}`
- 태그/그리드 섹션의 렌더를 다음으로 교체:
```tsx
        <div className="sticky top-0 z-30 -mx-5 mb-10 bg-blush/70 px-5 py-4 backdrop-blur-md">
          <TagBar categories={tabs} counts={counts} active={active} onChange={setActive} />
        </div>

        {isError ? (
          <p className="py-24 text-center text-wine/60">
            데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요.
          </p>
        ) : isLoading ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : (
          <ShowcaseGrid items={filtered} labelOf={labelOf} onOpen={setSelected} />
        )}
```
- 모달 렌더에 라벨 전달:
```tsx
      <PreviewModal
        item={selected}
        categoryLabel={selected ? labelOf(selected.category) : ""}
        onClose={() => setSelected(null)}
      />
```

- [ ] **Step 7: 정적 데이터 파일 삭제**

Run:
```bash
git rm apps/web/src/data/showcase.ts
```
> `countByCategory`는 page.tsx의 `counts`로 대체되었고, 모든 타입은 shared에서 온다. 남은 참조가 없어야 한다.

- [ ] **Step 8: 타입체크 + 빌드 (실패 시 남은 import 정리)**

Run: `npm run build -w @melstudio/web`
Expected: `✓ Compiled successfully`. 만약 `@/data/showcase` 잔여 import 에러가 나면 해당 파일에서 제거(타입은 shared로).

- [ ] **Step 9: E2E 수동 확인 (DB + API + web 함께)**

Run (별도 터미널 권장):
```bash
docker compose up -d
npm run db:seed -w @melstudio/api
npm run dev:api      # 터미널 A
npm run dev:web      # 터미널 B
```
브라우저 http://localhost:3000 — 태그 필터·5박스 슬라이더·모달이 **DB 데이터로** 기존과 동일하게 동작하는지 확인. 카테고리 카운트가 맞는지 확인.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(web): source showcase data from api via react-query"
```

---

## Task 12: 마무리 — 루트 README + 동시 실행 스크립트

**Files:**
- Create: `README.md`
- Modify: `package.json`(root, dev 스크립트)

- [ ] **Step 1: 동시 실행 스크립트 추가**

`package.json`(root) devDependencies + scripts:
```json
  "scripts": {
    "dev": "concurrently -n api,web -c blue,magenta \"npm:dev:api\" \"npm:dev:web\"",
    "dev:web": "npm run dev -w @melstudio/web",
    "dev:api": "npm run dev -w @melstudio/api",
    "build": "npm run build -w @melstudio/web",
    "test": "npm run test -w @melstudio/api && npm run test -w @melstudio/shared",
    "db:seed": "npm run db:seed -w @melstudio/api"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
```
Run: `npm install`

- [ ] **Step 2: README 작성**

Create `README.md`:
```markdown
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
npm run db:seed                 # 시드(카테고리 8 + 쇼케이스 40)
npm run dev                     # api(4000) + web(3000) 동시 기동
```

## 테스트
```bash
npm test
```

## 진행 로드맵
- [x] ① 데이터 토대 (DB + API)
- [ ] ② 갤러리 + 클라우드 스토리지(MinIO) + 가상화 무한스크롤
- [ ] ③ 주문 + 결제(PortOne) + 소셜로그인
- [ ] ④ 실시간 채팅(Socket.IO)
```

- [ ] **Step 3: 전체 검증**

Run:
```bash
npm test
npm run build -w @melstudio/web
```
Expected: 테스트 PASS + web 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: root readme + concurrent dev script"
```

---

## Self-Review (작성자 점검 결과)

**Spec 커버리지 (스펙 ① 범위 대비)**
- 모노레포 전환(web 이전) → Task 1 ✓
- docker-compose(postgres+minio) → Task 2 ✓
- 공유 타입 → Task 3 ✓
- Express 부트스트랩 → Task 4 ✓
- Prisma 스키마(Category/Showcase)+마이그레이션 → Task 5 ✓
- 시드(기존 40개 이관) → Task 6 ✓
- 커서 페이지네이션 서비스 → Task 7 ✓
- 검증/에러 미들웨어 → Task 8 ✓
- `GET /api/categories`, `GET /api/showcases?category=&cursor=&limit=` → Task 9 ✓
- web 정적→API 전환(기능 동일 유지) → Task 10–11 ✓
- 완료기준(기존 화면 DB 기반 동일 동작 + API 통합테스트) → Task 9·11 ✓

**Placeholder 스캔**: 데이터 이관(Task 6 Step 1)의 "40개 항목 붙여넣기"는 기존 레포에 실재하는 데이터의 이동 지시이며 변환규칙(id→slug)이 명시됨 — 미정 항목 아님. 그 외 TODO/TBD 없음.

**타입 일관성**: 퍼블릭 `Showcase.id = slug`, `Showcase.category = category slug`, 커서 = DB `showcase.id`(cuid, 불투명)로 전 구간 일치. `listShowcases`/`listCategories` 시그니처가 service→route→web 훅까지 동일. TagBar/Grid/Card/Modal의 `categoryLabel` prop 명칭 일치.

**알려진 전제**
- Task 7 서비스 테스트는 **시드된 로컬 DB**를 가정한다(실행 전 `db:seed` 필요, beforeAll에서 가드). 격리 테스트 DB 분리는 ③에서 도입 고려.
- MinIO는 본 단계에서 기동만 하고 코드 연결은 ②에서.
```
