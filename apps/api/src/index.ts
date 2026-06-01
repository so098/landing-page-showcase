import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { attachChatGateway } from "./sockets/chat.gateway.js";
import { env } from "./lib/env.js";

const app = createApp();
// Socket.IO(채팅)를 같은 HTTP 서버에 부착
const httpServer = createServer(app);
attachChatGateway(httpServer);

httpServer.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT} (http + socket.io)`);
});
