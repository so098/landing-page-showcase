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
    // false: 포트 3000에 떠 있는 (dev) 서버를 절대 재사용하지 않는다.
    // 성능 측정(Before/After)이 dev 서버로 오염되는 것을 방지 — 측정 재현성이 이 프로젝트의 핵심.
    // 포트가 점유돼 있으면 에러가 나므로, E2E 전에 dev 웹 서버를 종료할 것.
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
