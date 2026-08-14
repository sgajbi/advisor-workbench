import { expect, test } from "@playwright/test";

const PUBLIC_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

test("delivers governed typography from Workbench without layout regression or public egress", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);

  const fontRequests: string[] = [];
  const publicFontRequests: string[] = [];
  const failedFontResponses: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (PUBLIC_FONT_HOSTS.has(url.hostname)) {
      publicFontRequests.push(request.url());
    }
    if (request.resourceType() === "font") {
      fontRequests.push(request.url());
    }
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "font" && !response.ok()) {
      failedFontResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/intake", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Portfolio Intake" })).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);

  const desktopTypography = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const brand = document.querySelector<HTMLElement>(".shell-brand-text");
    if (!brand) {
      throw new Error("Lotus shell brand text is missing.");
    }

    return {
      delivery: root.dataset.fontDelivery,
      ui: getComputedStyle(body).fontFamily,
      display: getComputedStyle(brand).fontFamily,
      displayWeight: getComputedStyle(brand).fontWeight,
      fontStatus: document.fonts.status,
      overflow: root.scrollWidth - root.clientWidth,
    };
  });

  expect(desktopTypography.delivery).toBe("self-hosted");
  expect(desktopTypography.ui).not.toBe(desktopTypography.display);
  expect(desktopTypography.displayWeight).toBe("700");
  expect(desktopTypography.fontStatus).toBe("loaded");
  expect(desktopTypography.overflow).toBeLessThanOrEqual(0);
  await page.screenshot({
    path: testInfo.outputPath("typography-desktop.png"),
    fullPage: true,
  });

  await page.evaluate(async () => {
    const evidence = document.createElement("span");
    evidence.textContent = "PB_SG_GLOBAL_BAL_001";
    evidence.style.cssText = [
      "font-family: var(--font-mono)",
      "font-weight: 500",
      "position: fixed",
      "left: -10000px",
    ].join(";");
    document.body.append(evidence);
    await document.fonts.ready;
    const computedFamily = getComputedStyle(evidence).fontFamily;
    evidence.remove();
    document.body.dataset.evidenceFontFamily = computedFamily;
  });
  const evidenceFontFamily = await page.locator("body").getAttribute("data-evidence-font-family");
  expect(evidenceFontFamily).not.toBe(desktopTypography.ui);
  expect(evidenceFontFamily).not.toBe(desktopTypography.display);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Portfolio Intake" })).toBeVisible();
  const compactGeometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    brandVisible: Boolean(document.querySelector<HTMLElement>(".shell-brand-text")?.offsetParent),
    ui: getComputedStyle(document.body).fontFamily,
  }));

  expect(compactGeometry.overflow).toBeLessThanOrEqual(0);
  expect(compactGeometry.brandVisible).toBe(true);
  expect(compactGeometry.ui).toBe(desktopTypography.ui);
  await page.screenshot({
    path: testInfo.outputPath("typography-compact.png"),
    fullPage: true,
  });
  expect(publicFontRequests).toEqual([]);
  expect(failedFontResponses).toEqual([]);
  expect(fontRequests.length).toBeGreaterThanOrEqual(3);
  const workbenchOrigin = new URL(page.url()).origin;
  expect(
    fontRequests.every((url) => {
      const parsedUrl = new URL(url);
      return parsedUrl.origin === workbenchOrigin && parsedUrl.pathname.endsWith(".woff2");
    }),
  ).toBe(true);
});
