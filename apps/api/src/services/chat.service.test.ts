import { describe, it, expect, beforeAll } from "vitest";
import {
  getOrCreateRoom,
  saveMessage,
  getMessages,
  listRooms,
  markRead,
} from "./chat.service";
import { prisma } from "../lib/prisma";

// 테스트마다 고유한 visitorId를 써서 시드/다른 테스트와 격리
const vid = (suffix: string) => `test-visitor-${Date.now()}-${suffix}`;

beforeAll(async () => {
  // 이전 테스트 실행이 남긴 테스트용 방 정리
  const stale = await prisma.chatRoom.findMany({
    where: { visitorId: { startsWith: "test-visitor-" } },
    select: { id: true },
  });
  const ids = stale.map((r) => r.id);
  await prisma.message.deleteMany({ where: { roomId: { in: ids } } });
  await prisma.chatRoom.deleteMany({ where: { id: { in: ids } } });
});

describe("getOrCreateRoom", () => {
  it("새 visitorId면 방을 만들고, 같은 visitorId면 같은 방을 반환한다", async () => {
    const id = vid("room");
    const first = await getOrCreateRoom(id, "테스터");
    const second = await getOrCreateRoom(id, "테스터");
    expect(first.id).toBe(second.id);
    expect(first.visitorName).toBe("테스터");
  });
});

describe("saveMessage + getMessages", () => {
  it("메시지를 저장하고 시간순으로 조회한다", async () => {
    const room = await getOrCreateRoom(vid("msg"), "테스터");
    await saveMessage(room.id, "CUSTOMER", "안녕하세요");
    await saveMessage(room.id, "ADMIN", "무엇을 도와드릴까요?");

    const messages = await getMessages(room.id);
    expect(messages.length).toBe(2);
    expect(messages[0].body).toBe("안녕하세요");
    expect(messages[0].senderType).toBe("CUSTOMER");
    expect(messages[1].senderType).toBe("ADMIN");
    expect(typeof messages[0].createdAt).toBe("string");
  });
});

describe("listRooms", () => {
  it("방 목록에 마지막 메시지와 미읽음 수를 포함한다", async () => {
    const room = await getOrCreateRoom(vid("list"), "인박스테스터");
    await saveMessage(room.id, "CUSTOMER", "문의드려요");
    await saveMessage(room.id, "CUSTOMER", "계신가요?");

    const rooms = await listRooms();
    const found = rooms.find((r) => r.id === room.id);
    expect(found).toBeDefined();
    expect(found!.lastMessage?.body).toBe("계신가요?");
    expect(found!.unreadCount).toBe(2); // 고객 메시지 2개 미읽음
    expect(found!.visitorName).toBe("인박스테스터");
  });
});

describe("markRead", () => {
  it("방의 고객 메시지를 읽음 처리하면 미읽음이 0이 된다", async () => {
    const room = await getOrCreateRoom(vid("read"), "테스터");
    await saveMessage(room.id, "CUSTOMER", "읽어주세요");

    await markRead(room.id);

    const rooms = await listRooms();
    const found = rooms.find((r) => r.id === room.id);
    expect(found!.unreadCount).toBe(0);
  });
});
