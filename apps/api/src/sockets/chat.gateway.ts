import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { SenderType } from "@melstudio/shared";
import { env } from "../lib/env.js";
import {
  getOrCreateRoom,
  saveMessage,
  markRead,
  listRooms,
} from "../services/chat.service.js";

// 관리자 전용 브로드캐스트 룸 이름
const ADMIN_ROOM = "admin:inbox";

// Socket.IO 게이트웨이 — HTTP 서버에 부착해 채팅 이벤트를 처리한다.
export function attachChatGateway(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  io.on("connection", (socket) => {
    // ── 고객: 방 입장 (없으면 생성) ──
    socket.on(
      "room:join",
      async (
        payload: { visitorId: string; visitorName: string },
        ack?: (room: { id: string }) => void,
      ) => {
        try {
          const room = await getOrCreateRoom(
            payload.visitorId,
            payload.visitorName || "방문자",
          );
          await socket.join(room.id);
          ack?.({ id: room.id });
        } catch (err) {
          console.error("[chat] room:join error:", err);
        }
      },
    );

    // ── 관리자: 인박스 입장 (모든 방 갱신 이벤트 수신) ──
    socket.on("admin:join", async (ack?: () => void) => {
      await socket.join(ADMIN_ROOM);
      ack?.();
    });

    // ── 관리자: 특정 방 입장 + 읽음 처리 ──
    socket.on("admin:openRoom", async (payload: { roomId: string }, ack?: () => void) => {
      try {
        await socket.join(payload.roomId);
        await markRead(payload.roomId);
        // 인박스 미읽음 갱신
        io.to(ADMIN_ROOM).emit("rooms:updated", await listRooms());
        ack?.();
      } catch (err) {
        console.error("[chat] admin:openRoom error:", err);
      }
    });

    // ── 메시지 전송 (고객/관리자 공통) ──
    socket.on(
      "message:send",
      async (
        payload: { roomId: string; senderType: SenderType; body: string },
        ack?: (ok: boolean) => void,
      ) => {
        try {
          const body = payload.body?.trim();
          if (!body) return ack?.(false);

          const message = await saveMessage(payload.roomId, payload.senderType, body);
          // 해당 방의 모든 참가자(고객 + 방에 들어온 관리자)에게 전송
          io.to(payload.roomId).emit("message:new", message);
          // 관리자 인박스 목록 갱신 (새 메시지 미리보기/미읽음)
          io.to(ADMIN_ROOM).emit("rooms:updated", await listRooms());
          ack?.(true);
        } catch (err) {
          console.error("[chat] message:send error:", err);
          ack?.(false);
        }
      },
    );
  });

  return io;
}
