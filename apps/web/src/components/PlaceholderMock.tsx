import type { CSSProperties } from "react";
import type { Showcase } from "@/data/showcase";

// 실제 스크린샷이 없을 때 렌더되는 "미니 랜딩페이지" 목업.
// 컨테이너 쿼리(cqw) 단위를 사용해 카드 썸네일 / 모달 큰 화면 어디서든
// 비율이 자연스럽게 스케일됩니다.

type Variant = "desktop" | "mobile";

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Bar({
  w,
  h = 2.4,
  c = "rgba(17,24,39,0.14)",
  r = 99,
  mt = 0,
}: {
  w: string | number;
  h?: number;
  c?: string;
  r?: number;
  mt?: number;
}) {
  const style: CSSProperties = {
    width: typeof w === "number" ? `${w}cqw` : w,
    height: `${h}cqw`,
    background: c,
    borderRadius: `${r}cqw`,
    marginTop: mt ? `${mt}cqw` : undefined,
    flexShrink: 0,
  };
  return <div style={style} />;
}

export default function PlaceholderMock({
  item,
  variant = "desktop",
}: {
  item: Showcase;
  variant?: Variant;
}) {
  const accent = item.accent;
  const tint = hexToRgba(accent, 0.1);
  const tintStrong = hexToRgba(accent, 0.18);
  const isMobile = variant === "mobile";

  const page: CSSProperties = {
    containerType: "inline-size",
    width: "100%",
    height: "100%",
    background: "#ffffff",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  };

  // ── 상단 내비게이션 ──
  const nav = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "4cqw 5cqw" : "3cqw 5cqw",
        borderBottom: `0.4cqw solid ${hexToRgba(accent, 0.08)}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.8cqw" }}>
        <div
          style={{
            width: isMobile ? "5cqw" : "3.4cqw",
            height: isMobile ? "5cqw" : "3.4cqw",
            borderRadius: "50%",
            background: accent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 800,
            fontSize: isMobile ? "4.6cqw" : "3cqw",
            color: "#111827",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </span>
      </div>
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2cqw" }}>
          <Bar w={6} h={0.9} c="rgba(17,24,39,0.4)" />
          <Bar w={6} h={0.9} c="rgba(17,24,39,0.4)" />
          <Bar w={6} h={0.9} c="rgba(17,24,39,0.4)" />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "3cqw" }}>
          <Bar w={7} h={1.6} />
          <Bar w={7} h={1.6} />
          <Bar w={7} h={1.6} />
          <div
            style={{
              padding: "1.6cqw 3.2cqw",
              borderRadius: "99cqw",
              background: accent,
              fontSize: "2.2cqw",
              color: "#fff",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            문의하기
          </div>
        </div>
      )}
    </div>
  );

  // ── 히어로 영역 (레이아웃별 변형) ──
  const headlineSize = isMobile ? 8 : 6.4;
  const ctaPill = (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "1.5cqw",
        padding: isMobile ? "3cqw 6cqw" : "2.4cqw 5cqw",
        borderRadius: "99cqw",
        background: accent,
        color: "#fff",
        fontWeight: 700,
        fontSize: isMobile ? "4cqw" : "2.8cqw",
        boxShadow: `0 4cqw 10cqw -3cqw ${hexToRgba(accent, 0.5)}`,
        width: "fit-content",
      }}
    >
      자세히 보기 →
    </div>
  );

  const imageBlock = (h: number, label = false) => (
    <div
      style={{
        width: "100%",
        height: `${h}cqw`,
        borderRadius: "3cqw",
        background: `linear-gradient(135deg, ${accent} 0%, ${hexToRgba(
          accent,
          0.45,
        )} 100%)`,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-6cqw",
          top: "-6cqw",
          width: "28cqw",
          height: "28cqw",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "8cqw",
          bottom: "8cqw",
          width: "30cqw",
          height: "30cqw",
          borderRadius: "50%",
          border: "1.4cqw solid rgba(255,255,255,0.25)",
        }}
      />
      {label && (
        <span
          style={{
            position: "absolute",
            left: "5cqw",
            top: "5cqw",
            color: "rgba(255,255,255,0.9)",
            fontWeight: 800,
            fontSize: "3cqw",
          }}
        >
          {item.blurb}
        </span>
      )}
    </div>
  );

  let hero: React.ReactNode;

  if (isMobile) {
    hero = (
      <div style={{ padding: "6cqw 5cqw", display: "flex", flexDirection: "column", gap: "3cqw" }}>
        <div
          style={{
            alignSelf: "flex-start",
            padding: "1.4cqw 3cqw",
            borderRadius: "99cqw",
            background: tintStrong,
            color: accent,
            fontWeight: 700,
            fontSize: "3cqw",
          }}
        >
          {item.blurb}
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: `${headlineSize}cqw`,
            lineHeight: 1.15,
            color: "#111827",
            letterSpacing: "-0.03em",
          }}
        >
          지금, 더 나은
          <br />
          <span style={{ color: accent }}>선택</span>을 시작하세요
        </div>
        <Bar w={"90%"} h={2.6} mt={1} />
        <Bar w={"75%"} h={2.6} />
        {ctaPill}
        {imageBlock(46)}
      </div>
    );
  } else if (item.layout === "split") {
    hero = (
      <div
        style={{
          padding: "6cqw 5cqw",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "5cqw",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2.4cqw" }}>
          <div
            style={{
              alignSelf: "flex-start",
              padding: "1cqw 2.6cqw",
              borderRadius: "99cqw",
              background: tintStrong,
              color: accent,
              fontWeight: 700,
              fontSize: "2.2cqw",
            }}
          >
            {item.blurb}
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: `${headlineSize}cqw`,
              lineHeight: 1.12,
              color: "#111827",
              letterSpacing: "-0.03em",
            }}
          >
            당신의 브랜드를
            <br />
            <span style={{ color: accent }}>특별하게</span>
          </div>
          <Bar w={"95%"} h={1.8} mt={1} />
          <Bar w={"80%"} h={1.8} />
          {ctaPill}
        </div>
        {imageBlock(50)}
      </div>
    );
  } else if (item.layout === "grid") {
    hero = (
      <div style={{ padding: "5cqw", display: "flex", flexDirection: "column", gap: "3.5cqw" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2cqw", textAlign: "center" }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: `${headlineSize - 0.6}cqw`,
              lineHeight: 1.1,
              color: "#111827",
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ color: accent }}>{item.title}</span> 컬렉션
          </div>
          <Bar w={"55%"} h={1.6} />
          {ctaPill}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3cqw" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "1.6cqw" }}>
              <div
                style={{
                  width: "100%",
                  height: "26cqw",
                  borderRadius: "2.4cqw",
                  background: i === 1 ? accent : tint,
                }}
              />
              <Bar w={"80%"} h={1.6} />
              <Bar w={"55%"} h={1.6} />
            </div>
          ))}
        </div>
      </div>
    );
  } else if (item.layout === "minimal") {
    hero = (
      <div
        style={{
          flex: 1,
          padding: "10cqw 5cqw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "3.5cqw",
          textAlign: "center",
        }}
      >
        <Bar w={10} h={1.4} c={accent} />
        <div
          style={{
            fontWeight: 900,
            fontSize: `${headlineSize + 1}cqw`,
            lineHeight: 1.1,
            color: "#111827",
            letterSpacing: "-0.04em",
            maxWidth: "80%",
          }}
        >
          단순함 속의 <span style={{ color: accent }}>완성</span>
        </div>
        <Bar w={"50%"} h={1.8} />
        {ctaPill}
      </div>
    );
  } else {
    // hero (기본)
    hero = (
      <div
        style={{
          padding: "7cqw 5cqw 5cqw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3cqw",
          textAlign: "center",
        }}
      >
        <div
          style={{
            padding: "1.2cqw 3cqw",
            borderRadius: "99cqw",
            background: tintStrong,
            color: accent,
            fontWeight: 700,
            fontSize: "2.2cqw",
          }}
        >
          {item.blurb}
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: `${headlineSize}cqw`,
            lineHeight: 1.1,
            color: "#111827",
            letterSpacing: "-0.03em",
            maxWidth: "85%",
          }}
        >
          <span style={{ color: accent }}>{item.title}</span>와
          <br />
          함께하는 특별한 경험
        </div>
        <Bar w={"60%"} h={1.8} />
        {ctaPill}
        {imageBlock(40, true)}
      </div>
    );
  }

  return (
    <div style={page}>
      {nav}
      {hero}
    </div>
  );
}
