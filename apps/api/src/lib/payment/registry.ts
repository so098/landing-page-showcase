import { env } from "../env.js";
import type { PaymentGateway } from "./gateway.js";
import { createPortOneGateway } from "./portone.js";

// env에서 gateway를 빌드. 키가 없으면 null(부팅 경고 + 결제 버튼 비활성).
function buildFromEnv(): PaymentGateway | null {
  if (env.PORTONE_API_SECRET && env.PORTONE_WEBHOOK_SECRET) {
    return createPortOneGateway({
      apiSecret: env.PORTONE_API_SECRET,
      storeId: env.PORTONE_STORE_ID,
      webhookSecret: env.PORTONE_WEBHOOK_SECRET,
    });
  }
  console.warn("[payment] PORTONE_API_SECRET/WEBHOOK_SECRET 미설정 — 결제 비활성");
  return null;
}

let gateway: PaymentGateway | null | undefined;
// 테스트 주입용 override. undefined면 미설정, gateway면 주입.
let override: PaymentGateway | null | undefined;

// PG gateway를 얻는다. 미설정이면 null.
export function getGateway(): PaymentGateway | null {
  if (override !== undefined) return override;
  if (gateway === undefined) gateway = buildFromEnv();
  return gateway;
}

// 결제 활성 여부 — web 결제 버튼 활성 판단에 쓴다.
export function isPaymentEnabled(): boolean {
  return getGateway() !== null;
}

// ── 테스트 전용 주입 ──
export function setGatewayForTest(g: PaymentGateway | null): void {
  override = g;
}

export function resetGatewayForTest(): void {
  override = undefined;
}
