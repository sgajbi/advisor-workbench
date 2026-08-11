import { expect, test, type Page } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";

async function mockProposalBuilderEvaluation(page: Page) {
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
