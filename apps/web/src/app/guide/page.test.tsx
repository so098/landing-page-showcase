import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// 헤더는 클라이언트 섬(island) — 이 페이지의 정적 안내 콘텐츠 검증과 무관하므로 가볍게 대체한다.
vi.mock("@/components/SiteHeader", () => ({
  default: () => null,
}));

import GuidePage from "./page";

// details/summary 기반 아코디언 — summary 제목(button 역할이 아니므로 텍스트로) 으로 해당 항목을 찾고
// 그 안의 본문 텍스트를 검증한다.
function accordionByTitle(title: string) {
  const heading = screen.getByText(title);
  // summary 안의 제목 span → 가장 가까운 <details> 가 아코디언 루트.
  const details = heading.closest("details");
  if (!details) throw new Error(`아코디언을 찾지 못함: ${title}`);
  return within(details as HTMLElement);
}

describe("GuidePage 공지사항 아코디언", () => {
  // ── 항목 A: 도메인·호스팅 설명 구체화 ──
  it("도메인·호스팅 항목에 Netlify/Vercel 호스팅을 명시한다", () => {
    render(<GuidePage />);
    const acc = accordionByTitle("도메인과 호스팅이란?");
    // 호스팅 후보 두 곳 모두 명시되는지 확인.
    expect(acc.getByText("Netlify")).toBeTruthy();
    expect(acc.getByText("Vercel")).toBeTruthy();
  });

  it("도메인·호스팅 항목에 가격대 전달 → 후보 3개 제안 → 선택 절차를 안내한다", () => {
    render(<GuidePage />);
    const acc = accordionByTitle("도메인과 호스팅이란?");
    // 텍스트가 강조(strong) 태그로 나뉘어 여러 노드에 걸쳐 있으므로 getAllByText 로 존재만 확인한다.
    // 고객이 가격대를 알려주는 절차
    expect(acc.getAllByText(/가격대/).length).toBeGreaterThan(0);
    // 멜스튜디오가 후보 도메인 3개를 제안하는 절차
    expect(acc.getAllByText(/3개/).length).toBeGreaterThan(0);
  });

  it("도메인·호스팅 항목에 새 계정 안내가 포함된다", () => {
    render(<GuidePage />);
    const acc = accordionByTitle("도메인과 호스팅이란?");
    expect(acc.getAllByText(/계정/).length).toBeGreaterThan(0);
  });

  // ── 항목 B: SEO 최적화 항목 신규 추가 ──
  it("SEO 최적화 아코디언 항목이 존재한다", () => {
    render(<GuidePage />);
    expect(screen.getByText("SEO 최적화는 어떻게 되나요?")).toBeTruthy();
  });

  it("SEO 항목에 구글 서치 콘솔·네이버 서치어드바이저 등록 대행을 안내한다", () => {
    render(<GuidePage />);
    const acc = accordionByTitle("SEO 최적화는 어떻게 되나요?");
    expect(acc.getByText(/구글 서치 콘솔/)).toBeTruthy();
    expect(acc.getByText(/네이버 서치어드바이저/)).toBeTruthy();
  });

  it("SEO 항목에 구체적 SEO 작업 예시(메타태그 등)를 든다", () => {
    render(<GuidePage />);
    const acc = accordionByTitle("SEO 최적화는 어떻게 되나요?");
    expect(acc.getAllByText(/메타/).length).toBeGreaterThan(0);
  });
});
