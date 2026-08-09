import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceDirectory = path.resolve("output", "issue-591");

async function mockAdvisoryOverview(page: Page) {
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

    const hasHorizontalPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalPageOverflow).toBeFalsy();

    await mkdir(evidenceDirectory, { recursive: true });
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
