import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { buildPlatformCapabilitiesFixture } from "./platform-capabilities-fixture";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceDirectory = path.resolve(
  process.env.ISSUE_811_EVIDENCE_DIR ?? path.join("output", "issue-811"),
  "advisory-overview",
);
const recoveryEvidenceDirectory = path.resolve("output", "issue-729");
const navigationEvidenceDirectory = path.resolve("output", "playwright");

async function mockAdvisoryOverview(page: Page) {
  await page.route(
    "**/api/bff/api/v1/platform/capabilities?**",
    async (route) => {
      await route.fulfill({ json: buildPlatformCapabilitiesFixture() });
    },
  );
  await page.route(
    "**/api/bff/api/v1/proposals?portfolio_id=**",
    async (route) => {
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
    },
  );
}

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "intermediate", width: 1150, height: 1050 },
  { name: "tablet", width: 1024, height: 1100 },
  { name: "compact", width: 519, height: 1000 },
] as const;

for (const viewport of viewports) {
  test(`keeps Advisory Overview action-first at ${viewport.name} width`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await mockAdvisoryOverview(page);
    await page.goto(`/recommendations?portfolioId=${portfolioId}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", { level: 1, name: "Advisory Overview" }),
    ).toBeVisible();
    await expect(page.getByTestId("advisory-overview-workspace")).toBeVisible();
    await expect(page.getByTestId("advisory-priority-worklist")).toContainText(
      "Technology concentration trim",
    );
    await expect(
      page.getByTestId("advisory-source-window-posture"),
    ).toContainText(
      "Counts and ranking apply only to proposals visible in this source window",
    );
    await expect(
      page.getByText("Advisory Journey", { exact: true }),
    ).toHaveCount(0);

    const decision = page.getByTestId("advisory-decision-brief");
    const worklist = page.getByRole("listbox", {
      name: "Advisory proposal decision worklist",
    });
    const selectedDecision = page.getByRole("region", {
      name: "Selected advisory proposal",
    });
    const [decisionBox, firstRowBox, selectedDecisionBox] = await Promise.all([
      decision.boundingBox(),
      worklist.getByRole("option").first().boundingBox(),
      selectedDecision.boundingBox(),
    ]);
    expect(decisionBox).not.toBeNull();
    expect(firstRowBox).not.toBeNull();
    expect(selectedDecisionBox).not.toBeNull();
    const actionBox = await selectedDecision
      .getByRole("link", { name: "Open proposal review" })
      .boundingBox();
    expect(actionBox).not.toBeNull();
    expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(
      selectedDecisionBox!.x + selectedDecisionBox!.width,
    );
    if (viewport.width === 1440) {
      expect(decisionBox!.y).toBeLessThan(900);
      expect(firstRowBox!.y).toBeLessThan(900);
      expect(selectedDecisionBox!.y).toBeLessThan(900);
    }
    if (viewport.width <= 900) {
      expect(selectedDecisionBox!.y).toBeGreaterThanOrEqual(
        firstRowBox!.y + firstRowBox!.height,
      );
    }

    await expect(worklist.getByRole("option")).toHaveCount(4);
    await expect(
      page.getByText("4 items need action", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByText("Risk review required", { exact: true }),
    ).toHaveCount(1);
    await expect(page.getByText("Blocked", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Advisory overview summary")).toHaveCount(0);
    await expect(page.getByTestId("advisory-lifecycle-summary")).toHaveCount(0);

    const reviewContext = page.getByTestId("review-context-strip");
    const sourceBoundary = page.getByText("Proposal coverage", { exact: true });
    await expect(reviewContext).toBeVisible();
    await expect(sourceBoundary).toBeVisible();
    await expect(
      page.getByText("Decision posture", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Workflow context", { exact: true }),
    ).toHaveCount(0);

    const firstOption = worklist.getByRole("option").first();
    await firstOption.focus();
    await firstOption.press("ArrowDown");
    const secondOption = worklist.getByRole("option").nth(1);
    await expect(secondOption).toBeFocused();
    await expect(secondOption).toHaveAttribute("aria-selected", "true");
    await expect(
      selectedDecision.getByRole("heading", { name: "Record client consent" }),
    ).toBeVisible();
    await secondOption.press("Home");
    await expect(firstOption).toBeFocused();
    await firstOption.press("Enter");
    await expect(selectedDecision).toBeFocused();

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
    await expect(navigation).toHaveAttribute(
      "data-default-destination-count",
      "6",
    );
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
    await expect(navigation.getByRole("link", { name: "Cockpit" })).toHaveCount(
      0,
    );

    const allWorkspaces = navigation.getByRole("button", {
      name: /All workspaces/i,
    });
    await allWorkspaces.click();
    const positions = navigation.getByRole("link", {
      name: /Positions Valuation and profit or loss/i,
    });
    await expect(positions).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: /Risk Exposure and risk review/i }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", {
        name: /Proposals Advice lifecycle and approvals/i,
      }),
    ).toBeVisible();
    await positions.focus();
    await page.keyboard.press("Escape");
    await expect(allWorkspaces).toBeFocused();
    await expect(positions).toHaveCount(0);

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
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
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
    await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur(),
    );
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
    await page.screenshot({
      path: path.join(
        evidenceDirectory,
        `advisory-overview-${viewport.name}-viewport.png`,
      ),
      animations: "disabled",
    });
    await page.screenshot({
      path: path.join(
        evidenceDirectory,
        `advisory-overview-${viewport.name}.png`,
      ),
      fullPage: true,
    });
  });
}

test("moves between source windows without presenting a window as the full portfolio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route(
    "**/api/bff/api/v1/proposals?portfolio_id=**",
    async (route) => {
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
    },
  );

  await page.goto(`/recommendations?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByText("No proposals in this source window"),
  ).toBeVisible();
  await expect(page.getByText("No open advisory proposals")).toHaveCount(0);
  await page.getByRole("button", { name: "Next proposals" }).click();

  await expect(
    page.getByText("Second-window implementation handoff"),
  ).toBeVisible();
  await expect(page.getByText("Proposal view 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous proposals" }),
  ).toBeEnabled();
  await expect(
    page.getByTestId("advisory-source-window-posture"),
  ).toContainText("Proposal window 2");
});

