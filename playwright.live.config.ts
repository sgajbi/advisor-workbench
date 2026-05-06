import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/live",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "output/playwright/live-report" }]],
  use: {
    baseURL: process.env.LOTUS_WORKBENCH_LIVE_BASE_URL ?? "http://workbench.dev.lotus",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
