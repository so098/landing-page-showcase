# 생성 랜딩 RDS 기록 + S3 저장/서빙 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 생성 랜딩(html/css/js/hero)을 S3에 저장하고 api가 S3에서 불변-캐시 서빙하며, RDS `GeneratedPage`에 S3 키를 기록 — 프로덕션(ECS) 동작.

**Architecture:** 생성 직후 로컬 임시 디렉터리의 파일을 `generated-landings/<jobId>/<file>` 키로 S3(기존 `melstudio-assets`)에 업로드하고, 기존 `saveGeneratedPage`에 S3 키를 채운다. 서빙 라우트는 디스크 `sendFile`을 S3 GetObject 스트리밍 + `Cache-Control: immutable`로 교체. 그 뒤 `@melstudio/ai-landing`을 배포 통합(커밋·Dockerfile·lock·태스크 S3권한·SSM 키·ALB idle_timeout)한다.

**Tech Stack:** Express, Prisma, `@aws-sdk/client-s3` v3, Vitest+supertest(실 RDS, S3 모킹), Terraform, ECS/Fargate.

**선행 사실:**
- `generateLanding(...)` 반환: `outputDir`(=`<root>/<jobId>`), `files.{indexHtml,stylesCss,scriptJs}`(절대경로), 출력 디렉터리에 `hero.jpg`도 존재(스텁은 없을 수 있음).
- `/api/ai-landing/dry-run`은 `dryRun:true`로 **Claude 없이 스텁 생성** → 테스트에 사용.
- 라우트 파일: `apps/api/src/routes/ai-landing.route.ts`. 현재 디스크 sendFile 서빙.
- `@aws-sdk/client-s3` 미설치. env: `ANTHROPIC_API_KEY`/`CLAUDE_API_KEY`/`CLAUDE_MODEL`/`AI_LANDING_OUTPUT_DIR` 이미 있음.
- 테스트 패턴: `import request from "supertest"; createApp(); prisma` (실 DB). S3는 `vi.mock`으로 격리.
- 버킷: `melstudio-assets-345070521201`(비공개). 미커밋: `packages/ai-landing`, `apps/api`(package.json/app.ts/route/schema/migration/env).

---

### Task 1: S3 SDK 의존성 + env 확장

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/lib/env.ts`

- [ ] **Step 1: aws-sdk 설치**

Run:
```bash
npm install @aws-sdk/client-s3 -w @melstudio/api
```
Expected: `apps/api/package.json` dependencies에 `@aws-sdk/client-s3` 추가, `package-lock.json` 갱신, 에러 없음.

- [ ] **Step 2: env에 S3 설정 추가 (옵셔널 — 미설정 시에도 부팅)**

`apps/api/src/lib/env.ts`의 `EnvSchema`에 두 줄 추가:
```ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  AI_LANDING_OUTPUT_DIR: z.string().optional(),
  ASSETS_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default("ap-northeast-2"),
});
```

- [ ] **Step 3: 빌드/타입 확인**

Run: `npm run build -w @melstudio/api`
Expected: `tsc` 에러 없이 완료.

- [ ] **Step 4: 커밋**

```bash
git add apps/api/package.json apps/api/src/lib/env.ts package-lock.json
git commit -m "feat(api): @aws-sdk/client-s3 + ASSETS_BUCKET/AWS_REGION env"
```

---

### Task 2: `lib/s3.ts` — S3 프리미티브

**Files:**
- Create: `apps/api/src/lib/s3.ts`

S3 접근을 한 모듈로 격리(라우트 테스트에서 `vi.mock`으로 대체 가능). 제너릭 put/get만.

- [ ] **Step 1: 모듈 작성**

```ts
import { Readable } from "node:stream";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env.js";

// 단일 클라이언트(리전은 env). ASSETS_BUCKET 미설정 시 호출부에서 가드.
const client = new S3Client({ region: env.AWS_REGION });

