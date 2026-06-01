"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChatMessage, ChatRoom } from "@melstudio/shared";
import { getSocket, fetchRooms, fetchMessages } from "@/lib/chat";

// 관리자 채팅 인박스 — 방 목록 + 선택한 방 실시간 채팅.
// (MVP: 별도 인증 없이 접근. 실제 OAuth 도입 시 보호 예정)
export default function AdminChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = activeRoom?.id ?? null;

  // ── 초기 로드: 방 목록 + 관리자 룸 입장 ──
  useEffect(() => {
    const socket = getSocket();

    fetchRooms()
      .then(setRooms)
      .catch(() => setLoadError(true));

    const join = () => {
      setConnected(true);
      socket.emit("admin:join", () => {});
      // 재연결 시 보고 있던 방 다시 입장
      if (activeRoomIdRef.current) {
        socket.emit("admin:openRoom", { roomId: activeRoomIdRef.current }, () => {});
      }
    };

    const onRoomsUpdated = (updated: ChatRoom[]) => setRooms(updated);
    const onMessage = (msg: ChatMessage) => {
      if (msg.roomId === activeRoomIdRef.current) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
      }
    };
    const onDisconnect = () => setConnected(false);

    socket.on("connect", join);
    socket.on("rooms:updated", onRoomsUpdated);
    socket.on("message:new", onMessage);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) join();

    return () => {
      socket.off("connect", join);
      socket.off("rooms:updated", onRoomsUpdated);
      socket.off("message:new", onMessage);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // ── 방 선택 ──
  const openRoom = useCallback(async (room: ChatRoom) => {
    setActiveRoom(room);
    setMessages([]);
    try {
      setMessages(await fetchMessages(room.id));
    } catch {
      // 히스토리 실패해도 실시간은 동작
    }
    getSocket().emit("admin:openRoom", { roomId: room.id }, () => {});
  }, []);

  // ── 답장 전송 ──
  function send() {
    const text = input.trim();
    if (!text || !activeRoom) return;
    setInput("");
    getSocket().emit("message:send", {
      roomId: activeRoom.id,
      senderType: "ADMIN",
      body: text,
    });
  }

  // 새 메시지 시 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const timeOf = (iso: string) =>
    new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      {/* ── 관리자 헤더 ── */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white shadow-petal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7.5-4.6-10-9.2C.4 8.7 2 5 5.5 5c2 0 3.4 1.1 4.2 2.4l.8 1.3.8-1.3C12.1 6.1 13.5 5 15.5 5 19 5 20.6 8.7 22 11.8 19.5 16.4 12 21 12 21z" />
            </svg>
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">
            멜스튜디오 <span className="text-crimson">관리자</span>
          </span>
        </Link>
        <p className="flex items-center gap-1.5 text-xs text-wine/50">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-rose/40"}`} />
          {connected ? "실시간 연결됨" : "연결 중…"}
        </p>
      </header>

      {/* ── 인박스 본문 ── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-10">
        <div className="flex h-[calc(100vh-160px)] min-h-[480px] overflow-hidden rounded-3xl border border-rose/15 bg-cream shadow-petal">
          {/* 방 목록 */}
          <aside className="flex w-full max-w-[300px] flex-col border-r border-rose/10 bg-white/50">
            <div className="border-b border-rose/10 px-5 py-4">
              <h1 className="font-display text-base font-extrabold text-ink">문의 인박스</h1>
              <p className="mt-0.5 text-xs text-wine/50">{rooms.length}개의 대화</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadError ? (
                <p className="px-5 py-10 text-center text-xs text-wine/50">
                  목록을 불러오지 못했어요.
                  <br />
                  API 서버(4000)를 확인해 주세요.
                </p>
              ) : rooms.length === 0 ? (
                <p className="px-5 py-10 text-center text-xs text-wine/50">
                  아직 문의가 없어요.
                </p>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => openRoom(room)}
                    className={`flex w-full flex-col gap-1 border-b border-rose/5 px-5 py-4 text-left transition-colors ${
                      activeRoom?.id === room.id
                        ? "bg-petal/30"
                        : "hover:bg-petalSoft/40"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-ink">
                        {room.visitorName}
                      </span>
                      {room.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson px-1.5 font-display text-[11px] font-bold text-white">
                          {room.unreadCount}
                        </span>
                      )}
                    </span>
                    <span className="truncate text-xs text-wine/55">
                      {room.lastMessage?.body ?? "대화 시작 전"}
                    </span>
                    <span className="text-[10px] text-wine/35">
                      {timeOf(room.updatedAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* 채팅 영역 */}
          <section className="flex flex-1 flex-col">
            {!activeRoom ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <span className="text-4xl">📥</span>
                <p className="mt-4 font-display text-lg font-bold text-ink">
                  대화를 선택해 주세요
                </p>
                <p className="mt-1 text-sm text-wine/50">
                  왼쪽 목록에서 고객 문의를 선택하면 채팅이 열려요.
                </p>
              </div>
            ) : (
              <>
                {/* 채팅 헤더 */}
                <div className="flex items-center justify-between border-b border-rose/10 bg-gradient-to-r from-petalSoft to-cream px-6 py-4">
                  <div>
                    <p className="font-display text-base font-extrabold text-ink">
                      {activeRoom.visitorName}
                    </p>
                    <p className="text-[11px] text-wine/45">{activeRoom.visitorId}</p>
                  </div>
                </div>

                {/* 메시지 목록 */}
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex max-w-[75%] flex-col gap-1 ${
                        msg.senderType === "ADMIN" ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.senderType === "ADMIN"
                            ? "rounded-tr-sm bg-ink text-white"
                            : "rounded-tl-sm bg-white text-ink shadow-soft"
                        }`}
                      >
                        {msg.body}
                      </div>
                      <span className="px-1 text-[10px] text-wine/35">
                        {timeOf(msg.createdAt)}
                      </span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* 입력창 */}
                <div className="border-t border-rose/10 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
                      }}
                      placeholder={`${activeRoom.visitorName}님에게 답장하기`}
                      className="flex-1 rounded-full border border-rose/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={!input.trim()}
                      aria-label="답장 보내기"
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                        input.trim()
                          ? "bg-ink text-white hover:bg-crimson"
                          : "cursor-not-allowed bg-rose/15 text-wine/30"
                      }`}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
