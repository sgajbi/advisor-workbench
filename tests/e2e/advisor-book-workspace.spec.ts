import { expect, test, type Page } from "@playwright/test";

const advisorBookResponse = {
  correlation_id: "corr-advisor-book-e2e",
  contract_version: "v1",
  scope: {
    kind: "own_book",
    label: "My book",
    as_of_date: "2026-04-10",
    booking_center_code: "Singapore",
  },
  page: {
    total_count: 2,
    offset: 0,
    limit: 25,
    returned_count: 2,
    sort_by: "portfolio_id",
    sort_order: "asc",
  },
  items: [
    {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      display_name: "Global Balanced Mandate",
      client_id: "CIF_SG_GLOBAL_BAL_001",
      base_currency: "USD",
      booking_center_code: "Singapore",
      mandate_type: "DISCRETIONARY",
      status: "ACTIVE",
      opened_on: "2025-03-31",
      closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1",
      membership_reference: "portfolio:PB_SG_GLOBAL_BAL_001",
      membership_basis: "legacy_advisor_projection",
    },
    {
      portfolio_id: "PB_SG_INCOME_002",
      display_name: "Income Mandate",
      client_id: "CIF_SG_INCOME_002",
      base_currency: "SGD",
      booking_center_code: "Singapore",
      mandate_type: "ADVISORY",
      status: "ACTIVE",
      opened_on: "2025-04-01",
      closed_on: null,
      membership_source: "PortfolioManagerBookMembership:v1",
      membership_reference: "portfolio:PB_SG_INCOME_002",
      membership_basis: "governed_role_assignment",
    },
  ],
  supportability: {
    state: "degraded",
    reason_code: "advisor_book_legacy_projection",
    tenant_scope: "trusted_context_only",
    limitations: [
      "legacy_advisor_projection",
      "tenant_scope_not_reported",
      "delegated_scope_not_supported",
    ],
  },
  provenance: {
    product_name: "PortfolioManagerBookMembership",
    product_version: "v1",
    generated_at: "2026-04-10T02:00:00Z",
    latest_evidence_timestamp: "2026-04-10T01:59:00Z",
    freshness_status: "CURRENT",
    data_quality_status: "ACCEPTED",
    source_evidence_current: true,
    snapshot_id: "pm_book_membership:e2e",
    content_hash: "sha256:e2e",
    lineage: { source_owner: "lotus-core" },
  },
};

async function mockAdvisorBook(page: Page) {
  await mockShellFallback(page);
  await page.route("**/api/bff/api/v1/advisor-book/portfolios?**", async (route) => {
    await route.fulfill({ json: advisorBookResponse });
  });
}

async function mockShellFallback(page: Page) {
  await page.route("**/api/bff/api/v1/platform/capabilities?**", async (route) => {
    await route.fulfill({ status: 503, json: { code: "shell_bootstrap_unavailable" } });
  });
}

test("supports a keyboard-complete own-book review and portfolio handoff", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockAdvisorBook(page);
  await page.goto("/book?asOfDate=2026-04-10", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Private Banking Workbench", { exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Notifications" })).toHaveCount(0);
  await expect(page.getByText("Jordan Davis", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "My book", exact: true })).toBeVisible();
  await expect(page.getByText("Available with limitations")).toBeVisible();
  const summaryStrip = page.getByLabel("Current book view");
  await expect(summaryStrip).toBeVisible();
  expect(
    await summaryStrip.evaluate((element) =>
      getComputedStyle(element)
        .gridTemplateColumns.split(" ")
        .filter((track) => track !== "0px").length,
    ),
  ).toBe(4);
  expect((await summaryStrip.boundingBox())?.height).toBeLessThan(150);
  await expect(page.getByRole("table", { name: "Portfolios in my book" })).toBeVisible();
  await expect(page.getByText("Own book only")).toBeVisible();
  await expect(page.getByText("Legacy assignment evidence")).toBeVisible();
  await expect(page.getByText(/team book|household|AUM|attention rank/i)).toHaveCount(0);
  await expect(page.getByText("Proposal", { exact: true })).toHaveAttribute(
    "title",
    "Proposal availability could not be confirmed.",
  );
  await expect(page.locator('[title*="disabled_in_fallback"]')).toHaveCount(0);

  await page.getByRole("textbox", { name: "Client reference" }).focus();
  await page.keyboard.type("CIF_SG_GLOBAL_BAL_001");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: "Mandate" })).toBeFocused();
  await page.getByRole("combobox", { name: "Sort direction" }).selectOption("desc");
  await page.getByRole("button", { name: "Apply view" }).click();
  await expect(page).toHaveURL(/clientId=CIF_SG_GLOBAL_BAL_001/);
  await expect(page).toHaveURL(/sortOrder=desc/);
  await expect(page.getByRole("button", { name: "Clear view" })).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Global Balanced Mandate" }),
  ).toHaveAttribute(
    "href",
    "/portfolio?asOfDate=2026-04-10&portfolioId=PB_SG_GLOBAL_BAL_001",
  );
});

test("keeps the book usable at tablet and effective 200 percent zoom width", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1000 });
  await mockAdvisorBook(page);
  await page.goto("/book?asOfDate=2026-04-10", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Private Banking Workbench", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Portfolios in my book" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Client reference" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Mandate" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Sort by" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Sort direction" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("fails visibly without falling back to a global portfolio catalogue", async ({ page }) => {
  await mockShellFallback(page);
  await page.route("**/api/bff/api/v1/advisor-book/portfolios?**", async (route) => {
    await route.fulfill({ status: 502, json: { code: "advisor_book_source_unavailable" } });
  });
  await page.goto("/book?asOfDate=2026-04-10", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Your book could not be loaded")).toBeVisible();
  await expect(page.getByText(/No broader portfolio list has been substituted/i)).toBeVisible();
  await expect(page.getByRole("table", { name: "Portfolios in my book" })).toHaveCount(0);
});
