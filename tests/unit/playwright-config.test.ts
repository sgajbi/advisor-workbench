import config from "../../playwright.config";

describe("playwright smoke configuration", () => {
  it("uses the dedicated clean-build smoke server script", () => {
    expect(Array.isArray(config.webServer)).toBe(false);
    if (Array.isArray(config.webServer) || !config.webServer) {
      throw new Error("Workbench Playwright smoke config must expose a single webServer contract.");
    }

    expect(config.webServer.command).toBe("node scripts/testing/start-playwright-smoke-server.mjs");
    expect(config.webServer.url).toBe("http://127.0.0.1:3000");
  });
});
