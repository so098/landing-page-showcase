import { describe, it, expect } from "vitest";
import { buildMetadata, SITE_NAME, SITE_DESCRIPTION } from "./metadata";

describe("buildMetadata", () => {
  it("인자 없이 호출하면 사이트 기본 제목/설명을 쓴다", () => {
    const meta = buildMetadata();
    expect(meta.title).toContain(SITE_NAME);
    expect(meta.description).toBe(SITE_DESCRIPTION);
    // 기본은 색인 허용 (robots 미설정)
    expect(meta.robots).toBeUndefined();
  });

  it("title을 주면 그대로 두고(템플릿은 레이아웃이 적용) OG에는 사이트명까지 합친다", () => {
    const meta = buildMetadata({ title: "쇼케이스 전체 보기", path: "/showcase" });
    // 페이지 title은 템플릿(%s)이 채워줄 수 있도록 고유 제목만 둔다
    expect(meta.title).toBe("쇼케이스 전체 보기");
    // OG title은 템플릿이 적용 안 되므로 완성형으로 들어가야 함
    expect(meta.openGraph?.title).toBe(`쇼케이스 전체 보기 — ${SITE_NAME}`);
    expect(meta.twitter?.title).toBe(`쇼케이스 전체 보기 — ${SITE_NAME}`);
  });

  it("path를 canonical과 OG url에 반영한다", () => {
    const meta = buildMetadata({ path: "/showcase" });
    expect(meta.alternates?.canonical).toBe("/showcase");
    expect(meta.openGraph?.url).toBe("/showcase");
  });

  it("description을 넘기면 OG/Twitter까지 전파한다", () => {
    const meta = buildMetadata({ description: "주문서 설명" });
    expect(meta.description).toBe("주문서 설명");
    expect(meta.openGraph?.description).toBe("주문서 설명");
    expect(meta.twitter?.description).toBe("주문서 설명");
  });

  it("noindex면 robots에 index:false를 넣는다", () => {
    const meta = buildMetadata({ noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("OG는 한국어 로케일과 사이트명을 포함한다", () => {
    const meta = buildMetadata();
    expect(meta.openGraph?.locale).toBe("ko_KR");
    expect(meta.openGraph?.siteName).toBe(SITE_NAME);
  });
});
