"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Showcase } from "@melstudio/shared";
import { useShowcaseBySlug } from "@/lib/queries";
import { loadOrder, type SavedOrderState } from "@/lib/orderStorage";
import SiteHeader from "@/components/SiteHeader";
import PagePreview from "@/components/PagePreview";

// AI와 함께 수정하기 — 완성된 페이지를 보면서 수정할 부분을 고르고
// AI에게 말해가며 수정하는 페이지. (백엔드 연동 전 목 단계)

const EDIT_PARTS = [
  "메인 문구",
  "색상/분위기",
  "메뉴/가격 정보",
  "사진 배치",
  "예약/문의 버튼",
  "연락처 정보",
  "전체 레이아웃",
] as const;

const AI_RESPONSES = [
  "네, 말씀하신 부분을 수정했어요! 왼쪽 미리보기에서 확인해 보세요 ✨",
  "반영 완료했어요. 또 수정하고 싶은 부분이 있나요?",
  "좋은 아이디어예요! 바로 적용했습니다 🎨",
  "수정했어요. 분위기가 한층 좋아졌네요 😊",
];

type ChatMessage = { role: "ai" | "user"; text: string };

export default function OrderEditPage() {
  const [order, setOrder] = useState<SavedOrderState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [parts, setParts] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const responseIndex = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadOrder();
    setOrder(saved);
    setLoaded(true);
    if (saved) {
      setMessages([
        {
          role: "ai",
          text: `안녕하세요! ${saved.form.businessName}의 페이지를 함께 수정해 볼까요? 수정할 부분을 선택하거나, 원하는 내용을 자유롭게 말씀해 주세요 😊`,
        },
      ]);
    }
  }, []);

  // 새 메시지가 생기면 채팅 맨 아래로 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking]);

  // 쇼케이스를 골라서 주문한 경우 해당 디자인을 사용
  const { showcase: fetched } = useShowcaseBySlug(order?.showcaseId ?? "");

  const generated: Showcase | null = useMemo(() => {
    if (!order) return null;
    if (fetched) return fetched;
    return {
      id: "generated",
      title: order.form.businessName || "내 랜딩페이지",
      blurb: order.form.targetMessage || order.purpose || "AI가 만든 랜딩페이지",
      category: order.form.industry || "brand",
      accent: "#E11D48",
      layout: "hero",
      desktop: null,
      mobile: null,
      thumb: null,
    };
  }, [order, fetched]);

  function togglePart(part: string) {
    setParts((list) =>
      list.includes(part) ? list.filter((p) => p !== part) : [...list, part],
    );
  }

  function send() {
    const text = input.trim();
    if (!text || thinking) return;

    const prefix = parts.length > 0 ? `[${parts.join(", ")}] ` : "";
    setMessages((m) => [...m, { role: "user", text: `${prefix}${text}` }]);
    setInput("");
    setParts([]);
    setThinking(true);

    // 목 AI 응답
    setTimeout(() => {
      const reply = AI_RESPONSES[responseIndex.current % AI_RESPONSES.length];
      responseIndex.current += 1;
      setMessages((m) => [...m, { role: "ai", text: reply }]);
      setThinking(false);
    }, 1500);
  }

  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-24">
        {!loaded ? (
          <p className="py-24 text-center text-wine/50">불러오는 중…</p>
        ) : !order || !generated ? (
          <div className="py-24 text-center">
            <p className="text-wine/60">아직 생성된 페이지가 없어요.</p>
            <Link
              href="/order"
              className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-crimson"
            >
              주문서 작성하러 가기
            </Link>
          </div>
        ) : (
          <>
            {/* ── 타이틀 ── */}
            <div className="animate-fade-up pt-2 text-center">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                <span className="text-crimson">AI</span>와 함께 수정하기
              </h1>
              <p className="mt-2 text-sm text-wine/60">
                수정할 부분을 고르고, 원하는 내용을 AI에게 말해주세요. 2~3분이면 반영돼요.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
              {/* ── 왼쪽: 페이지 미리보기 ── */}
              <div className="flex-1 lg:sticky lg:top-6">
                <div className="overflow-hidden rounded-xl border border-rose/15 bg-white shadow-petal">
                  <div className="flex items-center gap-1.5 border-b border-rose/10 bg-petalSoft/60 px-3 py-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose/40" />
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-light/50" />
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-soft/60" />
                    <span className="ml-3 flex-1 truncate rounded-full bg-white/70 px-3 py-1 text-[11px] text-wine/40">
                      https://{order.form.businessName || "my-page"}.com
                    </span>
                  </div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-white">
                    <PagePreview item={generated} variant="desktop" priority interactive />
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-wine/45">
                  수정 내용은 이 미리보기에 반영돼요
                </p>
              </div>

              {/* ── 오른쪽: 수정 패널 ── */}
              <div className="flex w-full flex-col rounded-3xl border border-rose/15 bg-cream shadow-soft lg:w-[420px]">
                {/* 수정할 부분 선택 */}
                <div className="border-b border-rose/10 p-5">
                  <p className="text-sm font-bold text-ink">어느 부분을 수정할까요?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {EDIT_PARTS.map((part) => (
                      <button
                        key={part}
                        type="button"
                        onClick={() => togglePart(part)}
                        aria-pressed={parts.includes(part)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          parts.includes(part)
                            ? "border-transparent bg-rose-grad text-white shadow-petal"
                            : "border-rose/20 bg-white/70 text-wine/70 hover:border-rose/50 hover:bg-white hover:text-crimson"
                        }`}
                      >
                        {part}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 채팅 영역 */}
                <div className="flex h-[340px] flex-col gap-3 overflow-y-auto p-5">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "ai"
                          ? "self-start rounded-tl-sm bg-white text-ink shadow-soft"
                          : "self-end rounded-tr-sm bg-rose-grad text-white shadow-petal"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex items-center gap-2 self-start rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-soft">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-rose [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-rose [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-rose [animation-delay:300ms]" />
                    </div>
                  )}
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
                      placeholder="예: 메인 문구를 더 따뜻한 느낌으로 바꿔줘"
                      className="flex-1 rounded-full border border-rose/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-wine/35 transition-colors focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={!input.trim() || thinking}
                      aria-label="보내기"
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                        input.trim() && !thinking
                          ? "bg-rose-grad text-white shadow-petal hover:shadow-petalHover"
                          : "cursor-not-allowed bg-rose/15 text-wine/30"
                      }`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 수정 완료 */}
                <div className="border-t border-rose/10 p-4">
                  <Link
                    href="/order/result"
                    className="block rounded-full bg-ink px-6 py-3 text-center text-sm font-bold text-white transition-all hover:bg-crimson"
                  >
                    수정 완료 — 결과 보러 가기
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
