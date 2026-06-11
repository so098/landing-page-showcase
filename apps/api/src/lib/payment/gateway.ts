// PG 추상화 (OAuth의 OAuthProvider와 동일 패턴).
// 라우트/서비스 로직을 실제 PG 콘솔·네트워크 없이 테스트하기 위한 경계.
// 테스트에서는 이 인터페이스를 구현한 fake를 registry에 주입한다.
// PG 교체(PortOne↔토스) 시에도 이 경계 뒤만 갈아끼우면 된다.

// PG 단건조회 결과(정규화). amount는 총 결제금액(원).
export type PgPayment = {
  status: "PAID" | "CANCELLED" | "FAILED" | "PENDING" | "READY" | string;
  amount: number;
  paymentId: string;
  orderId: string | null; // customData에 실어 보낸 우리 Order.id (교차검증용, 없을 수 있음)
  method: string | null;
  paidAt: string | null;
  raw: unknown; // 감사/디버깅용 원문
};

// 검증된 웹훅 이벤트(정규화).
export type PgWebhookEvent = {
  type: string; // 예: "Transaction.Paid"
  paymentId: string | null;
};

export interface PaymentGateway {
  // PG 단건조회 — 서버 시크릿으로 결제 상태/금액을 직접 확인(클라 불신).
  getPayment(paymentId: string): Promise<PgPayment>;
  // 결제취소/환불 — amount 미지정이면 전액.
  cancelPayment(paymentId: string, reason: string): Promise<void>;
  // 웹훅 위조 검증 후 이벤트 파싱. 검증 실패 시 throw.
  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<PgWebhookEvent>;
}
