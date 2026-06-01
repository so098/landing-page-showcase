# 이미지 저장소 + 주문서 사진 업로드 설계

> 2026-06-01 · 단계 ②-b (클라우드 스토리지) 일부

## 배경

랜딩페이지 안에 들어가는 사진(가게 사진, 제품 사진, 로고 등)을 저장할 곳이 필요하다.
현재 주문서의 "자료 업로드" 섹션은 파일을 선택만 하고 실제로 어디에도 저장하지 않는다
(브라우저 메모리에만 존재 → 새로고침하면 사라짐).

이 작업으로 고객이 업로드한 사진이 S3 호환 스토리지에 실제로 저장되고 공개 URL로
접근 가능해진다. 이후 "AI로 생성하기" 단계에서 이 URL들을 랜딩페이지에 삽입해 사용한다.

## 결정 사항

| 항목 | 결정 |
|---|---|
| 이미지 출처 | 고객 직접 업로드 (스톡 이미지는 다음 단계) |
| 저장소 | 로컬 개발: MinIO (docker-compose에 이미 준비됨) → 실서비스: Cloudflare R2 |
| 전환 방식 | S3 호환 API 코드 하나로 작성, 환경변수만 교체하면 R2로 전환 |
| 업로드 방식 | API 경유 (브라우저 → Express → MinIO/R2). 서버에서 검증 수행 |
| 범위 | 저장소 + 업로드 + 주문서 폼 연동까지. AI 생성/스톡 이미지는 제외 |

### Cloudflare R2를 선택한 이유 (실서비스 시점)

- S3 API 호환 → MinIO로 개발한 코드를 그대로 사용
- 이미지 내보내기 트래픽(egress) 무료 → 사진이 많은 랜딩페이지 서비스에 유리
- 무료 티어: 저장 10GB + 월 100만 읽기

## 전체 구조

```
[주문서 폼: 사진 선택]
   │ 선택 즉시 업로드 (multipart/form-data)
   ▼
[Express API: POST /api/uploads]
   │ 검증: jpg/png/webp/gif, 최대 10MB
   │ DB에 Asset 레코드 기록
   ▼
[MinIO (로컬) ──→ Cloudflare R2 (실서비스)]
   │
   ▼
공개 URL 반환 → 폼에 썸네일 미리보기 + localStorage에 URL 저장
```

## 백엔드 (apps/api)

### 새 파일

| 파일 | 역할 |
|---|---|
| `src/lib/storage.ts` | `@aws-sdk/client-s3` 기반 S3 클라이언트. MinIO/R2 공용. 시작 시 버킷 자동 생성 + 공개 읽기 정책 적용 |
| `src/services/upload.service.ts` | 파일 검증(종류·크기), 객체 키 생성(`orders/{visitorId}/{cuid}.{ext}`), 저장, Asset 레코드 생성/삭제 |
| `src/routes/uploads.route.ts` | `POST /api/uploads` (multer, multipart), `DELETE /api/uploads/:id` |

### Prisma 모델 추가

```prisma
model Asset {
  id        String   @id @default(cuid())
  key       String   @unique // S3 객체 키
  url       String // 공개 URL
  mimeType  String
  size      Int
  visitorId String // 채팅과 동일한 방문자 ID 체계 재사용
  createdAt DateTime @default(now())
}
```

### API 명세

**POST /api/uploads** (multipart/form-data)
- 필드: `file` (이미지 파일), `visitorId`
- 검증: jpg/png/webp/gif만 허용, 10MB 이하
- 응답 201: `{ id, url, key }`
- 오류 400: 지원하지 않는 형식 / 크기 초과

**DELETE /api/uploads/:id**
- 스토리지 객체 + Asset 레코드 삭제
- 응답 204

### 의존성 추가

- `@aws-sdk/client-s3` — S3/MinIO/R2 클라이언트
- `multer` + `@types/multer` — multipart 파싱

## 프론트엔드 (apps/web)

- 주문서 8번 "자료 업로드" 섹션(`OrderForm.tsx`): 파일 선택 → 즉시 업로드 → 업로드 중
  표시 → 완료 시 썸네일 미리보기
- `OrderFormSchema`(`lib/order.ts`)에 `uploadedImages: [{ id, url }]` 필드 추가
  → File 객체와 달리 직렬화 가능하므로 localStorage에 보존됨 (새로고침 시 유실 문제 해결)
- X 버튼 클릭 시 목록 제거 + `DELETE /api/uploads/:id` 호출
- 업로드 함수는 기존 API 클라이언트(`lib/api`) 패턴을 따라 추가

## 환경변수

기존 `.env.example`의 S3 변수 사용 + 공개 URL 변수 1개 추가:

```bash
# 로컬 (MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=showcase
S3_PUBLIC_URL=http://localhost:9000/showcase   # 추가

# 실서비스 (Cloudflare R2) — 환경변수만 교체
# S3_ENDPOINT=https://<계정ID>.r2.cloudflarestorage.com
# S3_ACCESS_KEY=<R2 액세스 키>
# S3_SECRET_KEY=<R2 시크릿 키>
# S3_BUCKET=melstudio-images
# S3_PUBLIC_URL=https://img.<도메인>   # R2 커스텀 도메인 또는 r2.dev 공개 URL
```

## 오류 처리

- 스토리지 연결 실패: 업로드 API가 503 반환, 폼에서 "잠시 후 다시 시도" 안내
- 잘못된 파일: 400 + 한국어 오류 메시지 (기존 폼 검증 메시지 톤과 일치)
- 업로드 도중 이탈: Asset 레코드와 객체가 남을 수 있음 — 고아 파일 정리는 이번 범위에서 제외 (YAGNI)

## 테스트

- `upload.service.test.ts` — 파일 종류/크기 검증 거부, 키 생성 규칙
- `uploads.route.test.ts` — supertest로 multipart 업로드 → MinIO 저장 → URL 응답 확인,
  삭제 동작 확인 (기존 `showcases.route.test.ts` 패턴을 따름)
- 수동 검증: 주문서에서 사진 업로드 → MinIO 콘솔(localhost:9001)에서 객체 확인 →
  반환된 URL을 브라우저에서 열어 이미지 표시 확인 → 새로고침 후에도 썸네일 유지 확인

## 이번 범위에서 제외 (다음 단계)

- 스톡/기본 이미지 제공
- AI 랜딩페이지 생성 시 이미지 활용
- 이미지 리사이즈/최적화 (sharp)
- 쇼케이스 미리보기 이미지(`desktopKey`/`mobileKey`/`thumbKey`) 채우기
- 고아 파일 정리 배치
