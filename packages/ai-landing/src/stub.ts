import type { GeneratedLandingFiles, LandingGenerationRequest } from "./types.js";

export function buildStubLanding(input: LandingGenerationRequest): GeneratedLandingFiles {
  const heroImage = input.imageAssets.find((a) => a.url)?.url ?? "./hero.jpg";
  const brand = escapeHtml(input.brandName);
  const industry = escapeHtml(input.industry);
  const goal = escapeHtml(input.goal);
  const cta = escapeHtml(input.cta ?? "상담 문의하기");

  return {
    html: `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${brand} ${industry} 랜딩페이지" />
  <title>${brand} | ${industry} 랜딩페이지</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <header class="site-header" aria-label="사이트 헤더">
    <a class="logo" href="#top">${brand}</a>
    <nav><a href="#story">소개</a><a href="#offer">구성</a><a href="#contact">문의</a></nav>
  </header>
  <main id="top">
    <section class="hero" aria-label="첫 화면">
      <div class="hero-bg" role="img" aria-label="${industry} 대표 이미지"></div>
      <div class="hero-copy">
        <p class="eyebrow">${industry}</p>
        <h1>${brand}의 분위기를<br />한 화면에서 설득하는 랜딩페이지</h1>
        <p>${goal}을 목표로 이미지, 신뢰 정보, 문의 흐름을 자연스럽게 연결합니다.</p>
      </div>
      <span class="scroll-cue">SCROLL</span>
    </section>
    <section id="story" class="section intro">
      <p class="section-kicker">BRAND STORY</p>
      <h2>첫인상은 감성으로, 결정은 정보로 만듭니다.</h2>
      <p>${brand}의 핵심 장점을 고객이 빠르게 이해하도록 구성했습니다. 모바일에서도 읽기 좋은 간격과 한글 줄바꿈을 기준으로 설계합니다.</p>
    </section>
    <section id="offer" class="section cards">
      <article><h3>분위기</h3><p>업종에 맞는 이미지와 색감으로 브랜드 무드를 먼저 전달합니다.</p></article>
      <article><h3>신뢰</h3><p>서비스 구성, 진행 방식, 후기 영역을 통해 문의 전 불안을 줄입니다.</p></article>
      <article><h3>전환</h3><p>충분한 설명 이후 ${cta} 행동으로 자연스럽게 이어집니다.</p></article>
    </section>
    <section id="contact" class="section contact-panel">
      <p class="section-kicker">CONTACT</p>
      <h2>${cta}</h2>
      <p>전화, 카카오톡, 예약 링크 등 실제 서비스에 맞는 정적 문의 패널로 연결합니다.</p>
      <a class="cta" href="tel:010-0000-0000">문의 연결 준비</a>
    </section>
  </main>
  <script src="./script.js"></script>
</body>
</html>`,
    css: `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;600;700&display=swap');
:root{--ink:#171717;--muted:#666;--paper:#faf7f1;--line:rgba(0,0,0,.12);--brand:#9a5b35}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:'Noto Sans KR',system-ui,sans-serif;color:var(--ink);background:var(--paper);word-break:keep-all;overflow-wrap:break-word}.site-header{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,4vw,64px);background:rgba(250,247,241,.86);backdrop-filter:blur(18px);position:sticky;top:0;z-index:10;border-bottom:1px solid var(--line)}.logo{font-weight:700;text-decoration:none;color:inherit}.site-header nav{display:flex;gap:20px}.site-header a{color:inherit;text-decoration:none}.hero{position:relative;min-height:calc(100svh - 72px);display:grid;place-items:center;overflow:hidden;padding:0 24px;color:white}.hero-bg{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.62),rgba(0,0,0,.22)),url('${heroImage}') center/cover no-repeat;transform:scale(1.02)}.hero-copy{position:relative;max-width:920px;text-align:center}.eyebrow,.section-kicker{letter-spacing:.18em;font-size:.78rem;font-weight:700}.hero h1{font-size:clamp(2.1rem,5vw,4.5rem);line-height:1.08;margin:18px 0;font-weight:600}.hero p{font-size:clamp(1rem,2vw,1.25rem);line-height:1.8}.scroll-cue{position:absolute;bottom:28px;font-size:.72rem;letter-spacing:.25em}.section{padding:clamp(72px,10vw,132px) clamp(20px,5vw,80px);max-width:1180px;margin:0 auto}.intro h2,.contact-panel h2{font-size:clamp(2rem,4vw,3.4rem);line-height:1.16}.intro p,.contact-panel p{color:var(--muted);font-size:1.08rem;line-height:1.9}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.cards article,.contact-panel{background:white;border:1px solid var(--line);border-radius:28px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.06)}.cards h3{font-size:1.35rem}.cards p{color:var(--muted);line-height:1.8}.cta{display:inline-flex;margin-top:20px;padding:14px 20px;border-radius:999px;background:var(--ink);color:white;text-decoration:none}@media(max-width:760px){.site-header{height:64px}.site-header nav{gap:12px;font-size:.9rem}.hero{min-height:calc(100svh - 64px)}.hero-copy{text-align:left}.cards{grid-template-columns:1fr}.section{padding:64px 20px}.hero h1{font-size:clamp(2rem,12vw,3.2rem)}}`,
    js: `document.documentElement.classList.add('js-ready');`,
    notes: "Dry-run stub landing. Claude API 키 연결 전 파이프라인 검증용입니다.",
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#039;" }[ch] ?? ch));
}
