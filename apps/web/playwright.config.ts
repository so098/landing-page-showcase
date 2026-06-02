import { defineConfig } from "@playwright/test";

// E2E 전제: API(4000) + DB(docker)가 떠 있고 시드 완료 상태.
// web은 프로덕션 빌드를 webServer로 자동 기동한다.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  // 측정 정확도를 위해 직렬 실행
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx next build && npx next start -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
