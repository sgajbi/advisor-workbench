import { defineConfig } from "@playwright/test";

export function resolvePlaywrightPort(value = process.env.PLAYWRIGHT_PORT): number {
  const rawValue = value?.trim() || "3000";
  if (!/^\d+$/.test(rawValue)) {
    throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
  }
  const port = Number.parseInt(rawValue, 10);
  if (port < 1 || port > 65_535) {
    throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
  }
  return port;
}

export function shouldReusePlaywrightServer({
  ci = process.env.CI,
  explicitPort = process.env.PLAYWRIGHT_PORT,
}: {
  ci?: string;
  explicitPort?: string;
} = {}): boolean {
  return !ci && !explicitPort;
}

const playwrightPort = resolvePlaywrightPort();
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  use: {
    baseURL: playwrightBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/testing/start-playwright-smoke-server.mjs",
    url: playwrightBaseUrl,
    reuseExistingServer: shouldReusePlaywrightServer(),
    timeout: 240_000,
  },
});
