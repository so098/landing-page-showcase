"use client";

import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@melstudio/shared";
import { getUser } from "./auth";

// 채팅 클라이언트 헬퍼 — visitor ID 관리 + socket 싱글톤 + 위젯 열기 이벤트.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const VISITOR_KEY = "melstudio:visitor-id";
const OPEN_CHAT_EVENT = "melstudio:open-chat";

// ── 방문자 식별 ──
// 브라우저별 고유 ID. 추후 실제 로그인이 붙으면 user id로 교체.
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function getVisitorName(): string {
  return getUser()?.name ?? "방문자";
}

// ── 소켓 싱글톤 ──
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, { transports: ["websocket"], autoConnect: true });
  }
  return socket;
}

// ── 메시지 히스토리 (REST) ──
export async function fetchMessages(roomId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/api/chat/rooms/${roomId}/messages`);
  if (!res.ok) throw new Error(`chat messages ${res.status}`);
  return (await res.json()) as ChatMessage[];
}

export async function fetchRooms() {
  const res = await fetch(`${API_BASE}/api/chat/rooms`);
  if (!res.ok) throw new Error(`chat rooms ${res.status}`);
  return res.json();
}

// ── 위젯 열기 (다른 컴포넌트에서 호출) ──
// initialMessage가 있으면 위젯이 열리면서 자동으로 전송한다.
export function openChat(initialMessage?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_CHAT_EVENT, { detail: { initialMessage } }),
  );
}

export function subscribeOpenChat(
  callback: (initialMessage?: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    callback((e as CustomEvent<{ initialMessage?: string }>).detail?.initialMessage);
  };
  window.addEventListener(OPEN_CHAT_EVENT, handler);
  return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
}
