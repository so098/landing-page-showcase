import { test, expect, type Page } from "@playwright/test";

// 메인 페이지 E2E: 로드 → SSR/ISR 증거 → 필터 → 모달 열기/닫기 → 콘솔 에러 0.
// showcase.spec.ts의 관례(헬퍼, 카드 로케이터)를 그대로 따른다.

// 전역 globals.css의 smooth-scroll/애니메이션이 클릭·가시성 판정 타이밍을
// 흔들 수 있어, navigation 직후 즉시 스크롤/무애니메이션으로 강제한다.
// (showcase.spec.ts와 동일 — 제품 코드는 건드리지 않고 테스트 측에서만 결정성 확보.)
async function disableSmoothScroll(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; }`,
  });
}

// 메인 페이지의 쇼케이스 카드 로케이터 (ShowcaseCard의 aria-label).
const cardLocator = (page: Page) =>
  page.getByRole("button", { name: /미리보기 열기/ });

test.describe("/ (메인)", () => {
  test("로드되면 히어로·쇼케이스·리뷰 섹션이 보인다", async ({ page }) => {
    await page.goto("/");
    await disableSmoothScroll(page);

    // 히어로 헤딩 (서버 렌더)
    await expect(
      page.getByRole("heading", { name: /웹사이트.*찾으시나요/ }),
    ).toBeVisible();

    // 쇼케이스 섹션: 첫 페이지 카드(5개)가 서버 렌더로 보인다
    const cards = cardLocator(page);
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(
      count,
      `카드가 ${count}개 — API(4000)가 켜져 있고 시드가 들어 있는지 확인하세요`,
    ).toBeGreaterThan(0);

    // 리뷰 섹션 (서버 렌더 — 시드 리뷰 존재 시). 헤딩으로 확인.
    await expect(page.getByRole("heading", { name: "고객 리뷰" })).toBeVisible();
  });

  test("SSR/ISR 증거: 쇼케이스·리뷰 데이터가 HTML 소스에 포함된다", async ({
    request,
  }) => {
    // 브라우저 하이드레이션 이전의 순수 HTML을 직접 받아 검사한다.
    // RSC + ISR 전략의 핵심: 데이터가 클라이언트 fetch가 아니라 HTML에 박혀 온다.
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();

    // 쇼케이스: 시드 첫 항목의 제목이 마크업에 존재
    expect(html).toContain("블룸 로스터스");
    // 리뷰: 리뷰 섹션 헤딩과 후기 본문 일부가 마크업에 존재
    expect(html).toContain("고객");
    expect(html).toContain("멜스튜디오로 랜딩페이지를 만든");
  });

  test("카테고리 태그를 누르면 해당 업종 카드만 보인다", async ({ page }) => {
    await page.goto("/");
    await disableSmoothScroll(page);
    await cardLocator(page).first().waitFor();

    // 비-전체 카테고리로 필터. 시드상 첫 100개 안에 5개 존재하는 "뷰티·살롱".
    // TagBar 버튼은 라벨 + 카운트 배지를 함께 담으므로 라벨 prefix로 매칭한다.
    const beautyTab = page.getByRole("button", { name: /^뷰티·살롱/ });
    await expect(beautyTab).toBeVisible();
    await beautyTab.click();

    // 필터 후 그리드는 페이지 0(최대 5장)을 보여주며, 모두 해당 업종이어야 한다.
    const cards = cardLocator(page);
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);

    // 보이는 모든 카드의 카테고리 배지가 선택한 업종 라벨이어야 한다.
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText("뷰티·살롱");
    }
  });

  test("카드를 누르면 미리보기 모달이 열리고 닫힌다", async ({ page }) => {
    await page.goto("/");
    await disableSmoothScroll(page);

    const firstCard = cardLocator(page).first();
    await firstCard.waitFor();
    await firstCard.click();

    // 모달(dialog) 오픈 + 주문 CTA 노출
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: /이 디자인으로 주문하기/ }),
    ).toBeVisible();

    // Escape로 닫힌다
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("로드 동안 콘솔 에러가 없다", async ({ page }) => {
    // favicon 404 등 데이터와 무관한 네트워크성 콘솔 잡음은 제외한다.
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (/favicon/i.test(text)) return;
      errors.push(text);
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await disableSmoothScroll(page);
    await cardLocator(page).first().waitFor();
    // 하이드레이션 직후 발생할 수 있는 에러까지 포착할 짧은 여유
    await page.waitForTimeout(500);

    expect(errors, `콘솔 에러:\n${errors.join("\n")}`).toHaveLength(0);
  });
});
