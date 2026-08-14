import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  REPORT_CENTRE_FIXTURE_PORTFOLIOS,
  startReportCentreFixtureGateway,
  type ReportCentreFixtureGateway,
} from "./report-centre-fixture-gateway";
import { resolveReportCentreFixtureScenario } from "./report-centre-fixture-scenario";

test.describe.configure({ mode: "default" });

const fixtureScenario = resolveReportCentreFixtureScenario(process.env);
test.skip(
  !fixtureScenario.enabled,
  "Report Centre state-matrix proof runs through its owned scenario command.",
);

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
  if (!fixtureScenario.enabled) {
    return;
  }
  fixtureGateway = await startReportCentreFixtureGateway({ port: fixtureScenario.port });
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

  const rail = page.getByTestId("portfolio-screen-rail");
  const inactiveRailLabel = rail
    .locator('a:not([aria-current="page"]) span')
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
  const railBox = await page.getByTestId("portfolio-screen-rail").boundingBox();
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

test("orders a reviewed portfolio bundle and renders source-owned outcomes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.ready}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("radio", { name: /Portfolio bundle/ }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /Report Centre recovery mandate/ }).click();
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Portfolio Bundle" })).toBeEnabled();
  const submitBundle = page.getByRole("button", { name: "Submit Portfolio Bundle" });
  await expect(submitBundle).toBeDisabled();
  const disabledActionStyle = await submitBundle.evaluate((button) => {
    const computed = window.getComputedStyle(button);
    return { background: computed.backgroundImage, color: computed.color, cursor: computed.cursor };
  });
  expect(disabledActionStyle.cursor).toBe("not-allowed");
  await captureDiagnosticScreenshot(page, "portfolio-bundle-selection-1440");

  await page.getByRole("button", { name: "Review Portfolio Bundle" }).click();
  await expect(submitBundle).toBeEnabled();
  await expect
    .poll(() => submitBundle.evaluate((button) => window.getComputedStyle(button).color))
    .toBe("rgb(255, 255, 255)");
  const enabledActionStyle = await submitBundle.evaluate((button) => {
    const computed = window.getComputedStyle(button);
    return { background: computed.backgroundImage, color: computed.color, cursor: computed.cursor };
  });
  expect(enabledActionStyle.cursor).toBe("pointer");
  expect(enabledActionStyle.background).not.toBe(disabledActionStyle.background);
  expect(enabledActionStyle.color).not.toBe(disabledActionStyle.color);
  await submitBundle.click();

  await expect(
    page.getByRole("status").getByRole("heading", { name: "Portfolio bundle accepted" }),
  ).toBeVisible();
  const outcomes = page.getByRole("table", { name: "Portfolio report bundle outcomes" });
  await expect(outcomes).toBeVisible();
  await expect(outcomes.getByText(REPORT_CENTRE_FIXTURE_PORTFOLIOS.ready)).toBeVisible();
  await expect(outcomes.getByText(REPORT_CENTRE_FIXTURE_PORTFOLIOS.recovery)).toBeVisible();
  await expect(outcomes.getByText("Report data complete")).toBeVisible();
  await expect(outcomes.getByText("Needs retry")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Portfolio bundle completion" })).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(page.getByText("Client delivery", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await captureDiagnosticScreenshot(page, "portfolio-bundle-outcomes-1440");
});

