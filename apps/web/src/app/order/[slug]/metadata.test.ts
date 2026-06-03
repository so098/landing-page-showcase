import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Showcase } from "@melstudio/shared";
import { generateMetadata } from "./page";
import * as api from "@/lib/api";
import { SITE_NAME } from "@/lib/metadata";

vi.mock("@/lib/api");

const mockFetch = vi.mocked(api.fetchShowcaseBySlug);

function makeShowcase(over: Partial<Showcase> = {}): Showcase {
  return {
    id: "dalkom-bakery",
    title: "달콤 베이커리",
    blurb: "동네 빵집을 위한 따뜻한 랜딩페이지",
    category: "cafe",
    accent: "#C2410C",
    layout: "hero",
    desktop: null,
    mobile: null,
    thumb: null,
    ...over,
  };
}

// Next.js generateMetadata는 params가 Promise로 전달된다 (Next 15+)
function makeProps(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("/order/[slug] generateMetadata", () => {
  beforeEach(() => vi.clearAllMocks());

  it("쇼케이스를 찾으면 제목/설명을 그 디자인 기반으로 생성한다", async () => {
    mockFetch.mockResolvedValueOnce(makeShowcase());

    const meta = await generateMetadata(makeProps("dalkom-bakery"));

    expect(meta.title).toContain("달콤 베이커리");
    expect(meta.description).toContain("달콤 베이커리");
    expect(meta.openGraph?.title).toBe(`달콤 베이커리 주문하기 — ${SITE_NAME}`);
    expect(meta.alternates?.canonical).toBe("/order/dalkom-bakery");
  });

  it("주문 페이지는 검색에 노출되지 않도록 noindex 처리한다", async () => {
    mockFetch.mockResolvedValueOnce(makeShowcase());
    const meta = await generateMetadata(makeProps("dalkom-bakery"));
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("쇼케이스를 못 찾으면 일반 주문서 제목으로 폴백한다", async () => {
    mockFetch.mockResolvedValueOnce(null);
    const meta = await generateMetadata(makeProps("unknown"));
    expect(meta.title).toContain("주문서");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("API가 다운돼도(throw) 폴백 메타데이터를 반환한다", async () => {
    mockFetch.mockRejectedValueOnce(new Error("api down"));
    const meta = await generateMetadata(makeProps("dalkom-bakery"));
    expect(meta.title).toContain("주문서");
  });
});
