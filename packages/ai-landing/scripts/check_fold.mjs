// 헤더+hero = 정확히 한 화면(AP-10) 실측 도구.
// 사용: node scripts/check_fold.mjs <index.html 경로>
//
// 고정 viewport 1개가 아니라 "현실적인 화면 높이" 여러 개에서 측정한다.
// (1440x900에서만 통과해도 맥북 브라우저(~780-820px)·소형 노트북(720px)·소형 모바일(667px)에서
//  hero 콘텐츠가 줄지 않으면 폴드를 넘는다 — 2026-06-02 corporate-event-agency에서 확인된 패턴.)
// 전부 ✅여야 통과. hero 콘텐츠는 max-height 미디어쿼리 등으로 낮은 화면에서도 압축되게 만들 것.
import pw from 'playwright';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const file = resolve(process.argv[2]);
if (!process.argv[2]) {
  console.error('사용: node scripts/check_fold.mjs <index.html 경로>');
  process.exit(2);
}

const VIEWPORTS = [
  ['데스크탑 FHD',        1920, 1080],
  ['데스크탑 기준',        1440, 900],
  ['맥북 13" 브라우저',    1440, 820],
  ['맥북(북마크바)',       1440, 780],
  ['소형 노트북',          1280, 720],
  ['모바일 기준',          390,  844],
  ['모바일 소형(SE)',      375,  667],
];

const browser = await pw.chromium.launch();
let fail = 0;
for (const [name, w, h] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const hero = q('.hero') || q('#hero') || q('[class*="hero"]');
    if (!hero) return null;
    const b = hero.getBoundingClientRect();
    const header = q('header, .site-header, .hd');
    return {
      heroBottom: Math.round(b.bottom + scrollY),
      viewportH: innerHeight,
      headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
    };
  });
  if (!m) { console.log(`[${name} ${w}x${h}] hero 요소를 찾지 못함`); await page.close(); continue; }
  const over = m.heroBottom - m.viewportH;
  const status = over > 4 ? `❌ ${over}px 초과` : over < -60 ? `⚠️ ${-over}px 미달(다음 섹션 침범)` : '✅ 딱 맞음';
  if (over > 4) fail++;
  console.log(`[${name} ${w}x${h}] 헤더 ${m.headerH}px | hero 끝 ${m.heroBottom}px / 화면 ${m.viewportH}px → ${status}`);
  await page.close();
}
await browser.close();
console.log(fail === 0 ? '\n전체 통과 ✅' : `\n${fail}개 viewport에서 폴드 초과 ❌ — hero 콘텐츠를 낮은 화면에서도 압축되게 수정 필요`);
process.exit(fail === 0 ? 0 : 1);
