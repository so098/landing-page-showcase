# 실시간 채팅 (고객 ↔ 관리자) — 설계서

- 작성일: 2026-06-01
- 상태: 설계 승인됨
- 상위 문서: [2026-05-29-fullstack-platform-design.md](2026-05-29-fullstack-platform-design.md) — 마스터 스펙 ④
- 선행 작업: ① 데이터 토대, ②-a 무한스크롤, 주문서/생성 목 플로우

---

## 1. 목표

고객 ↔ 관리자 1:1 실시간 문의 채팅. **전화/카톡 연락 안내(목)를 전부 대체**한다.

**범위 (이번 단계 — 진짜 구현)**
- Socket.IO 실시간 송수신 + 메시지 DB 영속화 (새로고침 후 히스토리 유지)
- 고객용: 우측 하단 플로팅 채팅 위젯 (모든 페이지)
- 관리자용: `/admin/chat` 인박스 (방 목록 + 채팅)
- 기존 흐름 통합: "사람에게 ~하기" 클릭 → 채팅창 즉시 열림 (전화 안내 모달/문구 삭제)

**범위 제외**
- 실제 OAuth 인증 (목 로그인 식별 사용, 구조는 교체 가능하게)
- 푸시 알림, 파일 전송, 관리자 페이지 보호

---

## 2. 사용자 식별 (인증 없이)

| 역할 | 식별 방법 |
|---|---|
| 고객 | localStorage에 브라우저별 고유 ID(`melstudio:visitor-id`, cuid 형태) 생성·저장. 목 로그인 이름이 있으면 표시명으로 사용 |
| 관리자 | `/admin/chat` 접근 = 관리자 (MVP, 추후 OAuth로 보호) |

→ 추후 진짜 로그인이 붙으면 visitor-id 대신 user-id를 쓰면 됨 (스키마 변경 없음).

---

## 3. 데이터 모델 (Prisma 추가)

```prisma
model ChatRoom {
  id          String    @id @default(cuid())
  visitorId   String    @unique   // 고객 브라우저 고유 ID (1고객 1방)
  visitorName String              // 표시명 (목 로그인 이름 or "방문자")
  messages    Message[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Message {
  id         String   @id @default(cuid())
  roomId     String
  room       ChatRoom @relation(fields: [roomId], references: [id])
  senderType String   // CUSTOMER | ADMIN
  body       String
  readAt     DateTime?
  createdAt  DateTime @default(now())

  @@index([roomId, createdAt])
}
```

---

## 4. 백엔드 (apps/api)

```
Socket.IO 서버: http.createServer(app)에 부착, CORS는 WEB_ORIGIN
이벤트:
  (클라→서버) room:join { visitorId, visitorName }   → 방 생성/조회 후 join, roomId 반환
  (클라→서버) message:send { roomId, senderType, body } → DB 저장 후 방에 브로드캐스트
  (서버→클라) message:new { id, roomId, senderType, body, createdAt }
  (클라→서버) admin:join                                → 관리자: 모든 방 이벤트 수신용 룸 join
  (서버→클라) room:updated { room }                     → 관리자 인박스 갱신용

REST (히스토리/인박스 — Socket 연결 전 초기 로드용):
  GET /api/chat/rooms                  → 방 목록 (마지막 메시지·미읽음 수 포함, 관리자용)
  GET /api/chat/rooms/:id/messages     → 방 메시지 히스토리
서비스: chat.service.ts (방 생성/조회, 메시지 저장/조회 — 단위 테스트 대상)
```

---

## 5. 프론트 (apps/web)

```
lib/chat.ts            visitor-id 생성/조회, socket.io-client 싱글톤
components/ChatWidget.tsx  우측 하단 플로팅 버튼 + 채팅 패널 (열림/닫힘, 메시지 목록, 입력)
app/admin/chat/page.tsx    관리자 인박스 (방 목록 + 선택한 방 채팅)
```

**ChatWidget 동작**
- 모든 페이지 우측 하단 플로팅 버튼 (layout에 마운트)
- 클릭 → 패널 열림 → room:join → 히스토리 로드 → 실시간 송수신
- 외부에서 열기: `openChat(초기메시지?)` 전역 함수 (커스텀 이벤트) — 초기 메시지가 있으면 자동 전송

**기존 흐름 통합 (전화 안내 삭제 → 채팅으로 대체)**
| 위치 | 기존 | 변경 |
|---|---|---|
| 주문서 "사람에게 주문하기" | 완료 화면 "카톡으로 연락드려요" | 채팅창 열림 + 자동 메시지 "[사람 주문] {업체명} 랜딩페이지 제작 문의드려요" |
| 수정 모달 "사람에게 말해가며 수정하기" | "OOO으로 연락드리겠습니다" 모달 | 채팅창 열림 + 자동 메시지 "[수정 문의] {업체명} 페이지 수정 문의드려요" |
| 결과 "이대로 완료하기" | "OOO으로 연락드리겠습니다" 모달 | 모달 유지하되 전화 문구 삭제 → "도메인·호스팅 연결은 채팅으로 도와드려요" + 채팅 열기 버튼 |

---

## 6. 완료 기준 (포트폴리오 데모 시나리오)

1. 브라우저 A(고객): 주문서 → 사람에게 주문하기 → 우측 하단 채팅창 자동 열림 + 자동 메시지 전송
2. 브라우저 B(관리자): `/admin/chat` → 방 목록에 해당 고객 표시 → 답장
3. 브라우저 A: 답장이 **실시간으로** 채팅창에 나타남
4. 양쪽 모두 새로고침해도 대화 히스토리 유지

## 7. 테스트

- API: chat.service 단위 테스트 (방 생성/조회/메시지 저장), REST 라우트 테스트
- Socket.IO: socket.io-client로 통합 테스트 (메시지 송수신 왕복)
- 수동: 위 데모 시나리오
