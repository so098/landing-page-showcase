import { PortOneClient, Webhook } from "@portone/server-sdk";
import type { PaymentGateway, PgPayment, PgWebhookEvent } from "./gateway.js";

export type PortOneConfig = {
  apiSecret: string;
  storeId?: string;
  webhookSecret: string;
};

// PortOne v2 구현. 시크릿은 서버에만 존재한다.
// 보안상 민감한 부분(웹훅 서명검증)은 SDK의 Webhook.verify에 위임한다(직접 HMAC 구현은 부채).
export function createPortOneGateway(config: PortOneConfig): PaymentGateway {
  const client = PortOneClient({ secret: config.apiSecret, storeId: config.storeId });

  return {
    async getPayment(paymentId: string): Promise<PgPayment> {
      const p = await client.payment.getPayment({ paymentId });
      // PaidPayment 등 status별 union — 공통 필드만 안전하게 추출.
      const anyP = p as {
        status: string;
        id?: string;
        amount?: { total?: number };
        method?: { type?: string };
        paidAt?: string;
        customData?: string;
      };
      return {
        status: anyP.status,
        amount: anyP.amount?.total ?? 0,
        paymentId: anyP.id ?? paymentId,
        orderId: parseOrderId(anyP.customData),
        method: anyP.method?.type ?? null,
        paidAt: anyP.paidAt ?? null,
        raw: p,
      };
    },

    async cancelPayment(paymentId: string, reason: string): Promise<void> {
      // amount 미지정 → 전액 취소.
      await client.payment.cancelPayment({ paymentId, reason });
    },

    async verifyWebhook(
      rawBody: string,
      headers: Record<string, string | string[] | undefined>,
    ): Promise<PgWebhookEvent> {
      // 검증 실패 시 WebhookVerificationError throw(라우트가 4xx 처리).
      const event = (await Webhook.verify(config.webhookSecret, rawBody, headers)) as {
        type: string;
        data?: { paymentId?: string };
      };
      return {
        type: event.type,
        paymentId: event.data?.paymentId ?? null,
      };
    },
  };
}

// customData(JSON 문자열)에서 우리 Order.id를 안전하게 파싱.
function parseOrderId(customData: string | undefined): string | null {
  if (!customData) return null;
  try {
    const parsed = JSON.parse(customData) as { orderId?: string };
    return typeof parsed.orderId === "string" ? parsed.orderId : null;
  } catch {
    return null;
  }
}
