import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import type { Server } from "socket.io";
import request from "supertest";
import { createApp } from "../app";
import { attachChatGateway } from "./chat.gateway";

let httpServer: HttpServer;
let io: Server;
let port: number;
let customer: ClientSocket;
let admin: ClientSocket;

beforeAll(async () => {
  httpServer = createServer(createApp());
  io = attachChatGateway(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  customer?.disconnect();
  admin?.disconnect();
  io.close();
  httpServer.close();
});

describe("chat gateway (socket.io)", () => {
  it("고객이 room:join 후 보낸 메시지가 실시간으로 돌아온다", async () => {
    customer = ioc(`http://localhost:${port}`, { transports: ["websocket"] });

    // 방 입장
    const room = await new Promise<{ id: string }>((resolve) => {
      customer.emit(
        "room:join",
        { visitorId: `test-visitor-socket-${Date.now()}`, visitorName: "소켓테스터" },
        resolve,
      );
    });
    expect(room.id).toBeTypeOf("string");

    // 메시지 전송 → 같은 방에 브로드캐스트 수신
    const received = new Promise<{ body: string; senderType: string }>((resolve) => {
      customer.on("message:new", resolve);
    });
    customer.emit("message:send", {
      roomId: room.id,
      senderType: "CUSTOMER",
      body: "실시간 테스트 메시지",
    });

    const msg = await received;
    expect(msg.body).toBe("실시간 테스트 메시지");
    expect(msg.senderType).toBe("CUSTOMER");
  });

  it("관리자가 같은 방에 들어오면 고객 메시지를 실시간으로 받는다", async () => {
    const visitorId = `test-visitor-socket-admin-${Date.now()}`;
    customer = ioc(`http://localhost:${port}`, { transports: ["websocket"] });
    admin = ioc(`http://localhost:${port}`, { transports: ["websocket"] });

    const room = await new Promise<{ id: string }>((resolve) => {
      customer.emit("room:join", { visitorId, visitorName: "고객" }, resolve);
    });

    // 관리자: 인박스 + 해당 방 입장
    await new Promise<void>((resolve) => admin.emit("admin:join", resolve));
    await new Promise<void>((resolve) =>
      admin.emit("admin:openRoom", { roomId: room.id }, resolve),
    );

    // 고객 메시지 → 관리자에게 도착
    const adminReceived = new Promise<{ body: string }>((resolve) => {
      admin.on("message:new", resolve);
    });
    customer.emit("message:send", {
      roomId: room.id,
      senderType: "CUSTOMER",
      body: "관리자님 계신가요?",
    });

    const msg = await adminReceived;
    expect(msg.body).toBe("관리자님 계신가요?");
  });
});

describe("chat REST routes", () => {
  it("GET /api/chat/rooms 는 방 목록을 반환한다", async () => {
    const res = await request(createApp()).get("/api/chat/rooms");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/chat/rooms/:id/messages 는 메시지 배열을 반환한다", async () => {
    // 위 소켓 테스트에서 만든 방 중 하나 사용
    const rooms = await request(createApp()).get("/api/chat/rooms");
    const testRoom = rooms.body.find((r: { visitorId: string }) =>
      r.visitorId.startsWith("test-visitor-socket-"),
    );
    expect(testRoom).toBeDefined();

    const res = await request(createApp()).get(`/api/chat/rooms/${testRoom.id}/messages`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
