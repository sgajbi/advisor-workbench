import { expect, test, type Page } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";

async function mockProposalPortfolioEvidence(
  page: Page,
  {
    failFirstRead = false,
    effectiveDate,
    requestedDates,
    sourceCurrencies,
  }: {
    failFirstRead?: boolean;
    effectiveDate?: string;
    requestedDates?: string[];
    sourceCurrencies?: Array<string | null>;
  } = {}
) {
  let bookReadCount = 0;

  await page.route(
    `**/api/bff/api/v1/portfolio/portfolios/${portfolioId}/book**`,
    async (route) => {
      bookReadCount += 1;
      const requestUrl = new URL(route.request().url());
      const requestedDate = requestUrl.searchParams.get("as_of_date") ?? "";
      const requestedCurrency = requestUrl.searchParams.get("reporting_currency") ?? "USD";
      const sourceCurrency = sourceCurrencies
        ? sourceCurrencies[bookReadCount - 1]
        : requestedCurrency;
      requestedDates?.push(requestedDate);
      if (failFirstRead && bookReadCount === 1) {
        await route.fulfill({ status: 503, json: { detail: "Portfolio book unavailable" } });
        return;
      }
      await route.fulfill({
        json: {
          as_of_date: effectiveDate ?? requestedDate,
          portfolio: {
            portfolio_id: portfolioId,
            display_name: "Global Balanced Portfolio",
            client_id: "CIF_001",
            base_currency: sourceCurrency,
            booking_center_code: "SGPB",
          },
          summary: {
            assets_under_management_base: 23_000,
            invested_market_value_base: 19_000,
            cash_market_value_base: 4_000,
            cash_weight_pct: 17.4,
            position_count: 1,
            cash_balance_count: 1,
          },
          cash_balances: [
            {
              security_id: "CASH_USD",
              instrument_name: "US Dollar Cash",
              currency: sourceCurrency,
              quantity: 4_000,
              market_value_base: 4_000,
              weight_pct: 17.4,
            },
          ],
          positions: [
            {
              security_id: "AAPL",
              instrument_name: "Apple Inc.",
              asset_class: "Equities",
              quantity: 100,
              market_value_base: 19_000,
              weight_pct: 82.6,
            },
          ],
          top_positions: [],
          allocation_views: [],
        },
      });
    }
  );
}

async function mockProposalBuilderEvaluation(page: Page) {
  await mockProposalPortfolioEvidence(page);
  await page.route("**/api/bff/api/v1/advisory-workspaces**", async (route) => {
    const url = new URL(route.request().url());
    const evaluated = url.pathname.endsWith("/evaluate");
    await route.fulfill({
      json: {
        correlation_id: evaluated ? "corr-builder-evaluation" : "corr-builder-create",
        contract_version: "v1",
        data: {
          workspace: {
            workspace_id: "aws_browser_001",
            ...(evaluated
              ? {
                  evaluation_summary: {
                    status: "READY",
                    blocking_issue_count: 0,
                    review_issue_count: 1,
                    impact_summary: { trade_count: 0 },
                  },
                  latest_proposal_result: {
                    status: "READY",
                    proposal_run_id: "run_browser_001",
                  },
                }
              : {}),
          },
        },
      },
    });
  });
}

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

