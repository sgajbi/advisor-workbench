import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  REPORT_CENTRE_FIXTURE_PORTFOLIOS,
  startReportCentreFixtureGateway,
  type ReportCentreFixtureGateway,
} from "./report-centre-fixture-gateway";

test.describe.configure({ mode: "default" });

let fixtureGateway: ReportCentreFixtureGateway | null = null;

async function captureDiagnosticScreenshot(page: Page, name: string): Promise<void> {
  if (process.env.LOTUS_CAPTURE_DIAGNOSTIC_SCREENSHOTS !== "1") {
    return;
  }
  await page.screenshot({
    path: `output/playwright/diagnostic-report-centre-${name}.png`,
    fullPage: true,
  });
}

async function computedContrastRatio(
  page: Page,
  foreground: Locator,
  background: Locator,
): Promise<number> {
  const foregroundElement = await foreground.elementHandle();
  const backgroundElement = await background.elementHandle();
  if (!foregroundElement || !backgroundElement) {
    throw new Error("Contrast proof requires both rendered elements.");
  }

  return page.evaluate(
    ({ foregroundElement, backgroundElement }) => {
      function rgb(value: string): [number, number, number] {
        const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
        if (!channels || channels.length !== 3) {
          throw new Error(`Expected an RGB color, received ${value}.`);
        }
        return channels as [number, number, number];
      }

      function luminance(value: string): number {
        const channels = rgb(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      }

      const foregroundLuminance = luminance(getComputedStyle(foregroundElement).color);
      const backgroundLuminance = luminance(getComputedStyle(backgroundElement).backgroundColor);
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);
      return (lighter + 0.05) / (darker + 0.05);
    },
    {
      foregroundElement,
      backgroundElement,
    },
  );
}

test.beforeAll(async () => {
  const port = Number(process.env.REPORT_CENTRE_E2E_FIXTURE_PORT ?? "18101");
  if (
    process.env.BFF_BASE_URL !== `http://127.0.0.1:${port}` ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "report-centre" ||
    process.env.REPORT_CENTRE_E2E_FIXTURE !== "state-matrix"
  ) {
    throw new Error(`Report Centre fixture proof requires the owned gateway on port ${port}.`);
  }
  fixtureGateway = await startReportCentreFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("recovers both Report Centre regions from a source failure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    `/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.recovery}`,
    { waitUntil: "domcontentloaded" },
  );

  await expect(
    page.getByText("Approved reports are unavailable", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  const unavailableStatus = page.getByRole("status");
  await expect(
    unavailableStatus.getByRole("heading", { name: "Report ordering unavailable" }),
  ).toBeVisible();
  await expect(unavailableStatus.getByLabel("Status Unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Request" })).toHaveCount(0);
  await expect(page.getByText("Loading report readiness")).toHaveCount(0);

  await page.getByRole("button", { name: "Try Again" }).click();

  await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible();
  await expect(page.getByLabel("Status Ready for review")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Request" })).toBeEnabled();

  const rail = page.locator(".portfolio-screen-rail");
  const inactiveRailLabel = page
    .locator(".portfolio-screen-rail-link:not(.portfolio-screen-rail-link-active) span")
    .first();
  expect(await computedContrastRatio(page, inactiveRailLabel, rail)).toBeGreaterThanOrEqual(4.5);
  expect(
    await computedContrastRatio(page, page.getByLabel("Change portfolio"), rail),
  ).toBeGreaterThanOrEqual(4.5);
  await captureDiagnosticScreenshot(page, "recovery-desktop-1440");
});

test("keeps restricted state coherent at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(
    `/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.restricted}`,
    { waitUntil: "domcontentloaded" },
  );

  await expect(
    page.getByText("Report ordering is restricted", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  const restrictedStatus = page.getByRole("status");
  await expect(
    restrictedStatus.getByRole("heading", { name: "Report ordering restricted" }),
  ).toBeVisible();
  await expect(restrictedStatus.getByLabel("Status Restricted")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Request" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit Report Request" })).toHaveCount(0);

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(768);
  const railBox = await page.locator(".portfolio-screen-rail").boundingBox();
  expect(railBox?.height).toBeLessThanOrEqual(100);
  await captureDiagnosticScreenshot(page, "restricted-tablet-768");
});

test("renders a genuine empty catalogue without dead-end actions", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(
    `/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.empty}`,
    { waitUntil: "domcontentloaded" },
  );

  await expect(page.getByText("No approved reports available")).toHaveCount(2, {
    timeout: 15_000,
  });
  await expect(page.getByLabel("Status No approved reports")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Request" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit Report Request" })).toHaveCount(0);

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(1024);
  const railBox = await page.locator(".workstation-shell-rail").boundingBox();
  const mainBox = await page.locator(".workstation-shell-main").boundingBox();
  const sideBox = await page.locator(".workstation-shell-side").boundingBox();
  expect(railBox?.width).toBeGreaterThan(800);
  expect(railBox?.height).toBeLessThanOrEqual(100);
  expect(mainBox?.width).toBeGreaterThan(800);
  expect(sideBox?.width).toBeGreaterThan(800);
  expect(mainBox?.y).toBeGreaterThanOrEqual((railBox?.y ?? 0) + (railBox?.height ?? 0));
  expect(sideBox?.y).toBeGreaterThanOrEqual((mainBox?.y ?? 0) + (mainBox?.height ?? 0));
  await captureDiagnosticScreenshot(page, "empty-compact-1024");
});

test("keeps portfolio context and navigation compact and keyboard-complete on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 519, height: 900 });
  await page.goto(`/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.ready}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible({
    timeout: 15_000,
  });
  const disclosure = page.getByRole("button", { name: /Current view Reports/ });
  await expect(disclosure).toBeVisible();
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation", { name: "Workbench screen navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(disclosure).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Workbench screen navigation" }),
  ).not.toBeVisible();

  const railBox = await page.locator(".portfolio-screen-rail").boundingBox();
  expect(railBox?.height).toBeLessThanOrEqual(150);
  const portfolioContextFits = await page.getByLabel("Change portfolio").evaluate((element) => {
    const contextSwitcher = element.closest("div");
    return Boolean(
      contextSwitcher && contextSwitcher.scrollWidth <= contextSwitcher.clientWidth + 1,
    );
  });
  expect(portfolioContextFits).toBe(true);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(519);
  await captureDiagnosticScreenshot(page, "ready-mobile-519");
});
