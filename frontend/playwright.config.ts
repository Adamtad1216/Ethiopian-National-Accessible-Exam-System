import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  webServer: [
    {
      command: "npm --prefix ../backend run dev",
      url: "http://localhost:4000/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev:student",
      url: "http://localhost:6031",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev:staff",
      url: "http://localhost:6032",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:6032",
    trace: "on-first-retry",
  },
});
