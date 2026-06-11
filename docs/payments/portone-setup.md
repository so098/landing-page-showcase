# PortOne 결제 외부 설정 가이드

날짜: 2026-06-11
대상: 사장님(가맹점 소유자) — 콘솔 가입/키 발급은 코드로 대신할 수 없다.

코드 경로(주문 생성·서버 검증·멱등·웹훅·환불·마이페이지)는 모두 구현되어 있다.
아래 키만 발급해 `.env`에 넣으면 실제 결제가 동작한다. **키가 없으면 결제는 자동
비활성**되고(부팅 시 `console.warn`), 주문서는 **결제 없이 바로 생성**으로 폴백한다.

---

## 1. PortOne 가입 & 테스트 채널

1. https://admin.portone.io 가입 → 콘솔.
2. **결제 연동 → 채널 관리**에서 **테스트 채널** 추가(카드 PG 연결, 테스트 가맹점).
   - `Store ID`(상점 아이디), `Channel Key`(채널 키) 확보.
3. **결제 연동 → 식별코드·API Keys**에서 **V2 API Secret** 발급(서버 전용).

## 2. 웹훅 등록

1. 콘솔 **결제 연동 → 웹훅**에서 엔드포인트 등록:
   - dev: 로컬(4000)은 외부에서 못 부르므로 **ngrok 등으로 터널** →
     `https://<ngrok>.ngrok.io/api/payments/webhook`
   - prod: `https://<api-도메인>/api/payments/webhook`
2. 등록 시 발급되는 **웹훅 시크릿**을 확보.
3. 구독 이벤트: 최소 **결제 완료(Transaction.Paid)**.

## 3. .env 설정

루트 `.env`(apps/api가 읽음) — `.env.example` 참고:

```bash
PORTONE_API_SECRET=...        # V2 API Secret (서버 전용)
PORTONE_STORE_ID=...          # 상점 아이디
PORTONE_WEBHOOK_SECRET=...    # 웹훅 서명검증 시크릿
```

apps/web(공개 가능 값만 — 시크릿 금지):

```bash
NEXT_PUBLIC_PORTONE_STORE_ID=...
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=...
```

## 4. prod 주의사항

- ECS 태스크 환경변수 + **SSM SecureString**으로 시크릿 주입(`DATABASE_URL` 패턴과 동일).
- Vercel 환경변수에 `NEXT_PUBLIC_PORTONE_*` 설정.
- 실서비스 전환 시 가맹점 심사·정산계좌·PG 계약 필요(테스트모드는 불필요).

---

## 설계상 신뢰 경계 (요약)

- **금액은 서버가 단일 소스로 재계산**(`calcAmount`) — 클라가 보낸 금액은 절대 신뢰 안 함.
- 결제 확정은 **PG 단건조회로 금액/상태를 대조**한 뒤에만(`pg.amount === order.amount && pg.status === PAID`).
- **콜백 + 웹훅 이중 확정** — `markPaid`의 원자적 조건부 업데이트로 단 하나만 승자.
- 환불은 **전액**만(`POST /api/orders/:id/refund`, 소유자 확인).

## 수동 스모크 테스트 절차

자동 테스트(서비스/라우트/web lib)는 fake gateway로 흐름을 검증한다. 실제 PG 연동은
키 발급 후 아래로 1회 확인한다.

1. 위 키를 `.env`에 넣고 `npm start`(api 4000 + web 3000) + ngrok로 웹훅 터널.
2. 로그인(구글/카카오) → `/order` 주문서 작성 → **생성하기**.
3. PortOne 테스트 결제창에서 테스트 카드로 결제.
4. 결제 성공 → 생성 진행 → `/order/result`. **마이페이지**에 주문이 PAID로 보이면 성공.
5. 결과 페이지 **환불하기** → 전액 환불 → 마이페이지 상태가 REFUNDED로 바뀌는지 확인.
6. 위변조 테스트: 클라에서 금액을 조작해도 서버가 `PAYMENT_VERIFICATION_FAILED`로 거부.
