import { expect, type Page } from "@playwright/test";

export type BrowserRuntimeFailure = {
  source: "console" | "pageerror";
  message: string;
  url?: string;
};

export function observeBrowserRuntimeFailures(page: Page) {
  const failures: BrowserRuntimeFailure[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      failures.push({
        source: "console",
        message: message.text(),
        ...(location.url ? { url: location.url } : {}),
      });
    }
  });
  page.on("pageerror", (error) => {
    failures.push({ source: "pageerror", message: error.message });
  });

  return {
    snapshot: () => failures.map((failure) => ({ ...failure })),
    assertStylesAreHeadManaged: async () => {
      await expect(page.locator("body style[data-emotion]")).toHaveCount(0);
      expect(await page.locator("head style[data-emotion]").count()).toBeGreaterThan(0);
    },
    assertClean: () => {
      expect(
        failures,
        "Production browser proof must not emit console or uncaught page errors.",
      ).toEqual([]);
    },
  };
}
