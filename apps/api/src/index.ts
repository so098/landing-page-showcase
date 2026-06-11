import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { attachChatGateway } from "./sockets/chat.gateway.js";
import { env } from "./lib/env.js";
import { setOnPaidHook } from "./services/payment.service.js";
import { generateForOrder } from "./services/aiLanding.service.js";
import { linkGeneratedJob } from "./services/order.service.js";

// 결제 확정 후 생성 트리거(비동기 fire-and-forget) — 확정 응답/웹훅 200을 막지 않는다.
// 전이 승자일 때만 호출되므로 이중 생성은 일어나지 않는다. 생성 완료 시 jobId를 주문에 연결.
setOnPaidHook((order) => {
  void (async () => {
    try {
      const { result } = await generateForOrder(order.orderSnapshot);
      await linkGeneratedJob(order.id, result.jobId);
    } catch (err) {
      console.error(`[payment] 결제 후 생성 실패 orderId=${order.id}:`, err);
    }
  })();
});

const app = createApp();
// Socket.IO(채팅)를 같은 HTTP 서버에 부착
const httpServer = createServer(app);
attachChatGateway(httpServer);

httpServer.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT} (http + socket.io)`);
});
