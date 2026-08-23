import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { buildPlatformCapabilitiesFixture } from "./platform-capabilities-fixture";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceDirectory = path.resolve("output", "issue-731");
const recoveryEvidenceDirectory = path.resolve("output", "issue-729");
const navigationEvidenceDirectory = path.resolve("output", "playwright");

async function mockAdvisoryOverview(page: Page) {
  await page.route("**/api/bff/api/v1/platform/capabilities?**", async (route) => {
    await route.fulfill({ json: buildPlatformCapabilitiesFixture() });
  });
  await page.route("**/api/bff/api/v1/proposals?portfolio_id=**", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-advisory-overview-591",
        contract_version: "v1",
        data: {
          items: [
            {
              proposal_id: "PRP-RISK-001",
              portfolio_id: portfolioId,
              current_state: "RISK_REVIEW",
              title: "Technology concentration trim",
            },
            {
              proposal_id: "PRP-CONSENT-001",
              portfolio_id: portfolioId,
              current_state: "AWAITING_CLIENT_CONSENT",
              title: "Income mandate client discussion",
            },
            {
              proposal_id: "PRP-DRAFT-001",
              portfolio_id: portfolioId,
              current_state: "DRAFT",
              title: "Core fixed income allocation",
            },
            {
              proposal_id: "PRP-READY-001",
              portfolio_id: portfolioId,
              current_state: "EXECUTION_READY",
              title: "Approved allocation handoff",
            },
          ],
          next_cursor: "proposal-window-2",
        },
      },
    });
  });
}

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "intermediate", width: 1150, height: 1050 },
  { name: "tablet", width: 1024, height: 1100 },
  { name: "compact", width: 519, height: 1000 },
] as const;

for (const viewport of viewports) {
  test(`keeps Advisory Overview action-first at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockAdvisoryOverview(page);
    await page.goto(`/recommendations?portfolioId=${portfolioId}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { level: 1, name: "Advisory Overview" })).toBeVisible();
    await expect(page.getByTestId("advisory-overview-workspace")).toBeVisible();
    await expect(page.getByTestId("advisory-lifecycle-summary")).toContainText(
      "Move recommendations from insight to implementation"
    );
    await expect(page.getByTestId("advisory-priority-worklist")).toContainText(
      "Technology concentration trim"
    );
    await expect(page.getByTestId("advisory-source-window-posture")).toContainText(
      "Counts and ranking apply only to proposals visible in this source window"
    );
    await expect(page.getByText("Advisory Journey", { exact: true })).toHaveCount(0);

    const decision = page.getByTestId("advisory-decision-brief");
    const worklist = page.getByTestId("advisory-priority-worklist");
    const summary = page.getByLabel("Advisory overview summary");
    const lifecycle = page.getByTestId("advisory-lifecycle-summary");
    const [decisionBox, worklistBox, summaryBox, lifecycleBox] = await Promise.all([
      decision.boundingBox(),
      worklist.boundingBox(),
      summary.boundingBox(),
      lifecycle.boundingBox(),
    ]);
    expect(decisionBox).not.toBeNull();
    expect(worklistBox).not.toBeNull();
    expect(summaryBox).not.toBeNull();
    expect(lifecycleBox).not.toBeNull();
    expect(worklistBox!.y).toBeGreaterThan(decisionBox!.y);
    expect(summaryBox!.y).toBeGreaterThan(worklistBox!.y);
    expect(lifecycleBox!.y).toBeGreaterThan(summaryBox!.y);

    const metricTops = await summary.locator(".workbench-summary-metric-card").evaluateAll(
      (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)),
    );
    expect(metricTops).toHaveLength(4);
    if (viewport.width > 1280) {
      expect(new Set(metricTops).size).toBe(1);
    } else {
      expect(metricTops[0]).toBe(metricTops[1]);
      expect(metricTops[2]).toBe(metricTops[3]);
      expect(metricTops[2]).toBeGreaterThan(metricTops[0]);
    }

    const reviewContext = page.getByTestId("review-context-strip");
    const decisionPosture = page.getByText("Decision posture", { exact: true });
    const sourceBoundary = page.getByText("Source and scope", { exact: true });
    await expect(reviewContext).toBeVisible();
    await expect(sourceBoundary).toBeVisible();
    if (viewport.width <= 1200) {
      await expect(decisionPosture).toBeHidden();
    } else {
      await expect(decisionPosture).toBeVisible();
    }
    await expect(page.getByText("Workflow context", { exact: true })).toHaveCount(0);

    const priorityLink = worklist.getByRole("link", { name: "Technology concentration trim" });
    await priorityLink.focus();
    await expect(priorityLink).toBeFocused();
    const lifecycleLink = lifecycle.getByRole("link", { name: /Identify/ });
    await lifecycleLink.focus();
    await expect(lifecycleLink).toBeFocused();

    const navigation = page.getByRole("navigation", {
      name: "Workbench screen navigation",
    });
    const compactNavigation = viewport.width <= 1200;
    const currentView = page.getByRole("button", {
      name: /Current view Overview/i,
    });
    if (compactNavigation) {
      await expect(navigation).not.toBeVisible();
      await currentView.click();
    }
    await expect(navigation).toBeVisible();
    await expect(navigation).toHaveAttribute("data-default-destination-count", "6");
    await expect(
      navigation
        .getByRole("group", { name: "Primary workspaces" })
        .getByRole("link", { name: /Advice Priorities and recommendations/i }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      navigation
        .getByRole("group", { name: "Advisory lifecycle navigation" })
        .getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: "Cockpit" })).toHaveCount(0);

    const allWorkspaces = navigation.getByRole("button", {
      name: /All workspaces/i,
    });
    await allWorkspaces.click();
    const holdings = navigation.getByRole("link", {
      name: /Holdings Valuation and profit or loss/i,
    });
    await expect(holdings).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Risk Exposure and risk review/i })).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: /Proposals Advice lifecycle and approvals/i }),
    ).toBeVisible();
    await holdings.focus();
    await page.keyboard.press("Escape");
    await expect(allWorkspaces).toBeFocused();
    await expect(holdings).toHaveCount(0);

    const changeWorkflow = navigation.getByRole("button", {
      name: /Change workflow step/i,
    });
    await changeWorkflow.click();
    const cockpit = navigation.getByRole("link", { name: "Cockpit" });
    await expect(cockpit).toBeVisible();
    await cockpit.focus();
    await page.keyboard.press("Escape");
    await expect(changeWorkflow).toBeFocused();
    await expect(cockpit).toHaveCount(0);

    const hasHorizontalPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalPageOverflow).toBeFalsy();

    await mkdir(evidenceDirectory, { recursive: true });
    await mkdir(navigationEvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: path.join(
        navigationEvidenceDirectory,
        `issue-705-advisory-navigation-${viewport.name}.png`,
      ),
      fullPage: true,
      animations: "disabled",
    });
    if (compactNavigation) {
      await page.keyboard.press("Escape");
      await expect(currentView).toBeFocused();
      await expect(navigation).not.toBeVisible();
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
    await page.screenshot({
      path: path.join(evidenceDirectory, `advisory-overview-${viewport.name}-viewport.png`),
      animations: "disabled",
    });
    await page.screenshot({
      path: path.join(evidenceDirectory, `advisory-overview-${viewport.name}.png`),
      fullPage: true,
    });
  });
}

