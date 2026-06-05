# 설계서 — 생성 랜딩 RDS 기록 + S3 저장/서빙 (프로덕션)

- 작성일: 2026-06-05
- 상태: 설계 (사용자 리뷰 대기)
- 종류: 기능 설계 (단일 스펙). 상위: [[2026-06-04-monetization-deployment-design]]

## 1. 배경과 목표

AI가 생성한 랜딩페이지(order/result에서 보이는 것)를 **프로덕션(배포된 ECS api)** 에서 **RDS에 기록**하고, **랜딩 산출물(html/css/js/hero)을 S3에 영구 저장**해 안정적으로 서빙한다.

## 2. 현재 상태 (탐색 결과 — 사용자 가정과 일부 다름)

흐름: `OrderForm` 제출 → `POST /api/ai-landing/generate`(동기, Claude 호출) → 결과 jobId/previewUrl을 **sessionStorage**에 저장 → `order/result`가 `previewUrl` iframe으로 표시 + 확정(`/confirm`).

| 요소 | 상태 |
|---|---|
| `generateLanding` (Claude) + 품질게이트 | ✅ 구현 |
| `POST /generate` → **RDS 저장(`saveGeneratedPage` upsert)** | ✅ **이미 구현됨** |
| `GeneratedPage` 모델 + 마이그레이션(`add_generated_page`) | ✅ 있음 (`htmlS3Key/cssS3Key/jsS3Key` 필드도 정의됨) |
| 생성 파일 저장 | ❌ **로컬 디스크**(`generated/ai-landings/<jobId>/`), `GET .../:file`이 디스크에서 sendFile |
| S3 키 채움 | ❌ 안 됨 |
| 전체 기능 git 추적/배포 | ❌ `@melstudio/ai-landing`·라우트·마이그레이션 **미커밋** |

**핵심 문제:** Fargate 디스크는 휘발성 → `generated/` 파일은 재배포/재시작 시 소실, 멀티 태스크 시 다른 태스크로 가면 404. **따라서 S3 저장+서빙이 필수.**

## 3. 확정된 설계 결정

- **범위**: 프로덕션(배포 ECS api)에서 동작.
- **S3 버킷**: 기존 `melstudio-assets-<account>` 재사용. 프리픽스 `generated-landings/<jobId>/<file>`.
- **서빙**: **api 프록시** — 기존 `GET /api/ai-landing/generated/:jobId/:file`을 디스크→S3 GetObject 스트리밍으로 변경. **불변 캐시 헤더**(`Cache-Control: public, max-age=31536000, immutable`)로 브라우저 캐시 → 반복 조회 시 S3 히트 0. 상대참조(html→css/js/hero) 그대로 동작, S3 비공개 유지. CloudFront는 추후 발행 단계에서(immutable 헤더라 업그레이드 용이).
- **RDS**: 기존 `saveGeneratedPage` 유지 + S3 키 3종 채움.

## 4. 아키텍처 / 데이터 흐름

```
[생성]  OrderForm → POST /generate
          generateLanding() → 로컬 임시 디렉터리에 index.html/styles.css/script.js/hero.jpg
          → uploadDirToS3(generated-landings/<jobId>/...)            (신규)
          → saveGeneratedPage(... htmlS3Key/cssS3Key/jsS3Key 채움)   (수정)
          → 응답 {jobId, previewUrl=/api/ai-landing/generated/<jobId>/index.html}

[서빙]  iframe src=previewUrl → GET /api/ai-landing/generated/:jobId/:file
          → s3.getObject(generated-landings/<jobId>/<file>)          (디스크 sendFile 대체)
          → res: Content-Type + Cache-Control(immutable) + 스트림
```

로컬 디스크는 **태스크 내 임시 스테이징**일 뿐(생성 직후 S3 업로드). 서빙은 전적으로 S3.

## 5. 변경 단위 (파일별 책임)

