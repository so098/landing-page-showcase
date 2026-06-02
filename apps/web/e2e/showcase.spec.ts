import { test, expect, type Page } from "@playwright/test";

// 전역 globals.css의 `scroll-behavior: smooth` 때문에 window.scrollTo가 비동기로
// 동작할 수 있어, 직후 scrollY를 읽으면 비결정적이다. 또 애니메이션/트랜지션도
// 측정 타이밍을 흔든다. navigation 직후 이 스타일을 주입해 즉시 스크롤로 강제한다.
// (제품 globals.css나 virtualizer는 건드리지 않는다 — 테스트 측에서만 결정성 확보.)
async function disableSmoothScroll(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; }`,
  });
}

test.describe("/showcase", () => {
  test("페이지가 로드되고 첫 카드들이 보인다", async ({ page }) => {
    await page.goto("/showcase");
    await disableSmoothScroll(page);
    await expect(
      page.getByRole("heading", { name: /쇼케이스/ }),
    ).toBeVisible();
    // 첫 페이지 카드 12개 (서버 렌더)
    const cards = page.getByRole("button", { name: /미리보기 열기/ });
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(
      count,
      `카드가 ${count}개 — API(4000)가 켜져 있고 시드가 들어 있는지 확인하세요`,
    ).toBeGreaterThanOrEqual(12);
  });
});

test.describe("/showcase 가상화 + 스크롤 복원", () => {
  test("끝까지 스크롤하면 전체를 탐색하고 '전부 봤어요'가 보인다", async ({
    page,
  }) => {
    test.setTimeout(300_000); // 1,039개 전체 로드
    await page.goto("/showcase");
    await disableSmoothScroll(page);
    await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

    // 끝까지 스크롤 (전부 봤어요가 나올 때까지)
    await page.evaluate(async () => {
      const deadline = Date.now() + 4 * 60 * 1000;
      while (Date.now() < deadline) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 300));
        if (document.body.innerText.includes("전부 봤어요")) return;
      }
    });

    await expect(page.getByText("전부 봤어요")).toBeVisible();

    // 가상화 검증: 전체(1,039개)가 아니라 화면 분량만 DOM에 존재
    const renderedCards = await page
      .getByRole("button", { name: /미리보기 열기/ })
      .count();
    expect(renderedCards).toBeLessThan(100);
  });

  test("모달을 열었다 닫아도 스크롤 위치가 유지된다", async ({ page }) => {
    await page.goto("/showcase");
    await disableSmoothScroll(page);
    await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

    // 몇 페이지 로드되도록 스크롤
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
      }
      window.scrollTo(0, 2000);
      await new Promise((r) => setTimeout(r, 300));
    });

    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(1000);

    // 현재 뷰포트 안에 있는 카드를 클릭한다.
    // .first()는 overscan으로 뷰포트 위쪽(음수 y)에 있을 수 있어, Playwright가
    // 클릭 전 자동 스크롤을 하면서 scrollY가 바뀌어 비결정적이 된다.
    // 뷰포트 내부([0, height])에 있는 카드를 골라 클릭하면 자동 스크롤이 없다.
    const cards = page.getByRole("button", { name: /미리보기 열기/ });
    const viewport = page.viewportSize();
    const viewportHeight = viewport?.height ?? 800;
    const total = await cards.count();
    let target = null;
    for (let i = 0; i < total; i++) {
      const box = await cards.nth(i).boundingBox();
      if (box && box.y >= 0 && box.y + box.height <= viewportHeight) {
        target = cards.nth(i);
        break;
      }
    }
    expect(target, "뷰포트 안에 보이는 카드를 찾지 못함").not.toBeNull();

    await target!.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(50);
  });

  test("다른 페이지 갔다 뒤로가기 하면 위치가 복원된다", async ({ page }) => {
    await page.goto("/showcase");
    await disableSmoothScroll(page);
    await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

    // 몇 페이지 로드 + 특정 위치로 스크롤
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
      }
      window.scrollTo(0, 3000);
      await new Promise((r) => setTimeout(r, 500)); // 저장(rAF) 대기
    });

    const before = await page.evaluate(() => window.scrollY);

    // /guide로 이동 (클라이언트 내비게이션) 후 뒤로가기
    // SiteHeader의 /guide 링크 텍스트는 "안내"
    await page.getByRole("link", { name: "안내" }).first().click();
    await page.waitForURL("**/guide");
    await page.goBack();
    await page.waitForURL("**/showcase");
    // 뒤로가기로 재마운트된 페이지에도 즉시 스크롤 강제 주입
    await disableSmoothScroll(page);

    // 복원 대기 후 위치 확인 (rAF 재시도 + 캐시 하이드레이션 여유)
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(200);
  });
});