test("moves between source windows without presenting a window as the full portfolio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/bff/api/v1/proposals?portfolio_id=**", async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    await route.fulfill({
      json: {
        correlation_id: "corr-advisory-overview-window-591",
        contract_version: "v1",
        data: cursor
          ? {
              items: [
                {
                  proposal_id: "PRP-READY-002",
                  portfolio_id: portfolioId,
                  current_state: "EXECUTION_READY",
                  title: "Second-window implementation handoff",
                },
              ],
              next_cursor: null,
            }
          : {
              items: [],
              next_cursor: "proposal-window-2",
            },
      },
    });
  });

  await page.goto(`/recommendations?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByText("No proposals in this source window")).toBeVisible();
  await expect(page.getByText("No open advisory proposals")).toHaveCount(0);
  await page.getByRole("button", { name: "Next proposals" }).click();

  await expect(page.getByText("Second-window implementation handoff")).toBeVisible();
  await expect(page.getByText("Proposal view 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous proposals" })).toBeEnabled();
  await expect(page.getByTestId("advisory-source-window-posture")).toContainText(
    "Proposal window 2"
  );
});

test("recovers Advisory Overview from the Gateway without losing focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/bff/api/v1/platform/capabilities?**", async (route) => {
    await route.fulfill({ json: buildPlatformCapabilitiesFixture() });
  });

  let proposalRequestCount = 0;
  let releaseRetry!: () => void;
  const retryReleased = new Promise<void>((resolve) => {
    releaseRetry = resolve;
  });
  await page.route("**/api/bff/api/v1/proposals?portfolio_id=**", async (route) => {
    proposalRequestCount += 1;
    if (proposalRequestCount === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "source unavailable" }),
      });
      return;
    }

    await retryReleased;
    await route.fulfill({
      json: {
        correlation_id: "corr-advisory-recovery-729",
        contract_version: "v1",
        data: {
          items: [
            {
              proposal_id: "PRP-RECOVERED-729",
              portfolio_id: portfolioId,
              current_state: "RISK_REVIEW",
              title: "Recovered mandate risk review",
            },
          ],
          next_cursor: null,
        },
      },
    });
  });

  await page.goto(`/recommendations?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByText("Advisory priorities are unavailable")).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry advisory priorities" });
  await retry.focus();
  await retry.click();

  const pending = page.getByRole("button", { name: "Checking advisory priorities" });
  await expect(pending).toHaveAttribute("aria-disabled", "true");
  await expect(pending).toBeFocused();
  await pending.click({ force: true });
  expect(proposalRequestCount).toBe(2);

  releaseRetry();

  await expect(page.getByText("Recovered mandate risk review")).toBeVisible();
  await expect(page.getByText("Latest advisory priorities confirmed through Gateway.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh advisory priorities" })).toBeFocused();
  expect(proposalRequestCount).toBe(2);

  const hasHorizontalPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalPageOverflow).toBeFalsy();

  await mkdir(recoveryEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(recoveryEvidenceDirectory, "advisory-overview-source-recovery-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
});