| 파일 | 변경 | 책임 |
|---|---|---|
| `apps/api/src/lib/s3.ts` | **신규** | S3 클라이언트 + `putFile`/`getObjectStream`. 테스트에서 주입/모킹 가능하게 격리 |
| `apps/api/src/routes/ai-landing.route.ts` | 수정 | 생성 후 출력 디렉터리를 S3에 업로드, `saveGeneratedPage`에 S3 키 전달, `:file` 서빙을 S3에서 + 캐시 헤더 |
| `apps/api/src/lib/env.ts` | 수정 | `ASSETS_BUCKET`, `AWS_REGION` 추가(필수/기본값) |
| `apps/api/Dockerfile` | 수정 | `COPY packages/ai-landing packages/ai-landing` (런타임 의존성 해석) |
| `apps/api/prisma/schema.prisma` + 마이그레이션 | 기존(미커밋) | `GeneratedPage` — 변경 없음, 커밋만 |
| `package-lock.json` | 재생성 | `@melstudio/ai-landing` 워크스페이스 반영 |
| `infra/iam.tf` (ecs_task 역할) | 수정 | 버킷 `generated-landings/*`에 `s3:PutObject`/`s3:GetObject` |
| `infra/ecs.tf` (task def) | 수정 | env `ASSETS_BUCKET`, secret `ANTHROPIC_API_KEY`(SSM) 주입 |
| `infra/ssm.tf` 또는 기존 | 신규 | SSM SecureString `/melstudio/ANTHROPIC_API_KEY` (값은 사용자가 넣음) |
| `infra/alb.tf` | 수정 | ALB `idle_timeout = 180` (동기 생성 타임아웃 완화) |

## 6. 배포 통합 순서 (이 기능이 프로덕션에서 돌게)

1. `packages/ai-landing` 커밋 (코드만 — `assets/clipart`·`generated`·`dist` 등은 이미 .gitignore)
2. api 변경 커밋(route/schema/migration/env) + `package-lock.json` 재생성 커밋
3. Dockerfile `COPY packages/ai-landing` 추가
4. Terraform: task 역할 S3 정책 + ASSETS_BUCKET env + ANTHROPIC_API_KEY SSM/secret + ALB idle_timeout → `apply`(사용자)
5. **사용자: ANTHROPIC_API_KEY 값을 SSM에 입력** (콘솔 또는 `aws ssm put-parameter`)
6. push → CD가 빌드/배포 + 새 마이그레이션(GeneratedPage) 적용
7. 라이브 검증: 주문→생성→order/result iframe(S3 서빙)→RDS 레코드 확인

## 7. 리스크 / 완화

- **ALB 타임아웃(동기 생성)**: Claude 생성이 60s↑이면 ALB 기본 idle 60s에서 끊김 → `idle_timeout=180`으로 완화. 그래도 길면 **비동기 잡(job)** 으로 전환(후속, 본 스펙 범위 밖).
- **ai-landing 미커밋→배포 깨짐**: 6번 순서로 한 묶음 통합(Dockerfile COPY + lock + 커밋).
- **Claude 키 보안**: 코드/이미지 미포함, **SSM SecureString**로 주입(DATABASE_URL과 동일 패턴).
- **S3 비용**: 랜딩 1건 수백 KB~MB, 소액. 비공개 유지.
- **라이선스**: 생성 랜딩은 **비공개 S3**에 저장(공개 아님). hero 이미지가 클립아트 유래면 비공개 보관은 문제없음(재배포 아님).

## 8. 테스트 전략

- **api 라우트(Vitest+supertest, 실제 RDS)**: S3는 `lib/s3.ts`를 모킹(주입)해 — 생성→S3 put 호출됨 + `saveGeneratedPage`에 S3 키 채워짐 + `:file` GET이 S3 스트림+캐시헤더 반환.
- **잘못된 jobId/파일 화이트리스트** 검증 유지.
- **마이그레이션**: 기존 `add_generated_page` (CD가 적용).
- 사람 확인: 라이브 주문→생성→iframe 표시→재배포 후에도 동일 jobId 서빙됨(휘발성 해소 증거).

## 9. 열린 세부 (구현 계획에서 확정)

1. S3 업로드 대상: 서빙 화이트리스트(index.html/styles.css/script.js/hero.jpg)만 vs 출력 디렉터리 전체
2. `lib/s3.ts` SDK: `@aws-sdk/client-s3`(v3) 추가
3. ALB idle_timeout 값(180 제안) / 향후 비동기 전환 여부
4. SSM 파라미터명 규약(`/melstudio/ANTHROPIC_API_KEY`)
