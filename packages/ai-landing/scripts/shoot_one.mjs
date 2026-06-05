// 단일 랜딩 페이지 스크린샷 (데스크탑 + 모바일, full-page).
// 사용: node scripts/shoot_one.mjs <index.html 경로> [출력디렉터리]
//   예) node scripts/shoot_one.mjs template4/dessert-shop-order/index.html
//       node scripts/shoot_one.mjs templates/nail-reservation-landing/index.html qa-screenshots
// 출력: <outdir>/<slug>__desktop.png, <outdir>/<slug>__mobile.png
// (shoot_templates.mjs 와 동일한 스크롤/settle 로직 재사용 — lazy 이미지·애니메이션 안정화 후 촬영)
import pw from '/Users/hansoyoung/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.js';
const { chromium } = pw;
import { existsSync, mkdirSync } from 'fs';
import { resolve, join, basename, dirname } from 'path';
import { pathToFileURL } from 'url';

const arg = process.argv[2];
if (!arg) {
  console.error('사용: node scripts/shoot_one.mjs <index.html 경로> [출력디렉터리]');
  process.exit(2);
}
const ROOT = resolve(process.cwd());
const html = resolve(arg);
if (!existsSync(html)) {
  console.error('파일 없음: ' + html);
  process.exit(2);
}
// slug = index.html 의 상위 폴더명 (없으면 파일명)
const slug = basename(dirname(html)) || basename(html).replace(/\.html?$/, '');
const OUT = resolve(process.argv[3] || join(ROOT, 'qa-screenshots'));
mkdirSync(OUT, { recursive: true });

const viewports = {
  desktop: { width: 1440, height: 900, mobile: false, scale: 1 },
  mobile: { width: 390, height: 844, mobile: true, scale: 2 },
};

const browser = await chromium.launch();
// 깨진 이미지(load 실패) 수집을 위해 콘솔/응답 추적
const results = [];
for (const [label, v] of Object.entries(viewports)) {
  const context = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.scale,
    isMobile: v.mobile,
    hasTouch: v.mobile,
  });
  const page = await context.newPage();
  const failed = [];
  page.on('requestfailed', (req) => {
    if (req.resourceType() === 'image') failed.push(req.url().replace(pathToFileURL(ROOT).href, ''));
  });
  const url = pathToFileURL(html).href;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.evaluate(async () => {
    await new Promise((r) => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, window.innerHeight);
        y += window.innerHeight;
        if (y < document.body.scrollHeight) setTimeout(step, 120);
        else r();
      };
      step();
    });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  // 자연 크기 0 인(=깨진) img 도 수집
  const brokenImgs = await page.evaluate(() =>
    Array.from(document.images)
      .filter((im) => !im.complete || im.naturalWidth === 0)
      .map((im) => im.getAttribute('src'))
  );
  // hero exact-fold 측정: 헤더+hero 가 정확히 한 화면인지 (AP-10)
  // 정적 채점은 100vh 문자열만 보고 실제 렌더 높이는 못 재므로 여기서 측정한다.
  const fold = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const hero = q('.hero') || q('#hero') || q('[class*="hero"]');
    if (!hero) return null;
    const b = hero.getBoundingClientRect();
    return { heroBottom: Math.round(b.bottom + window.scrollY), viewportH: window.innerHeight };
  });
  const file = join(OUT, `${slug}__${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await context.close();
  results.push({ label, file: file.replace(ROOT + '/', ''), failed, brokenImgs });
  console.log(`[${label}] -> ${file.replace(ROOT + '/', '')}`);
  if (failed.length) console.log(`   요청 실패 이미지: ${failed.join(', ')}`);
  if (brokenImgs.length) console.log(`   깨진 img(naturalWidth=0): ${brokenImgs.join(', ')}`);
  if (fold) {
    const over = fold.heroBottom - fold.viewportH;
    if (over > 4) console.log(`   ⚠️ AP-10 폴드 초과: hero가 첫 화면을 ${over}px 넘음 (hero 끝 ${fold.heroBottom}px > viewport ${fold.viewportH}px)`);
    else if (over < -60) console.log(`   ⚠️ AP-10 폴드 미달: hero가 첫 화면보다 ${-over}px 짧음`);
    else console.log(`   ✅ AP-10 폴드 OK (hero 끝 ${fold.heroBottom}px / viewport ${fold.viewportH}px)`);
  }
}
await browser.close();
console.log('DONE: ' + results.map((r) => r.file).join(', '));