test("tracks an accepted request and deliberately starts a second at constrained width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 1000 });
  await page.goto(`/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.ready}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Review Request" }).click();
  await page.getByRole("button", { name: "Submit Report Request" }).click();

  const acceptedStatus = page.getByRole("status");
  await expect(
    acceptedStatus.getByRole("heading", { name: "Report request accepted" }),
  ).toBeVisible();
  await expect(page.getByText("Report request accepted")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Approved report" })).toHaveCount(0);
  const compactHistory = page.getByRole("list", {
    name: "Recent portfolio report request details",
  });
  await expect(compactHistory).toBeVisible();
  const readinessRegion = page.getByRole("region", { name: "Report request readiness" });
  await readinessRegion.getByText("Support reference", { exact: true }).click();
  await expect(readinessRegion.getByText("rjob_e2e_1", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create another report" }).click();
  const configuration = page.getByLabel("Report configuration");
  await expect(configuration).toBeFocused();
  await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Report Request" })).toBeDisabled();

  await page.getByRole("button", { name: "Review Request" }).click();
  await page.getByRole("button", { name: "Submit Report Request" }).click();
  await expect(
    acceptedStatus.getByRole("heading", { name: "Report request accepted" }),
  ).toBeVisible();
  await readinessRegion.getByText("Support reference", { exact: true }).click();
  await expect(readinessRegion.getByText("rjob_e2e_2", { exact: true })).toBeVisible();

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(720);
  await captureDiagnosticScreenshot(page, "accepted-next-request-720");
});

test("keeps report lifecycle and support discoverable across tablet and compact layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.goto(`/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.ready}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible({
    timeout: 15_000,
  });
  const workstationHistory = page.getByRole("table", {
    name: "Recent portfolio report requests",
  });
  await expect(workstationHistory).toBeVisible();
  await expect(workstationHistory.getByText("Report data complete")).toBeVisible();
  const workstationSupport = workstationHistory.getByText("Support reference", {
    exact: true,
  });
  await expect(workstationSupport).toBeVisible();
  await workstationSupport.focus();
  await expect(workstationSupport).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(workstationHistory.getByText("rjob_1", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  await captureDiagnosticScreenshot(page, "request-history-tablet-1024");

  await page.setViewportSize({ width: 519, height: 1000 });
  const compactHistory = page.getByRole("list", {
    name: "Recent portfolio report request details",
  });
  await expect(workstationHistory).not.toBeVisible();
  await expect(compactHistory).toBeVisible();
  const record = compactHistory.getByRole("article", { name: "Portfolio review" });
  await expect(record.getByText("Report data complete")).toBeVisible();
  await expect(
    record.getByText("Report data is complete. Archive and client delivery remain separate states."),
  ).toBeVisible();
  await expect(record.getByText("Report date", { exact: true })).toBeVisible();
  await expect(record.getByText("22 Apr 2026", { exact: true })).toBeVisible();
  await expect(record.getByText("Requested", { exact: true })).toBeVisible();

  const compactSupport = record.getByText("Support reference", { exact: true });
  await compactSupport.focus();
  await expect(compactSupport).toBeFocused();
  const compactSupportHeight = await compactSupport.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(compactSupportHeight).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(record.getByText("rjob_1", { exact: true })).toBeVisible();
  await expect(compactSupport).toBeFocused();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(519);
  await captureDiagnosticScreenshot(page, "request-history-compact-519");
});

test("keeps Reporting task-aware while every specialist workspace remains reachable", async ({
  page,
}) => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "tablet", width: 1024, height: 1100 },
    { name: "compact", width: 519, height: 1000 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(
      `/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.ready}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible({
      timeout: 15_000,
    });

    const navigation = page.getByRole("navigation", {
      name: "Workbench screen navigation",
    });
    const compactNavigation = viewport.width <= 1200;
    const currentView = page.getByRole("button", {
      name: /Current view Reporting/i,
    });
    if (compactNavigation) {
      await expect(navigation).not.toBeVisible();
      await currentView.click();
    }
    await expect(navigation).toBeVisible();
    await expect(navigation).toHaveAttribute("data-default-destination-count", "5");
    await expect(
      navigation
        .getByRole("group", { name: "Primary workspaces" })
        .getByRole("link", { name: /Reporting Order and monitor reports/i }),
    ).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByText("Current workflow", { exact: true })).toHaveCount(0);

    const allWorkspaces = navigation.getByRole("button", {
      name: /All workspaces/i,
    });
    await allWorkspaces.click();
    const holdings = navigation.getByRole("link", {
      name: /Holdings Valuation and profit or loss/i,
    });
    await expect(holdings).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: /Risk Exposure and risk review/i }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: /Proposals Advice lifecycle and approvals/i }),
    ).toBeVisible();
    await holdings.focus();
    await page.keyboard.press("Escape");
    await expect(allWorkspaces).toBeFocused();
    await expect(holdings).toHaveCount(0);

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(viewport.width + 2);
    await page.screenshot({
      path: `output/playwright/issue-705-reporting-navigation-${viewport.name}.png`,
      fullPage: true,
      animations: "disabled",
    });

    if (compactNavigation) {
      await page.keyboard.press("Escape");
      await expect(currentView).toBeFocused();
      await expect(navigation).not.toBeVisible();
    }
  }
});

for (const { width, stacked } of [
  { width: 721, stacked: false },
  { width: 720, stacked: true },
  { width: 673, stacked: true },
  { width: 672, stacked: true },
  { width: 664, stacked: true },
  { width: 641, stacked: true },
  { width: 640, stacked: true },
  { width: 620, stacked: true },
  { width: 600, stacked: true },
  { width: 580, stacked: true },
  { width: 561, stacked: true },
]) {
  test(`respects the shared rail content capacity at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(
      `/reports?portfolioId=${REPORT_CENTRE_FIXTURE_PORTFOLIOS.ready}`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible({
      timeout: 15_000,
    });
    const railHeader = page.getByTestId("portfolio-screen-rail-header");
    await expect(railHeader).toBeVisible();
    const railHeaderFits = await railHeader.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    );
    expect(railHeaderFits).toBe(true);
    const headerRegions = await railHeader.evaluate((element) =>
      Array.from(element.children, (child) => {
        const bounds = child.getBoundingClientRect();
        return {
          left: Math.round(bounds.left),
          top: Math.round(bounds.top),
          fits: child.scrollWidth <= child.clientWidth + 1,
        };
      }),
    );
    expect(headerRegions).toHaveLength(3);
    expect(headerRegions.every((region) => region.fits)).toBe(true);
    if (stacked) {
      expect(headerRegions[0].top).toBeLessThan(headerRegions[1].top);
      expect(headerRegions[1].top).toBeLessThan(headerRegions[2].top);
    } else {
      expect(headerRegions[0].left).toBeLessThan(headerRegions[1].left);
      expect(headerRegions[1].left).toBeLessThan(headerRegions[2].left);
    }
    const rail = page.getByTestId("portfolio-screen-rail");
    expect(
      await computedContrastRatio(
        page,
        rail.getByText("Selected portfolio", { exact: true }),
        rail,
      ),
    ).toBeGreaterThanOrEqual(4.5);

    const disclosure = page.getByRole("button", { name: /Current view Reporting/ });
    await disclosure.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("navigation", { name: "Workbench screen navigation" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(disclosure).toBeFocused();

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(width);
    await captureDiagnosticScreenshot(page, `ready-capacity-${width}`);
  });
}

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
  const disclosure = page.getByRole("button", { name: /Current view Reporting/ });
  await expect(disclosure).toBeVisible();
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation", { name: "Workbench screen navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(disclosure).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Workbench screen navigation" }),
  ).not.toBeVisible();

  const railBox = await page.getByTestId("portfolio-screen-rail").boundingBox();
  expect(railBox?.height).toBeLessThanOrEqual(150);
  const changePortfolio = page.getByLabel("Change portfolio");
  const portfolioContextFits = await changePortfolio.evaluate((element) => {
    const contextSwitcher = element.closest("div");
    return Boolean(
      contextSwitcher && contextSwitcher.scrollWidth <= contextSwitcher.clientWidth + 1,
    );
  });
  expect(portfolioContextFits).toBe(true);
  await changePortfolio.focus();
  await page.keyboard.press("Enter");
  const portfolioOptions = page.getByRole("list", { name: "Portfolio context options" });
  await expect(portfolioOptions).toBeVisible();
  expect(
    await computedContrastRatio(page, portfolioOptions.locator("strong").first(), portfolioOptions),
  ).toBeGreaterThanOrEqual(4.5);
  await changePortfolio.click();
  await expect(portfolioOptions).not.toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(519);
  await captureDiagnosticScreenshot(page, "ready-mobile-519");
});