async function mockSuitabilityReviews(page: Page, recordedEvaluationIds: string[]) {
  const reviews = [
    {
      evaluation_id: "pev_001",
      portfolio_id: portfolioId,
      proposal_id: "PRP-RISK-001",
      proposal_version_id: "ppv_001",
      policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
      policy_version: "2026.05",
      evaluation_status: "PENDING_REVIEW",
      approval_dependencies: ["COMPLIANCE_REVIEW:SG_STRUCTURED_NOTE"],
      disclosure_requirements: ["advisor_reviewed_disclosure:SG_STRUCTURED_NOTE"],
      consent_requirements: [],
      source_gaps: ["client_consent:SG_STRUCTURED_NOTE"],
    },
    {
      evaluation_id: "pev_002",
      portfolio_id: portfolioId,
      proposal_id: "PRP-INCOME-002",
      proposal_version_id: "ppv_002",
      policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
      policy_version: "2026.06",
      evaluation_status: "PENDING_REVIEW",
      approval_dependencies: [],
      disclosure_requirements: [],
      consent_requirements: ["client_consent:SG_INCOME_MANDATE"],
      source_gaps: [],
    },
  ];

  await page.route("**/api/bff/api/v1/advisory-policy-evaluations/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/review-queue")) {
      await route.fulfill({
        json: {
          correlation_id: "corr-policy-queue",
          contract_version: "v1",
          data: { items: reviews },
        },
      });
      return;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const evaluationId = pathParts.at(-2)?.startsWith("pev_")
      ? pathParts.at(-2)
      : pathParts.at(-1);
    const review = reviews.find((item) => item.evaluation_id === evaluationId) ?? reviews[0];

    if (request.method() === "POST" && url.pathname.endsWith("/sign-off-decisions")) {
      recordedEvaluationIds.push(evaluationId ?? "unknown");
      await route.fulfill({
        json: {
          correlation_id: "corr-policy-decision",
          contract_version: "v1",
          data: {
            workflow: {
              evaluation_id: evaluationId,
              sign_off_status: "PENDING_REVIEW",
              client_ready_publication: "BLOCKED",
            },
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith("/sign-off-package")) {
      await route.fulfill({
        json: {
          correlation_id: "corr-policy-package",
          contract_version: "v1",
          data: {
            package_posture: {
              sign_off_source_package: "AVAILABLE",
              client_ready_publication: "BLOCKED",
            },
            lineage: {
              evaluation_id: evaluationId,
              audit_events: [{ event_type: "POLICY_EVALUATION_FINALIZED" }],
              lineage_posture: { client_ready_publication: "BLOCKED" },
            },
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith("/workflow")) {
      await route.fulfill({
        json: {
          correlation_id: "corr-policy-workflow",
          contract_version: "v1",
          data: {
            evaluation_id: evaluationId,
            sign_off_status: "PENDING_REVIEW",
            sign_off_blockers: evaluationId === "pev_002" ? ["CLIENT_CONSENT_REQUIRED"] : [],
            maker_checker_required: true,
            sla_posture: { status: "WITHIN_SLA", open_requirement_count: 1 },
            client_ready_publication: "BLOCKED",
          },
        },
      });
      return;
    }

    await route.fulfill({
      json: {
        correlation_id: "corr-policy-detail",
        contract_version: "v1",
        data: {
          ...review,
          evaluation_hash: `sha256:${review.evaluation_id}`,
          source_refs: ["lotus-core:governed_policy_source"],
          evaluation_json: { rule_results: [{ rule_id: "MANDATE_ALIGNMENT", status: "READY" }] },
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

test("binds the suitability evidence workspace to the advisor-selected review", async ({
  page,
}, testInfo) => {
  const recordedEvaluationIds: string[] = [];
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockProposalQueue(page);
  await mockSuitabilityReviews(page, recordedEvaluationIds);
  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=suitability`, {
    waitUntil: "domcontentloaded",
  });

  const firstReview = page.getByRole("option", { name: /PRP-RISK-001/i });
  const secondReview = page.getByRole("option", { name: /PRP-INCOME-002/i });
  await expect(firstReview).toHaveAttribute("aria-selected", "true");
  await firstReview.press("ArrowDown");
  await expect(secondReview).toHaveAttribute("aria-selected", "true");

  const selectedReview = page.getByRole("region", { name: "Selected suitability review" });
  await expect(
    selectedReview.getByRole("heading", { name: "PRP-INCOME-002 · ppv_002" })
  ).toBeVisible();
  await expect(selectedReview.getByText("Source evidence complete")).toBeVisible();
  await selectedReview.getByRole("button", { name: "Request more evidence" }).click();
  await expect(
    selectedReview.getByText("Evidence review request recorded through the advisory policy workflow.")
  ).toBeVisible();
  expect(recordedEvaluationIds).toEqual(["pev_002"]);

  await testInfo.attach("suitability-selected-review-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(secondReview).toHaveAttribute("aria-selected", "true");
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBeFalsy();
  await testInfo.attach("suitability-selected-review-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("keeps proposal counts scoped to the current source window", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/bff/api/v1/proposals?portfolio_id=**", async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    await route.fulfill({
      json: {
        correlation_id: "corr-proposal-window",
        contract_version: "v1",
        data: cursor
          ? {
              items: [
                {
                  proposal_id: "PRP-RISK-002",
                  portfolio_id: portfolioId,
                  current_state: "RISK_REVIEW",
                  title: "Cross-asset concentration review",
                },
              ],
              next_cursor: null,
            }
          : {
              items: [],
              next_cursor: "cursor-window-2",
            },
      },
    });
  });

  await page.goto(`/proposals?portfolioId=${portfolioId}&mode=approval-queue`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { name: "More proposals available" })).toBeVisible();
  await expect(page.getByText("0 proposals in current view")).toBeVisible();
  await expect(page.getByText("No matching proposals in this view")).toBeVisible();
  await expect(page.getByText("No proposals in the approval queue")).toHaveCount(0);
  await page.getByRole("button", { name: "Next proposals" }).click();

  await expect(page.getByText("Cross-asset concentration review")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1 proposal needs attention in this view" })
  ).toBeVisible();
  await expect(page.getByText("Proposal view 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous proposals" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Next proposals" })).toBeDisabled();
});

test("keeps proposal evaluation inside construction without persisted workflow authority", async ({ page }) => {
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
  await expect(page.locator('a[href*="#simulation"]')).toHaveCount(0);
});

test("keeps proposal actions unavailable until failed portfolio evidence is refreshed", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { failFirstRead: true });
  await page.goto(`/proposals/simulate?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  await expect(evidence).toHaveAttribute("data-evidence-status", "unavailable");
  await expect(page.getByText("Portfolio evidence is unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();

  await page.getByRole("button", { name: "Refresh Portfolio Evidence" }).click();

  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(page.getByText("Portfolio evidence confirmed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Save Advisor Draft" })).toBeEnabled();
  for (const headingName of ["Advisor Workflow", "Draft Order Blotter"]) {
    const panel = page.locator("section").filter({
      has: page.getByRole("heading", { name: headingName }),
    }).first();
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await testInfo.attach("proposal-evidence-recovery", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("refetches and confirms the combined portfolio book for a changed advisory date", async ({
  page,
}) => {
  const requestedDates: string[] = [];
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { requestedDates });
  await page.goto(`/proposals/simulate?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(evidence).toHaveAttribute("data-effective-as-of-date", "2026-04-10");

  await page.getByLabel("Advisory As-of Date").fill("2026-04-11");

  await expect(evidence).toHaveAttribute("data-requested-as-of-date", "2026-04-11");
  await expect(evidence).toHaveAttribute("data-effective-as-of-date", "2026-04-11");
  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  expect(requestedDates).toEqual(expect.arrayContaining(["2026-04-10", "2026-04-11"]));
  await expect(page.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
});

test("shows requested and source dates while blocking a mismatched source snapshot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { effectiveDate: "2026-04-09" });
  await page.goto(`/proposals/simulate?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  await expect(evidence).toHaveAttribute("data-evidence-status", "context_mismatch");
  await expect(evidence).toHaveAttribute("data-requested-as-of-date", "2026-04-10");
  await expect(evidence).toHaveAttribute("data-effective-as-of-date", "2026-04-09");
  await expect(page.getByText("Portfolio context does not match")).toBeVisible();
  const positionsPanel = page.getByRole("region", { name: "Current Positions" });
  await expect(positionsPanel.getByText("1 position · different context")).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy More" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sell Down" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save Advisor Draft" })).toBeDisabled();
});

test("withholds mixed-currency impact until refreshed source evidence matches the proposal", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { sourceCurrencies: ["SGD", "USD"] });
  await page.goto(`/proposals/simulate?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  const impact = page.getByTestId("proposal-draft-impact");
  await expect(evidence).toHaveAttribute("data-evidence-status", "context_mismatch");
  await expect(impact).toHaveAttribute("data-preview-currency-status", "mixed_currency");
  await expect(impact).toHaveAttribute("data-requested-currency", "USD");
  await expect(impact).toHaveAttribute("data-source-currency", "SGD");
  await expect(impact.getByText("Currency-aligned impact is unavailable")).toBeVisible();
  await expect(impact.getByText("USD 23,000")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();
  await testInfo.attach("proposal-mixed-currency-impact-withheld", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByRole("button", { name: "Refresh Portfolio Evidence" }).click();

  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(impact).toHaveAttribute("data-preview-currency-status", "available");
  await expect(impact).toHaveAttribute("data-preview-currency", "USD");
  await expect(impact.getByText("USD 23,000").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Evaluate Workspace" })).toBeEnabled();
  await testInfo.attach("proposal-currency-impact-recovered", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByRole("button", { name: "Buy More" }).click();
  await page.getByLabel("Quantity").last().fill("10");
  await page.getByLabel("Price Currency").last().fill("EUR");
  await expect(impact).toHaveAttribute("data-preview-currency-status", "mixed_currency");
  await expect(impact.getByText("Currency-aligned impact is unavailable")).toBeVisible();
  await expect(impact.getByText(/monetary evidence in EUR/)).toBeVisible();
});

test("withholds unlabelled source money until currency identity is refreshed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockProposalPortfolioEvidence(page, { sourceCurrencies: [null, "USD"] });
  await page.goto(`/proposals/simulate?portfolioId=${portfolioId}`, {
    waitUntil: "domcontentloaded",
  });

  const evidence = page.getByTestId("proposal-portfolio-evidence");
  const impact = page.getByTestId("proposal-draft-impact");
  const positions = page.getByRole("region", { name: "Current Positions" });
  await expect(impact).toHaveAttribute("data-preview-currency-status", "unresolved");
  await expect(evidence.getByText("Currency not confirmed")).toBeVisible();
  await expect(positions.getByText("Currency not confirmed")).toBeVisible();
  await expect(evidence.getByText("USD 4,000")).toHaveCount(0);
  await expect(positions.getByText("USD 19,000")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Evaluate Workspace" })).toBeDisabled();

  await page.getByRole("button", { name: "Refresh Portfolio Evidence" }).click();

  await expect(evidence).toHaveAttribute("data-evidence-status", "ready");
  await expect(impact).toHaveAttribute("data-preview-currency-status", "available");
  await expect(evidence.getByText("USD 4,000")).toBeVisible();
  await expect(positions.getByText("USD 19,000")).toBeVisible();
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "narrow", width: 390, height: 844 },
]) {
  test(`evaluates inside Proposal Builder without a duplicate ${viewport.name} destination`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockProposalBuilderEvaluation(page);
    await page.goto(`/proposals/simulate?portfolioId=${portfolioId}`, {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: "Evaluate Workspace" }).click();

    await expect(
      page.getByRole("status", { name: "Proposal evaluation summary" })
    ).toContainText("Advise Evaluation Summary");
    await expect(page.getByText("Workspace aws_browser_001 evaluated by Advise")).toBeVisible();
    await expect(page.locator('a[href*="#simulation"]')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  });
}
