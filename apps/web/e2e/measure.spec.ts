import { test, expect } from "@playwright/test";

// 성능 측정 스크립트 — 테스트라기보다 측정 자동화.
// 끝까지 스크롤하며 DOM 노드 수 / 프레임 시간 / JS 힙을 수집해 콘솔에 출력한다.
// 실행: npm run test:e2e -w @melstudio/web -- measure
// (Before/After 측정 시 동일 조건: 1,039개 시드, 프로덕션 빌드, workers=1)

test("측정: /showcase 끝까지 스크롤 — DOM 노드 / 프레임 / 힙", async ({ page }) => {
  // 가상화 없는 Before 측정은 1,039개 전체 로드에 오래 걸린다
  test.setTimeout(600_000);

  await page.goto("/showcase");
  await page.getByRole("button", { name: /미리보기 열기/ }).first().waitFor();

  // ── 끝까지 스크롤하면서 프레임 시간 수집 ──
  const result = await page.evaluate(async () => {
    const frameDeltas: number[] = [];
    let last = performance.now();
    let running = true;
    const loop = () => {
      const now = performance.now();
      frameDeltas.push(now - last);
      last = now;
      if (running) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // "전부 봤어요"가 나올 때까지 스크롤 (최대 8분 안전장치)
    const deadline = Date.now() + 8 * 60 * 1000;
    while (Date.now() < deadline) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 300));
      if (document.body.innerText.includes("전부 봤어요")) break;
    }

    // 끝에서 한 번 더 위로 갔다가 아래로 (스크롤 성능 측정 구간)
    const total = document.body.scrollHeight;
    for (let y = total; y > 0; y -= 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 16));
    }
    for (let y = 0; y < total; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 16));
    }

    running = false;

    const domNodes = document.querySelectorAll("*").length;
    const cards = document.querySelectorAll('button[aria-label$="미리보기 열기"]').length;
    const heapMB =
      ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? 0) / 1048576;

    // 프레임 통계 (첫 5개는 워밍업 제외)
    const frames = frameDeltas.slice(5);
    const avgFrame = frames.reduce((a, b) => a + b, 0) / frames.length;
    const longFrames = frames.filter((f) => f > 50).length;
    const maxFrame = Math.max(...frames);

    return {
      domNodes,
      cards,
      heapMB: Math.round(heapMB * 10) / 10,
      avgFrameMs: Math.round(avgFrame * 100) / 100,
      longFrames,
      maxFrameMs: Math.round(maxFrame),
      totalFrames: frames.length,
    };
  });

  console.log("=== 측정 결과 ===");
  console.log(JSON.stringify(result, null, 2));

  // 끝까지 로드됐는지 확인 (측정 유효성)
  await expect(page.getByText("전부 봤어요", { exact: false })).toBeVisible();
});
