import { expect, test, type Page } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";

async function mockProposalQueue(page: Page) {
  await page.route("**/api/bff/api/v1/proposals?portfolio_id=**", async (route) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-proposal-workflow-context",
        contract_version: "v1",
        data: {
          items: [
            {
              proposal_id: "PRP-RISK-001",
              portfolio_id: portfolioId,
              current_state: "RISK_REVIEW",
              title: "Concentration risk review",
            },
            {
              proposal_id: "PRP-READY-001",
              portfolio_id: portfolioId,
              current_state: "EXECUTION_READY",
              title: "Approved allocation handoff",
            },
          ],
          next_cursor: null,
        },
      },
    });
  });
}

test("shows source-backed queue posture without invented advisory evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalQueue(page);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { level: 1, name: "Approval Queue" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "1 need attention" })).toBeVisible();
  await expect(page.getByText("2 proposals in view")).toBeVisible();
  await expect(page.getByText("1 proposal needs advisor action.")).toBeVisible();
  await expect(page.getByText("Advisory proposal lifecycle")).toBeVisible();

  await expect(page.getByText("KYC validity verified")).toHaveCount(0);
  await expect(page.getByText("Evidence pack: advisor-use review in progress")).toHaveCount(0);
  await expect(page.getByText("Client Readiness")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("keeps workflow context readable without horizontal overflow at stacked-shell width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await mockProposalQueue(page);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { level: 2, name: "1 need attention" })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBeFalsy();
});

test("labels simulation as construction without persisted workflow authority", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/proposals/simulate?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { level: 2, name: "Draft not yet persisted" })).toBeVisible();
  await expect(page.getByText("No persisted advisory workflow record")).toBeVisible();
  await expect(
    page.getByText(
      "Simulation does not imply suitability review, approval, client consent, publication, or execution readiness."
    )
  ).toBeVisible();
  await expect(page.getByText("KYC validity verified")).toHaveCount(0);
  await expect(page.getByText("Client Readiness")).toHaveCount(0);
});
