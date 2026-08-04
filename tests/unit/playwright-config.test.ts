import config, {
  resolvePlaywrightPort,
  shouldReusePlaywrightServer,
} from "../../playwright.config";

describe("playwright smoke configuration", () => {
  it("uses the dedicated clean-build smoke server script", () => {
    expect(Array.isArray(config.webServer)).toBe(false);
    if (Array.isArray(config.webServer) || !config.webServer) {
      throw new Error("Workbench Playwright smoke config must expose a single webServer contract.");
    }

    expect(config.webServer.command).toBe("node scripts/testing/start-playwright-smoke-server.mjs");
    expect(config.webServer.url).toBe("http://127.0.0.1:3000");
    expect(config.webServer.timeout).toBe(240_000);
  });

  it("validates explicit isolated smoke ports", () => {
    expect(resolvePlaywrightPort("31841")).toBe(31_841);
    expect(() => resolvePlaywrightPort("shared")).toThrow(
      "PLAYWRIGHT_PORT must be an integer between 1 and 65535."
    );
    expect(() => resolvePlaywrightPort("65536")).toThrow(
      "PLAYWRIGHT_PORT must be an integer between 1 and 65535."
    );
    expect(shouldReusePlaywrightServer({ ci: "", explicitPort: "" })).toBe(true);
    expect(
      shouldReusePlaywrightServer({ ci: "", explicitPort: "31841" })
    ).toBe(false);
    expect(shouldReusePlaywrightServer({ ci: "1", explicitPort: "" })).toBe(false);
  });
});
