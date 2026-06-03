import { describe, it, expect } from "vitest";
import { metadata as rootMetadata } from "./layout";
import { metadata as homeMetadata } from "./page";
import { metadata as showcaseMetadata } from "./showcase/page";
import { metadata as guideMetadata } from "./guide/page";
import { metadata as orderMetadata } from "./order/layout";
import { metadata as mypageMetadata } from "./mypage/layout";
import { metadata as adminChatMetadata } from "./admin/chat/layout";
import { SITE_NAME } from "@/lib/metadata";

// 공개 페이지는 metadata/generateMetadata로 SEO를 채우고,
// 개인화/관리 페이지는 noindex로 검색 노출을 막는지 검증한다.

describe("루트 레이아웃 metadata", () => {
  it("제목 템플릿과 metadataBase, OG 기본값을 갖는다", () => {
    expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
    // title이 default/template 형태인지
    expect(rootMetadata.title).toMatchObject({
      template: expect.stringContaining(SITE_NAME),
    });
    expect(rootMetadata.openGraph?.siteName).toBe(SITE_NAME);
    expect(rootMetadata.openGraph?.locale).toBe("ko_KR");
  });
});

describe("공개 페이지 metadata (색인 허용)", () => {
  it("홈은 canonical '/'를 갖고 noindex가 아니다", () => {
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeMetadata.robots).toBeUndefined();
  });

  it("쇼케이스는 고유 제목과 canonical을 갖는다", () => {
    expect(homeMetadata.robots).toBeUndefined();
    expect(showcaseMetadata.title).toBe("쇼케이스 전체 보기");
    expect(showcaseMetadata.alternates?.canonical).toBe("/showcase");
    expect(showcaseMetadata.robots).toBeUndefined();
  });

  it("이용 안내는 고유 제목과 canonical을 갖는다", () => {
    expect(guideMetadata.title).toBe("이용 안내");
    expect(guideMetadata.alternates?.canonical).toBe("/guide");
    expect(guideMetadata.robots).toBeUndefined();
  });
});

describe("개인화/관리 페이지 metadata (noindex)", () => {
  it("주문 레이아웃은 noindex다", () => {
    expect(orderMetadata.robots).toEqual({ index: false, follow: false });
  });
  it("마이페이지 레이아웃은 noindex다", () => {
    expect(mypageMetadata.robots).toEqual({ index: false, follow: false });
  });
  it("관리자 채팅 레이아웃은 noindex다", () => {
    expect(adminChatMetadata.robots).toEqual({ index: false, follow: false });
  });
});
