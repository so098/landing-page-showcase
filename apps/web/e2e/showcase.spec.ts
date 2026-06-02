import { test, expect } from "@playwright/test";

test.describe("/showcase", () => {
  test("페이지가 로드되고 첫 카드들이 보인다", async ({ page }) => {
    await page.goto("/showcase");
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
