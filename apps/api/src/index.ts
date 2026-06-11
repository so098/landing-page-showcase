import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { attachChatGateway } from "./sockets/chat.gateway.js";
import { env } from "./lib/env.js";

// 참고: 결제 확정 후 생성 트리거(setOnPaidHook) 시드 지점.
// 현재 MVP는 결제 성공 직후 web이 생성을 호출(즉시 결과 표시)하므로 서버 훅은 비워둔다.
// 추후 "웹훅만으로도 생성 보장(브라우저 종료 대비)"이 필요해지면 여기서
// generateForOrder + linkGeneratedJob을 비동기로 주입한다(seam은 payment.service에 준비됨).

const app = createApp();
// Socket.IO(채팅)를 같은 HTTP 서버에 부착
const httpServer = createServer(app);
attachChatGateway(httpServer);

httpServer.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT} (http + socket.io)`);
});