export function assetsBucket(): string {
  if (!env.ASSETS_BUCKET) throw new Error("ASSETS_BUCKET is not configured");
  return env.ASSETS_BUCKET;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: assetsBucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

// 객체 없으면 null. 그 외 에러는 throw.
export async function getObject(
  key: string,
): Promise<{ body: Readable; contentType?: string } | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: assetsBucket(), Key: key }));
    return { body: res.Body as Readable, contentType: res.ContentType };
  } catch (err) {
    const name = (err as { name?: string }).name;
    const code = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (name === "NoSuchKey" || code === 404) return null;
    throw err;
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build -w @melstudio/api`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add apps/api/src/lib/s3.ts
git commit -m "feat(api): S3 프리미티브(lib/s3) — putObject/getObject"
```

---

### Task 3: 생성 후 S3 업로드 + RDS에 S3 키 기록

**Files:**
- Modify: `apps/api/src/routes/ai-landing.route.ts`
- Test: `apps/api/src/routes/ai-landing.route.test.ts` (신규)

- [ ] **Step 1: 실패 테스트 작성 (dry-run → S3 업로드 호출 + RDS S3 키 채움)**

`apps/api/src/routes/ai-landing.route.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";

// S3 모듈 모킹 — 실제 S3 미접근
const putObject = vi.fn(async () => {});
const getObject = vi.fn(async () => null);
vi.mock("../lib/s3.js", () => ({
  putObject: (...a: unknown[]) => putObject(...a),
  getObject: (...a: unknown[]) => getObject(...a),
  assetsBucket: () => "test-bucket",
}));

// app은 모킹 적용 후 import
const { createApp } = await import("../app");
const app = createApp();

const ORDER = { businessName: "테스트카페", industry: "cafe", tone: "warm", goal: "방문예약", dryRun: true };

beforeEach(async () => {
  await prisma.generatedPage.deleteMany();
  putObject.mockClear();
});

describe("POST /api/ai-landing/dry-run", () => {
  it("생성 파일을 S3에 업로드하고 RDS에 S3 키를 기록한다", async () => {
    const res = await request(app).post("/api/ai-landing/dry-run").send(ORDER);
    expect(res.status).toBe(201);
    const jobId = res.body.jobId as string;

    // index/styles/script 3개는 반드시 업로드됨
    const keys = putObject.mock.calls.map((c) => c[0] as string);
    expect(keys).toContain(`generated-landings/${jobId}/index.html`);
    expect(keys).toContain(`generated-landings/${jobId}/styles.css`);
    expect(keys).toContain(`generated-landings/${jobId}/script.js`);

    const row = await prisma.generatedPage.findUnique({ where: { jobId } });
    expect(row?.htmlS3Key).toBe(`generated-landings/${jobId}/index.html`);
    expect(row?.cssS3Key).toBe(`generated-landings/${jobId}/styles.css`);
    expect(row?.jsS3Key).toBe(`generated-landings/${jobId}/script.js`);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/api && npx vitest run src/routes/ai-landing.route.test.ts`
Expected: FAIL (현재 라우트는 S3 업로드/키 기록 안 함 → putObject 미호출, S3 키 null).

- [ ] **Step 3: 라우트에 업로드 헬퍼 + 키 기록 추가**

`apps/api/src/routes/ai-landing.route.ts` 상단 import에 추가:
```ts
import { readFile } from "node:fs/promises";
import { putObject, getObject } from "../lib/s3.js";
```
파일 상단(헬퍼 영역)에 추가:
```ts
const SERVED_FILES = ["index.html", "styles.css", "script.js", "hero.jpg"] as const;
const CONTENT_TYPE: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
};

function s3KeyFor(jobId: string, file: string): string {
  return `generated-landings/${jobId}/${file}`;
}

// 출력 디렉터리의 서빙 대상 파일을 S3로 업로드(없는 파일은 건너뜀 — 스텁은 hero 없음)
async function uploadGeneratedLanding(jobId: string, outputDir: string): Promise<void> {
  for (const file of SERVED_FILES) {
    const local = path.join(outputDir, file);
    if (!existsSync(local)) continue;
    const body = await readFile(local);
    const ext = path.extname(file);
    await putObject(s3KeyFor(jobId, file), body, CONTENT_TYPE[ext] ?? "application/octet-stream");
  }
}
```
`saveGeneratedPage`의 `update`와 `create` 양쪽에 S3 키 3종을 추가(아래 키만 추가, 나머지 필드 동일):
```ts
      htmlS3Key: s3KeyFor(params.result.jobId, "index.html"),
      cssS3Key: s3KeyFor(params.result.jobId, "styles.css"),
      jsS3Key: s3KeyFor(params.result.jobId, "script.js"),
```
`/generate`와 `/dry-run` 양쪽에서 `saveGeneratedPage` 호출 **직전에** 업로드 추가:
```ts
    await uploadGeneratedLanding(result.jobId, result.outputDir);
    await saveGeneratedPage({ result, orderSnapshot: input, previewUrl });
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/api && npx vitest run src/routes/ai-landing.route.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/routes/ai-landing.route.ts apps/api/src/routes/ai-landing.route.test.ts
git commit -m "feat(api): 생성 랜딩을 S3 업로드 + RDS에 S3 키 기록"
```

---

### Task 4: 서빙을 디스크 → S3 스트리밍 + 불변 캐시 헤더

**Files:**
- Modify: `apps/api/src/routes/ai-landing.route.ts`
- Test: `apps/api/src/routes/ai-landing.route.test.ts`

- [ ] **Step 1: 실패 테스트 추가 (GET :file → S3에서 + Cache-Control immutable)**

위 테스트 파일에 describe 추가:
```ts
import { Readable } from "node:stream";

describe("GET /api/ai-landing/generated/:jobId/:file", () => {
  const JOB = "00000000-0000-4000-8000-000000000000";

  it("S3에서 파일을 스트리밍하고 불변 캐시 헤더를 준다", async () => {
    getObject.mockResolvedValueOnce({
      body: Readable.from([Buffer.from("<html>ok</html>")]),
      contentType: "text/html; charset=utf-8",
    });
    const res = await request(app).get(`/api/ai-landing/generated/${JOB}/index.html`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("ok");
    expect(res.headers["cache-control"]).toContain("immutable");
    expect(getObject).toHaveBeenCalledWith(`generated-landings/${JOB}/index.html`);
  });

  it("S3에 없으면 404", async () => {
    getObject.mockResolvedValueOnce(null);
    const res = await request(app).get(`/api/ai-landing/generated/${JOB}/script.js`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/api && npx vitest run src/routes/ai-landing.route.test.ts`
Expected: FAIL (현재는 디스크 sendFile).

- [ ] **Step 3: 서빙 라우트 교체**

`apps/api/src/routes/ai-landing.route.ts`의 `GET /generated/:jobId/:file` 핸들러 본문을 교체:
```ts
aiLandingRouter.get("/generated/:jobId/:file", async (req, res, next) => {
  try {
    const { jobId, file } = req.params;
    if (!/^[a-f0-9-]{36}$/i.test(jobId)) {
      res.status(400).json({ message: "invalid jobId" });
      return;
    }
    if (!SERVED_FILES.includes(file as (typeof SERVED_FILES)[number])) {
      res.status(404).json({ message: "not found" });
      return;
    }
    const obj = await getObject(s3KeyFor(jobId, file));
    if (!obj) {
      res.status(404).json({ message: "not found" });
      return;
    }
    res.setHeader("Content-Type", obj.contentType ?? CONTENT_TYPE[path.extname(file)] ?? "application/octet-stream");
    // 생성물은 jobId별 불변 → 적극 캐시(브라우저/CDN). 반복 조회 시 S3 히트 0.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    obj.body.pipe(res);
  } catch (error) {
    next(error);
  }
});
```
그리고 이제 안 쓰는 import는 정리: `import { existsSync } from "node:fs";`는 `uploadGeneratedLanding`에서 여전히 사용하므로 유지. `res.sendFile` 제거됨.

- [ ] **Step 4: 통과 확인 + 전체 api 테스트**

Run: `cd apps/api && npx vitest run src/routes/ai-landing.route.test.ts`
Expected: PASS.
Run: `npm run test -w @melstudio/api`
Expected: 전체 PASS (시드 의존 테스트는 로컬 DB 시드 전제 — 기존과 동일).

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/routes/ai-landing.route.ts apps/api/src/routes/ai-landing.route.test.ts
git commit -m "feat(api): 생성 랜딩 서빙을 S3 스트리밍 + 불변 캐시로 전환"
```

---

### Task 5: `@melstudio/ai-landing` 배포 통합 — 커밋 + lock

**Files:**
- Commit: `packages/ai-landing/` (코드만), `apps/api/`(미커밋분), `package-lock.json`

> 자산/생성물은 이미 `.gitignore`(`assets/clipart/`, `generated/`, `dist/`, `__pycache__`). 코드(src/scripts/package.json 등)만 들어간다.

- [ ] **Step 1: lock 재생성 (워크스페이스 정합)**

Run: `npm install`
Expected: `package-lock.json`에 `@melstudio/ai-landing` 워크스페이스 반영, 에러 없음.

- [ ] **Step 2: 커밋될 ai-landing 파일 확인 (자산 제외 검증)**

Run: `git add packages/ai-landing && git status --short packages/ai-landing | grep -iE "assets/clipart|generated/|dist/" || echo "OK: 자산/생성물 없음"`
Expected: `OK: 자산/생성물 없음`.

- [ ] **Step 3: 커밋**

```bash
git add packages/ai-landing apps/api/package.json apps/api/src/app.ts apps/api/src/routes/ai-landing.route.ts apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260605074200_add_generated_page package-lock.json
git commit -m "feat: AI 랜딩 생성 기능 배포 통합 — ai-landing 패키지 + api 라우트/모델 커밋"
```

---

### Task 6: Dockerfile에 ai-landing 포함

**Files:**
- Modify: `apps/api/Dockerfile`

api 컨테이너가 `@melstudio/ai-landing`을 런타임에 해석하려면 소스가 이미지에 있어야 한다.

- [ ] **Step 1: COPY 추가**

`apps/api/Dockerfile`의 매니페스트 복사 구간에 추가:
```dockerfile
COPY packages/ai-landing/package.json packages/ai-landing/
```
(루트 `npm ci` 전, 다른 `COPY ... package.json` 줄들과 함께)
그리고 소스 복사 구간(`COPY apps/api apps/api` 부근)에 추가:
```dockerfile
COPY packages/ai-landing packages/ai-landing
```

- [ ] **Step 2: 로컬 빌드 검증**

Run: `docker build -f apps/api/Dockerfile -t melstudio-api:ail .`
Expected: 빌드 성공(`DONE`). (ai-landing 미포함 시 npm ci/tsx 해석 실패했을 것)

- [ ] **Step 3: 컨테이너 부팅 검증 (ai-landing import 해석되나)**

Run:
```bash
docker run --rm -d --name ail-test -e DATABASE_URL="postgresql://u:p@localhost:5432/db" -e ASSETS_BUCKET="x" -p 4011:4000 melstudio-api:ail
sleep 4 && curl -fsS http://localhost:4011/health && docker stop ail-test
```
Expected: `{"status":"ok"}` (부팅 성공 = app.ts의 ai-landing import 해석됨).

- [ ] **Step 4: 커밋**

```bash
git add apps/api/Dockerfile
git commit -m "build(api): Dockerfile에 packages/ai-landing 포함(런타임 의존성)"
```

---

### Task 7: Terraform — 태스크 S3 권한 + ASSETS_BUCKET env + ANTHROPIC SSM + ALB idle_timeout

**Files:**
- Modify: `infra/iam.tf`, `infra/ecs.tf`, `infra/alb.tf`
- Create: `infra/ssm_anthropic.tf`

- [ ] **Step 1: 태스크 역할에 S3 권한 (iam.tf)**

`infra/iam.tf` 끝에 추가:
```hcl
# 생성 랜딩 S3 입출력 (assets 버킷의 generated-landings/* )
data "aws_iam_policy_document" "ecs_task_s3" {
  statement {
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.assets.arn}/generated-landings/*"]
  }
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name   = "${var.project}-task-s3"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_s3.json
}
```

- [ ] **Step 2: ANTHROPIC_API_KEY SSM 파라미터 (ssm_anthropic.tf)**

`infra/ssm_anthropic.tf` 생성. 값은 Terraform 밖에서 넣으므로 placeholder로 만들고 변경 무시:
```hcl
# Claude API 키 — 값은 사용자가 콘솔/CLI로 입력(코드/state에 실키 미보관)
resource "aws_ssm_parameter" "anthropic_api_key" {
  name  = "/${var.project}/ANTHROPIC_API_KEY"
  type  = "SecureString"
  value = "PLACEHOLDER" # 실제 값은 aws ssm put-parameter로 덮어씀

  lifecycle {
    ignore_changes = [value] # 외부에서 넣은 실키를 Terraform이 되돌리지 않게
  }
}
```
실행 역할이 이 파라미터도 읽도록, `infra/iam.tf`의 `data "aws_iam_policy_document" "ssm_read"` resources에 추가:
```hcl
    resources = [aws_ssm_parameter.database_url.arn, aws_ssm_parameter.anthropic_api_key.arn]
```

- [ ] **Step 3: 태스크 정의에 env + secret 주입 (ecs.tf)**

`infra/ecs.tf`의 컨테이너 `environment`에 추가:
```hcl
      { name = "ASSETS_BUCKET", value = aws_s3_bucket.assets.id },
      { name = "AWS_REGION", value = var.region },
```
`secrets`에 추가:
```hcl
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_ssm_parameter.anthropic_api_key.arn },
```

- [ ] **Step 4: ALB idle_timeout (alb.tf)**

`infra/alb.tf`의 `resource "aws_lb" "main"`에 추가:
```hcl
  idle_timeout = 180 # 동기 생성(Claude)이 60s↑일 수 있어 완화
```

- [ ] **Step 5: validate + plan**

Run: `cd infra && terraform validate && terraform plan -no-color | grep -E "will be|Plan:"`
Expected: validate Success. plan: ssm 파라미터/정책/태스크정의/ALB 변경 표시, destroy 없음(태스크정의 replace는 정상).

- [ ] **Step 6: 커밋**

```bash
git add infra/iam.tf infra/ecs.tf infra/alb.tf infra/ssm_anthropic.tf
git commit -m "infra(terraform): 태스크 S3 권한 + ASSETS_BUCKET + ANTHROPIC SSM + ALB idle_timeout"
```

---

### Task 8: 배포 + 라이브 검증 (사용자 액션 포함)

**Files:** (없음 — 적용/검증)

- [ ] **Step 1: 사용자 — terraform apply**

Run(사용자): `cd infra && terraform apply` → `yes`
Expected: SSM/정책/태스크정의/ALB 생성·갱신.

- [ ] **Step 2: 사용자 — ANTHROPIC 키 실제 값 입력**

Run(사용자):
```bash
aws ssm put-parameter --name /melstudio/ANTHROPIC_API_KEY --type SecureString --overwrite --value "sk-ant-..."
```
Expected: `Version: N`. (이후 ECS 태스크가 다음 배포에서 주입받음)

- [ ] **Step 3: push → CD 배포 + 마이그레이션**

Run(사용자): `git push origin main`
Expected: Deploy api 워크플로 success, `GeneratedPage` 마이그레이션 적용, 서비스 stable.

- [ ] **Step 4: 라이브 검증**

Run:
```bash
# 생성(dry-run로 키 없이도 가능) → S3 업로드 + RDS 기록 확인
curl -fsS -X POST https://api.landingpick.com/api/ai-landing/dry-run \
  -H 'content-type: application/json' \
  -d '{"businessName":"검증카페","industry":"cafe","tone":"warm","goal":"예약"}'
# 위 응답의 jobId로 서빙 확인 (S3에서 + 캐시 헤더)
curl -fsSI "https://api.landingpick.com/api/ai-landing/generated/<jobId>/index.html" | grep -iE "HTTP/|cache-control|content-type"
aws s3 ls s3://melstudio-assets-345070521201/generated-landings/ --recursive | head
```
Expected: dry-run 201 + jobId, 서빙 200 + `Cache-Control: ...immutable`, S3에 `generated-landings/<jobId>/*` 존재.

- [ ] **Step 5: 휘발성 해소 증거(사람 확인)**

재배포(또는 강제 새 배포) 후에도 같은 jobId의 `index.html`이 200으로 서빙되는지 확인 → 디스크 휘발 문제 해소 증명.

---

## Self-Review

- **Spec coverage:** S3 저장(Task3)·S3 서빙+캐시(Task4)·RDS S3키(Task3)·배포통합(Task5/6/7)·ALB타임아웃(Task7)·SSM 키(Task7/8)·테스트(Task3/4) 모두 매핑됨. 비동기 잡은 스펙상 범위 밖(미포함).
- **Placeholder scan:** SSM `value="PLACEHOLDER"`는 의도된 자리표시(실값은 Step8에서 주입, `ignore_changes`). `<jobId>`는 런타임 값. 그 외 TODO 없음.
- **Type 일관성:** `s3KeyFor(jobId,file)`, `SERVED_FILES`, `getObject`/`putObject` 시그니처가 Task2~4에서 일치. `generated-landings/<jobId>/<file>` 키 규약 전 Task 동일.

## 다음 단계

실행 방식 선택(아래) 후 진행. 단, **Task 8은 사용자 액션(apply/SSM 키/push)** 이 필요.
