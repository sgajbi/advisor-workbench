import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import {
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceDirectory = process.env.MANAGE_REBALANCE_EVIDENCE_DIR
  ? path.resolve(process.env.MANAGE_REBALANCE_EVIDENCE_DIR)
  : null;
let fixtureGateway: ManageFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.MANAGE_E2E_FIXTURE !== "rebalance-waves") {
    return;
  }
  const port = Number(process.env.MANAGE_E2E_FIXTURE_PORT ?? "18150");
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "manage"
  ) {
    throw new Error(
      `Manage fixture proof requires the owned gateway at ${expectedGateway}.`,
    );
  }
  fixtureGateway = await startManageFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("Rebalance Waves keeps source context and the portfolio decision first", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureGateway, "Owned Manage fixture is not active.");
  test.setTimeout(180_000);
  const runtime = observeBrowserRuntimeFailures(page);
  if (evidenceDirectory) {
    await mkdir(evidenceDirectory, { recursive: true });
  }

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 721, height: 900 },
    { width: 720, height: 900 },
    { width: 519, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/workbench/${portfolioId}?mode=waves`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const workspace = page.locator("#rebalance-workspace");
    await expect(workspace).toBeVisible({ timeout: 60_000 });
    await expect(
      workspace.getByRole("heading", { name: "Rebalance", exact: true }),
    ).toBeVisible({
      timeout: 60_000,
    });
    const context = page.getByLabel("Rebalance source context");
    await expect(context).toContainText("Discretionary Global Balanced");
    await expect(context).toContainText("SGD");
    await expect(context).toContainText("As of 03 May 2026");
    await expect(context).toContainText("Evidence not requested");
    await expect(
      page.getByText("Discretionary Balanced", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("USD", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Filter", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("check_circle", { exact: true })).toHaveCount(0);
    await expect(page.getByText("chevron_right", { exact: true })).toHaveCount(0);

    const order = await page.evaluate(() => {
      const ids = [
        "rebalance-active-title",
        "rebalance-proposed-title",
        "dpm-wave-decision-support-title",
        "campaign-definitions-title",
      ];
      return ids.map((id) => {
        const element = document.getElementById(id);
        if (!element) {
          throw new Error(`Missing rebalance section ${id}.`);
        }
        return element.getBoundingClientRect().top + window.scrollY;
      });
    });
    expect(order).toEqual([...order].sort((left, right) => left - right));

    const loadChanges = page.getByRole("button", { name: "Load Changes" });
    await loadChanges.focus();
    await expect(loadChanges).toBeFocused();
    await loadChanges.click();
    const changes = page.getByRole("table", {
      name: "Proposed rebalance changes",
    });
    await expect(changes.getByText("AAPL US")).toBeVisible();
    await expect(changes.getByText("Equity overweight")).toBeVisible();

    const campaignWorkspace = page.getByLabel("Selected campaign decision workspace");
    await expect(campaignWorkspace).toBeVisible();
    const campaignOptions = page.getByRole("option");
    await expect(campaignOptions).toHaveCount(2);
    const firstCampaign = campaignOptions.nth(0);
    const secondCampaign = campaignOptions.nth(1);
    await expect(firstCampaign).toHaveAttribute("aria-selected", "true");
    await firstCampaign.focus();
    await firstCampaign.press("ArrowDown");
    await expect(secondCampaign).toBeFocused();
    await expect(secondCampaign).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator('[data-selected-campaign="campaign-holdings-202605:2026.06"]'),
    ).toContainText("Singapore balanced mandate refresh");
    await expect(page.getByText("Source evidence current")).toBeVisible();
    await expect(secondCampaign).toBeFocused();
    await secondCampaign.press("ArrowUp");
    await expect(firstCampaign).toBeFocused();
    await expect(firstCampaign).toHaveAttribute("aria-selected", "true");

    await page.getByRole("button", { name: "Launch decision" }).click();
    await expect(
      page.getByRole("heading", { name: "Campaign launch decision" }),
    ).toBeVisible();
    const launchButton = page.getByRole("button", { name: "Launch rebalance wave" });
    await expect(launchButton).toBeDisabled();
    await page
      .getByRole("checkbox", {
        name: /I reviewed the source readiness.*one governed rebalance wave.*does not approve trades or send orders/i,
      })
      .check();
    await expect(launchButton).toBeEnabled();
    await launchButton.click();
    await expect(page.getByText("dwv_campaign_2026_05")).toBeVisible();
    await expect(page.getByRole("button", { name: "Launch rebalance wave" })).toBeDisabled();

    const overflowEvidence = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            element: element.tagName.toLowerCase(),
            className: element.className.toString().slice(0, 160),
            overflowX: getComputedStyle(element).overflowX,
            minWidth: getComputedStyle(element).minWidth,
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
            width: Math.round(bounds.width),
            scrollWidth: element.scrollWidth,
          };
        })
        .filter(
          ({ left, right, width }) =>
            width > 0 && (left < -1 || right > clientWidth + 1),
        )
        .sort((left, right) => right.right - left.right)
        .slice(0, 24);
      const overflowContainers = [
        document.body,
        ...document.querySelectorAll<HTMLElement>("body *"),
      ]
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            element: element.tagName.toLowerCase(),
            className: element.className.toString().slice(0, 160),
            overflowX: getComputedStyle(element).overflowX,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
            width: Math.round(bounds.width),
          };
        })
        .filter(({ clientWidth, scrollWidth }) => scrollWidth > clientWidth + 1)
        .filter(
          ({ right, width }) =>
            right <= clientWidth + 100 && width <= clientWidth + 100,
        )
        .slice(0, 32);
      return {
        clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        offenders,
        overflowContainers,
      };
    });
    expect(
      overflowEvidence.documentWidth,
      `Rebalance Waves has page-level horizontal overflow at ${viewport.width}px: ${JSON.stringify(overflowEvidence)}`,
    ).toBeLessThanOrEqual(overflowEvidence.clientWidth);

    const screenshot = await page.screenshot({
      fullPage: true,
      path: evidenceDirectory
        ? path.join(evidenceDirectory, `rebalance-waves-${viewport.width}.png`)
        : undefined,
    });
    await testInfo.attach(`rebalance-waves-${viewport.width}`, {
      body: screenshot,
      contentType: "image/png",
    });
  }

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
