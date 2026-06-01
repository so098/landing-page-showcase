# 멜스튜디오 풀스택 플랫폼 — 설계 계획서

- 작성일: 2026-05-29
- 상태: 설계(검토 대기)
- 목적: 프론트엔드 쇼케이스를 **풀스택 포트폴리오 제품**으로 확장 (이직 시장 대비)

---

## 1. 개요 / 목표

현재 `멜스튜디오`는 업종별 랜딩페이지를 보여주는 **프론트 전용** Next.js 앱이다(정적 데이터, 플레이스홀더 이미지).
이를 다음을 갖춘 풀스택 제품으로 확장한다:

1. **데이터 토대** — PostgreSQL + Express API. 정적 데이터를 DB로 이전.
2. **갤러리 + 클라우드 스토리지** — `/gallery` 라우트, MinIO 이미지 저장, React 가상화 무한스크롤.
3. **주문 + 결제** — 랜딩페이지 제작 주문 → 체크아웃 → 결제.
4. **실시간 채팅** — 고객 ↔ 스튜디오 1:1 문의 채팅.

**포트폴리오 관점 성공 기준**
- 라이브로 동작(로컬 Docker 기준 `docker compose up` 한 번으로 기동)
- 타입 안전(TS strict + Prisma 생성 타입 + 공유 타입 패키지)
- 테스트 존재(API 단위/통합, 프론트 핵심 로직)
- README + 본 계획서로 "의사결정 근거"를 설명 가능

---

## 2. 아키텍처 개요

```
┌────────────────────────────────────────────────────────────┐
│  브라우저                                                    │
│   apps/web  (Next.js 16 / React 19 / Tailwind)              │
│     - 쇼케이스, /gallery(가상화 무한스크롤), 주문, 채팅 UI   │
└───────────────┬───────────────────────┬─────────────────────┘
                │ REST (fetch/RQ)        │ WebSocket (Socket.IO)
                ▼                        ▼
┌────────────────────────────────────────────────────────────┐
│  apps/api  (Node + Express + TypeScript)                    │
│   - REST 라우터 (showcases, orders, payments, auth, chat)   │
│   - Socket.IO 게이트웨이 (채팅)                              │
│   - Prisma Client (DB 접근)                                  │
│   - S3 클라이언트 (MinIO presigned URL)                      │
└──────┬───────────────────────┬──────────────────┬───────────┘
       │ SQL (Prisma)           │ S3 API           │ 결제 API
       ▼                        ▼                  ▼
┌──────────────┐      ┌──────────────────┐   ┌─────────────┐
│ PostgreSQL   │      │ MinIO (S3 호환)  │   │ 결제 PG     │
│ (Docker)     │      │ (Docker)         │   │ (테스트모드) │
└──────────────┘      └──────────────────┘   └─────────────┘

packages/shared : web ↔ api 공유 타입 (Zod 스키마 + 추론 타입)
```

---

## 3. 기술 스택 & 선택 근거

| 영역 | 선택 | 근거 |
|---|---|---|
| 프론트 | Next.js 16, React 19, Tailwind | 기존 자산 유지 |
| 서버 | **Express + TypeScript** | 사용자 결정. 프론트와 분리된 독립 Node 백엔드 역량 증명 |
| ORM | **Prisma** | 타입세이프 쿼리 + 마이그레이션 + 시드. 면접에서 설명하기 좋음 |
| DB | **PostgreSQL** (Docker) | 사용자 결정. 관계형 모델(주문·결제·채팅) 적합 |
| 스토리지 | **MinIO** (Docker, S3 호환) | 사용자 결정. presigned URL 패턴 = 실무 표준. 추후 S3/R2로 무변경 이전 |
| 데이터 패칭 | **@tanstack/react-query** | 캐싱·무한쿼리·로딩/에러 상태 표준화 |
| 가상화 | **@tanstack/react-virtual** | 69개+ 대량 리스트를 DOM 노드 최소화로 렌더 |
| 실시간 | **Socket.IO** | 별도 Node 서버에 자연스럽게 탑재, 재연결·룸 기본 제공 |
| 검증 | **Zod** | 요청 검증 + 공유 타입 추론(프론트/백 단일 소스) |
| 인증 | **소셜로그인(OAuth) → JWT(httpOnly 쿠키)** | 고객은 카카오 등 소셜로그인, Passport.js로 OAuth 처리 후 JWT 발급. 관리자는 고정 계정 |
| 결제 | **PortOne(구 아임포트) 테스트모드** | 국내 표준. 카드/간편결제 다채널, 서버 검증 흐름 |
| 테스트 | **Vitest** (+ supertest, Testing Library) | 단일 러너로 프론트·백 통일 |

