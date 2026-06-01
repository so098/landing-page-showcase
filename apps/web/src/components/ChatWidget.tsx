"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@melstudio/shared";
import {
  getSocket,
  getVisitorId,
  getVisitorName,
  fetchMessages,
  subscribeOpenChat,
} from "@/lib/chat";

// 우측 하단 플로팅 채팅 위젯 — 모든 페이지에 마운트.
// 실시간(Socket.IO) 송수신 + DB 히스토리 로드.
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const pendingMessage = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // ── 방 입장 + 히스토리 로드 + 실시간 수신 ──
  const joinRoom = useCallback(async () => {
    const socket = getSocket();
    return new Promise<string>((resolve) => {
      socket.emit(
        "room:join",
        { visitorId: getVisitorId(), visitorName: getVisitorName() },
        async (room: { id: string }) => {
          setRoomId(room.id);
          try {
            setMessages(await fetchMessages(room.id));
          } catch {
            // 히스토리 로드 실패해도 실시간은 동작
          }
          resolve(room.id);
        },
      );
    });
  }, []);

  // 소켓 연결 상태 + 새 메시지 수신
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      // 재연결 시 방 다시 입장
      if (roomId) joinRoom();
    };
    const onDisconnect = () => setConnected(false);
    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      // 닫혀 있을 때 관리자 답장 오면 배지 표시
      if (!openRef.current && msg.senderType === "ADMIN") {
        setUnseen((n) => n + 1);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessage);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── 메시지 전송 ──
  const send = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text) return;
      let rid = roomId;
      if (!rid) rid = await joinRoom();
      getSocket().emit("message:send", {
        roomId: rid,
        senderType: "CUSTOMER",
        body: text,
      });
    },
    [roomId, joinRoom],
  );

  // ── 외부에서 열기 (사람에게 주문/수정 등) ──
  useEffect(() => {
    return subscribeOpenChat(async (initialMessage) => {
      setOpen(true);
      setUnseen(0);
      const rid = roomId ?? (await joinRoom());
      if (initialMessage) {
        getSocket().emit("message:send", {
          roomId: rid,
          senderType: "CUSTOMER",
          body: initialMessage,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, joinRoom]);

  // 위젯 처음 열 때 방 입장
  useEffect(() => {
    if (open && !roomId) joinRoom();
    if (open) setUnseen(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 새 메시지 시 맨 아래로 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, open]);

  // 보류된 입력 전송
  useEffect(() => {
    if (roomId && pendingMessage.current) {
      send(pendingMessage.current);
      pendingMessage.current = null;
    }
  }, [roomId, send]);

  function handleSubmit() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (!roomId) {
      pendingMessage.current = text;
      joinRoom();
      return;
    }
    send(text);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* ── 채팅 패널 ── */}
      {open && (
        <div className="flex h-[480px] w-[calc(100vw-2.5rem)] max-w-sm animate-modal-in flex-col overflow-hidden rounded-3xl border border-rose/15 bg-cream shadow-petalHover">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-rose/10 bg-gradient-to-r from-petalSoft to-cream px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-grad text-white shadow-petal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </span>
              <div>
                <p className="font-display text-sm font-extrabold text-ink">멜스튜디오 문의</p>
                <p className="flex items-center gap-1.5 text-[11px] text-wine/50">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-rose/40"}`}
                  />
                  {connected ? "실시간 상담 연결됨" : "연결 중…"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="채팅 닫기"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-rose/20 bg-white text-wine/60 transition-all hover:rotate-90 hover:border-rose hover:text-crimson"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* 메시지 목록 */}
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <span className="text-3xl">💬</span>
                <p className="mt-3 text-sm font-semibold text-ink">무엇을 도와드릴까요?</p>
                <p className="mt-1 text-xs text-wine/50">
                  랜딩페이지 제작·수정·도메인 연결 등<br />
                  궁금한 점을 남겨주세요.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  msg.senderType === "CUSTOMER"
                    ? "self-end rounded-tr-sm bg-rose-grad text-white shadow-petal"
                    : "self-start rounded-tl-sm bg-white text-ink shadow-soft"
                }`}
              >
                {msg.body}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* 입력창 */}
          <div className="border-t border-rose/10 bg-cream p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSubmit();
                }}
                placeholder="메시지를 입력하세요"
                className="flex-1 rounded-full border border-rose/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-wine/35 transition-colors focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                aria-label="보내기"
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                  input.trim()
                    ? "bg-rose-grad text-white shadow-petal hover:shadow-petalHover"
                    : "cursor-not-allowed bg-rose/15 text-wine/30"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 플로팅 버튼 ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "채팅 닫기" : "채팅 열기"}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-rose-grad text-white shadow-petalHover transition-all hover:scale-110 active:scale-95"
      >
        {unseen > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sun px-1 font-display text-[11px] font-extrabold text-ink shadow-sm">
            {unseen}
          </span>
        )}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
