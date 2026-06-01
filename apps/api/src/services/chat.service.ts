import type { ChatMessage, ChatRoom, SenderType } from "@melstudio/shared";
import { prisma } from "../lib/prisma.js";

// DB Message 행 → 퍼블릭 ChatMessage
function toMessage(row: {
  id: string;
  roomId: string;
  senderType: string;
  body: string;
  createdAt: Date;
}): ChatMessage {
  return {
    id: row.id,
    roomId: row.roomId,
    senderType: row.senderType as SenderType,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

// 방 조회 또는 생성 (visitorId당 1개)
export async function getOrCreateRoom(visitorId: string, visitorName: string) {
  const room = await prisma.chatRoom.upsert({
    where: { visitorId },
    update: { visitorName }, // 표시명이 바뀌었으면 갱신
    create: { visitorId, visitorName },
  });
  return { id: room.id, visitorId: room.visitorId, visitorName: room.visitorName };
}

// 메시지 저장 (방 updatedAt 갱신 포함)
export async function saveMessage(
  roomId: string,
  senderType: SenderType,
  body: string,
): Promise<ChatMessage> {
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { roomId, senderType, body } }),
    prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } }),
  ]);
  return toMessage(message);
}

// 방 메시지 히스토리 (시간순)
export async function getMessages(roomId: string): Promise<ChatMessage[]> {
  const rows = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMessage);
}

// 관리자 인박스용 방 목록 (마지막 메시지 + 미읽음 수, 최신 활동순)
export async function listRooms(): Promise<ChatRoom[]> {
  const rooms = await prisma.chatRoom.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: { where: { senderType: "CUSTOMER", readAt: null } },
        },
      },
    },
  });

  return rooms.map((r) => ({
    id: r.id,
    visitorId: r.visitorId,
    visitorName: r.visitorName,
    lastMessage: r.messages[0] ? toMessage(r.messages[0]) : null,
    unreadCount: r._count.messages,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

// 관리자가 방을 열면 고객 메시지 읽음 처리
export async function markRead(roomId: string): Promise<void> {
  await prisma.message.updateMany({
    where: { roomId, senderType: "CUSTOMER", readAt: null },
    data: { readAt: new Date() },
  });
}