---

## 4. 레포 구조 (모노레포: pnpm workspaces)

> 기존 루트의 Next.js 앱을 `apps/web`으로 이전한다.

```
landing-page-sales/
├─ apps/
│  ├─ web/                  # 기존 Next.js (이전)
│  │   └─ src/...
│  └─ api/                  # 신규 Express 서버
│      ├─ src/
│      │   ├─ index.ts          # 부트스트랩(Express + Socket.IO)
│      │   ├─ routes/           # showcases, orders, payments, auth, chat
│      │   ├─ services/         # 비즈니스 로직
│      │   ├─ lib/              # prisma, s3, env, logger
│      │   ├─ middleware/       # auth, error, validate(zod)
│      │   └─ sockets/          # 채팅 게이트웨이
│      ├─ prisma/
│      │   ├─ schema.prisma
│      │   └─ seed.ts           # 기존 showcase 데이터 이관
│      └─ package.json
├─ packages/
│  └─ shared/               # Zod 스키마 + 추론 타입 (web/api 공유)
├─ docker-compose.yml       # postgres + minio
├─ pnpm-workspace.yaml
├─ .env.example
└─ docs/superpowers/specs/  # 본 문서
```

**대안(더 단순)**: 모노레포 없이 루트=web, `server/`=api 두 패키지만 둠. 단 타입 공유가 번거로워 모노레포를 권장.

---

## 5. 인프라 (로컬 Docker)

`docker-compose.yml`:
- **postgres**: 5432, 볼륨 영속화, `melstudio` DB
- **minio**: 9000(API)/9001(콘솔), 버킷 `showcase`(공개 읽기 정책 또는 presigned)

`.env.example` 키:
```
DATABASE_URL=postgresql://melstudio:melstudio@localhost:5432/melstudio
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=showcase
JWT_SECRET=...
API_PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

기동: `docker compose up -d` → `pnpm --filter api prisma migrate dev` → `pnpm --filter api db:seed` → `pnpm dev`.

---

## 6. 데이터 모델 (Prisma, 단계별 확장)

> 각 서브프로젝트에서 해당 모델만 추가/확장한다.

```prisma
// ── ① 토대 ──
model Category {
  id        String   @id @default(cuid())
  slug      String   @unique
  label     String
  order     Int      @default(0)
  showcases Showcase[]
}

model Showcase {
  id           String   @id @default(cuid())
  slug         String   @unique
  title        String
  blurb        String
  accent       String
  layout       String                 // hero|split|grid|minimal
  categoryId   String
  category     Category @relation(fields: [categoryId], references: [id])
  desktopKey   String?                 // S3 object key (없으면 목업)
  mobileKey    String?
  thumbKey     String?
  createdAt    DateTime @default(now())
  orders       Order[]
}