test("recovers Advisory Overview from the Gateway without losing focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route(
    "**/api/bff/api/v1/platform/capabilities?**",
    async (route) => {
      await route.fulfill({ json: buildPlatformCapabilitiesFixture() });
    },
  );

  let proposalRequestCount = 0;
  let releaseRetry!: () => void;
  const retryReleased = new Promise<void>((resolve) => {
    releaseRetry = resolve;
  });
  await page.route(
    "**/api/bff/api/v1/proposals?portfolio_id=**",
    async (route) => {
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
    },
  );

  await page.goto(`/recommendations?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByText("Advisory priorities are unavailable"),
  ).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry advisory priorities" });
  await retry.focus();
  await retry.click();

  const pending = page.getByRole("button", {
    name: "Checking advisory priorities",
  });
  await expect(pending).toHaveAttribute("aria-disabled", "true");
  await expect(pending).toBeFocused();
  await pending.click({ force: true });
  expect(proposalRequestCount).toBe(2);

  releaseRetry();

  await expect(page.getByText("Recovered mandate risk review")).toBeVisible();
  await expect(
    page.getByText("Proposal priorities were updated."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh advisory priorities" }),
  ).toBeFocused();
  expect(proposalRequestCount).toBe(2);

  const hasHorizontalPageOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalPageOverflow).toBeFalsy();

  await mkdir(recoveryEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(
      recoveryEvidenceDirectory,
      "advisory-overview-source-recovery-desktop.png",
    ),
    fullPage: true,
    animations: "disabled",
  });
});
