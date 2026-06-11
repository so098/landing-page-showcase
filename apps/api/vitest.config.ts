import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 통합 테스트는 단일 Postgres test DB를 공유한다. 파일 병렬 실행 시 각 파일의
    // beforeEach deleteMany(user/session/order 등)가 서로의 데이터를 지워 간헐 실패가
    // 난다 → 파일을 순차 실행해 격리한다(테스트 내 격리는 beforeEach가 담당).
    fileParallelism: false,
  },
});