// ── ③ 주문/결제 ──
model User {                            // 고객(소셜) + 관리자(고정)
  id           String   @id @default(cuid())
  email        String?                    // 일부 소셜은 미제공 가능
  name         String
  avatarUrl    String?
  role         Role     @default(CUSTOMER)
  provider     String                     // kakao|google|naver|local(admin)
  providerId   String                     // 소셜 고유 ID (admin은 이메일)
  passwordHash String?                    // 관리자 고정계정용
  orders       Order[]
  rooms        ChatRoom[]
  createdAt    DateTime @default(now())
  @@unique([provider, providerId])
}
enum Role { CUSTOMER ADMIN }

model Order {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  showcaseId String
  showcase   Showcase @relation(fields: [showcaseId], references: [id])
  plan       String                     // basic|pro 등
  amount     Int                        // KRW
  status     OrderStatus @default(PENDING)
  payment    Payment?
  createdAt  DateTime @default(now())
}
enum OrderStatus { PENDING PAID CANCELLED FAILED }

model Payment {
  id          String   @id @default(cuid())
  orderId     String   @unique
  order       Order    @relation(fields: [orderId], references: [id])
  provider    String                    // portone
  providerTxId String?
  amount      Int
  status      String
  createdAt   DateTime @default(now())
}

// ── ④ 채팅 ──
model ChatRoom {
  id        String   @id @default(cuid())
  userId    String                       // 고객
  user      User     @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Message {
  id        String   @id @default(cuid())
  roomId    String
  room      ChatRoom @relation(fields: [roomId], references: [id])
  senderType String                      // CUSTOMER|ADMIN
  body      String
  readAt    DateTime?
  createdAt DateTime @default(now())
}
```

---

## 7. 서브프로젝트 상세

### ① 데이터 토대 (기반)
- **목표**: 정적 `showcase.ts` → DB. API로 카테고리/쇼케이스 제공.
- **범위**:
  - 모노레포 전환(web 이전), docker-compose, Prisma 스키마(Category/Showcase), 시드(기존 40개 데이터 이관)
  - API: `GET /api/categories`, `GET /api/showcases?category=&cursor=&limit=`(커서 페이지네이션)
  - web: 기존 정적 import → React Query로 API 호출 전환(기능 동일 유지)
- **완료 기준**: 기존 화면이 DB 기반으로 동일 동작 + API 통합테스트 통과.

### ② 갤러리 + 클라우드 스토리지
- **목표**: `/gallery` 신규 라우트 — 전체 보기 + 가상화 무한스크롤 + 실제 이미지.
- **범위**:
  - MinIO 버킷, 업로드 스크립트(`api`): 69개 이미지 → S3 key를 Showcase에 연결
  - `GET /api/showcases` 커서 무한스크롤(React Query `useInfiniteQuery`)
  - `@tanstack/react-virtual`로 그리드 가상화(보이는 행만 렌더)
  - presigned GET URL 또는 공개 URL로 이미지 서빙
- **완료 기준**: 수백 개를 스크롤해도 부드럽고 DOM 노드 일정. Lighthouse 양호.

### ③ 주문 + 결제
- **목표**: 쇼케이스/플랜 선택 → 주문 생성 → 결제 → 상태 갱신.
- **체크아웃 모델**: **로그인 후 주문**(소셜로그인 필수). 비회원 게스트 결제 미지원.
  - 근거: 랜딩페이지 제작은 며칠~몇 주짜리 프로젝트라, 채팅 소통·진행상태 조회를 위해 고객 식별이 필요. 소셜로그인이라 마찰도 낮음. 게스트 흐름(주문번호 조회·회원전환)을 만들지 않아 코드도 단순.
- **범위**: 인증(소셜로그인 → JWT), 주문 전 로그인 가드, `POST /api/orders`, **PortOne** 결제 연동, 결제 검증/웹훅, 주문내역 화면.
- **완료 기준**: 비로그인 시 주문 진입 차단 → 로그인 유도. 테스트 결제 성공 시 Order=PAID, 실패/취소 흐름 처리. 결제 금액 검증은 서버에서(위변조 방지).

### ④ 실시간 채팅
- **목표**: 고객 ↔ 관리자 1:1 문의 채팅.
- **범위**: Socket.IO 룸(roomId), 메시지 영속화(Message), 미읽음/타이핑 표시, 재연결, 관리자 인박스.
- **완료 기준**: 두 브라우저 간 실시간 송수신 + 새로고침 후 히스토리 유지.

---

## 8. 횡단 관심사

- **인증/인가**: 고객=소셜로그인(OAuth, Passport.js) → JWT(httpOnly 쿠키). 관리자=고정 계정. `requireAuth` / `requireRole(ADMIN)` 미들웨어. ②까지는 불필요, ③에서 도입.
- **검증**: 모든 입력 Zod 검증(`packages/shared` 스키마 재사용) → 프론트/백 단일 소스.
- **에러 처리**: 중앙 에러 미들웨어, 일관된 `{ error: { code, message } }` 응답. 프론트는 React Query 에러 바운더리.
- **로깅**: pino(요청 로그 + 에러).
- **테스트**: api는 Vitest + supertest(라우트), 서비스 단위테스트; web은 필터/페이지네이션 로직 + 모달 접근성.
- **접근성**: 모달 포커스 트랩/ESC(현재 ESC만 → 트랩 추가), 키보드 내비.
- **환경변수**: `.env.example` 제공, 비밀은 커밋 금지.

---

## 9. 로드맵 (순서)

1. **① 토대** — 모노레포·Docker·Prisma·시드·기본 API·web 연동
2. **② 갤러리/스토리지** — MinIO 업로드·무한쿼리·가상화·신규 라우트
3. **③ 주문/결제** — 인증·주문·결제 연동
4. **④ 채팅** — Socket.IO·메시지 영속화·관리자 인박스

각 단계는 **독립 스펙 → 구현계획(writing-plans) → 구현 → 검증**의 사이클을 따른다.
본 문서는 ① 착수 전 전체 그림을 고정하기 위한 마스터 계획서다.

---

## 10. 확정된 결정 / 리스크

**확정**
- **결제 PG**: **PortOne(구 아임포트) 테스트모드**. 서버에서 결제금액 검증 + 웹훅 처리.
- **인증**: 고객 = **소셜로그인 카카오·구글·네이버**(Passport.js OAuth → JWT httpOnly 쿠키). 이메일+비번 회원가입은 미지원. 관리자 = `local` provider 고정 계정 1개(시드).
- **체크아웃**: **로그인 후 주문**(게스트 결제 미지원). 사유는 §7-③ 참고. 추후 "구매 전 상담 채팅"을 비회원에 열지는 ④에서 결정.
  - OAuth 콜백: `GET /api/auth/:provider`(시작) → `GET /api/auth/:provider/callback`(콜백, JWT 발급 후 web으로 리다이렉트). 각 provider OAuth 앱 등록 + redirect URI(`http://localhost:4000/api/auth/:provider/callback`) 필요.

**리스크 / 추후**
- **OAuth 앱 등록**: 카카오/구글/네이버 개발자 콘솔에서 클라이언트ID·시크릿 발급 필요(사용자 작업). 미발급 provider는 비활성 처리.
- **배포(추후)**: 로컬 Docker로 시작하되, 이후 web=Vercel / api=Railway·Render·Fly / DB=Neon·Supabase / 스토리지=S3·Cloudflare R2로 이전 가능(코드 변경 최소). OAuth redirect URI도 배포 도메인으로 갱신 필요.
- **모노레포 전환 비용**: 기존 web을 `apps/web`으로 옮기며 import 경로/설정 조정 필요(① 범위에 포함).

---

## 부록 — 현재(확장 전) 상태
- Next.js 16 + TS + Tailwind, 정적 `src/data/showcase.ts`(40개), 플레이스홀더 목업, 모달 미리보기, 태그 필터, 5박스 페이지 슬라이더. 빌드 통과 확인됨.
```
