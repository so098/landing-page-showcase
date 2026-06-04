# api 컨테이너 이미지 크기 — Before/After

배포 대상(AWS ECS/Fargate)에서 이미지 크기는 **태스크 콜드스타트(이미지 풀 시간)** 와 ECR 저장비에 직접 영향을 준다. 레포 테마(측정→개선)에 맞춰 v1을 측정해 두고, 슬림화(v2) 후 비교한다.

| 단계 | 방식 | 이미지 크기 | 비고 |
|---|---|---|---|
| **v1 (Before)** | tsx 런타임 + 전체 워크스페이스 의존성 | **2.08 GB** | `@melstudio/shared`가 TS 소스라 tsc 운영실행이 불가 → tsx로 우회. 빌드 시 루트 `npm ci`가 web 포함 전 워크스페이스 devDeps까지 설치(이미지에 web 코드는 없으나 node_modules는 포함). |
| v2 (목표) | tsup 번들 + 멀티스테이지 슬림 | (후속) | shared 인라인 번들, `@prisma/client`만 external로 두고 엔진/스키마 복사. 런타임 의존성만 → 대폭 감소 예상. |

## v1 측정 조건
- 호스트: Apple Silicon(arm64), Docker
- 빌드: `docker build -f apps/api/Dockerfile -t melstudio-api:dev .` (컨텍스트=레포 루트)
- 측정: `docker images melstudio-api:dev --format '{{.Size}}'`
- 검증: `docker run` 후 `GET /health` → `{"status":"ok"}` HTTP 200

## v2에서 줄일 여지 (가설)
1. **멀티스테이지**: 빌드 단계(tsc/tsup, devDeps)와 런타임 단계 분리 → 런타임 이미지에 devDeps·소스 미포함.
2. **번들링(tsup/esbuild)**: shared를 인라인해 워크스페이스 `node_modules` 의존 제거. `@prisma/client`/엔진만 external 복사.
3. **web 의존성 배제**: api 전용 의존성만 설치(현재는 루트 `npm ci`가 web까지 설치).
4. **slim/alpine 베이스 + 프로덕션 의존성만**(`--omit=dev`).
