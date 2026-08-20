import { expect, test, type Page, type Route } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const actionTableMinimumCapacity = 58 * 16;

async function mockAdvisorCockpit(
  page: Page,
  {
    reconciliationGate,
  }: {
    reconciliationGate?: Promise<void>;
  } = {},
) {
  const acknowledgedActionIds = new Set<string>();
  let acknowledgementRequests = 0;
  const fulfill = async (
    route: Route,
    data: Record<string, unknown>,
  ) => {
    await route.fulfill({
      json: {
        correlation_id: "corr-advisor-cockpit-readiness",
        contract_version: "v1",
        data,
      },
    });
  };
  const waitForReconciliation = async () => {
    if (acknowledgedActionIds.size > 0 && reconciliationGate) {
      await reconciliationGate;
    }
  };

  await page.route("**/api/bff/api/v1/advisor-cockpit/snapshot?**", async (route) => {
    await waitForReconciliation();
    await fulfill(route, {
      snapshot_id: "cockpit_snapshot_business_readiness",
      action_counts: {
        "status.PENDING_REVIEW": 2 - acknowledgedActionIds.size,
        "status.BLOCKED": 0,
        "priority.HIGH": 2 - acknowledgedActionIds.size,
      },
      supportability: {
        gateway_posture: "SUPPORTED_BY_LOTUS_GATEWAY_RFC0026",
        workbench_posture: "CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026",
        data_product_posture: "ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026",
        client_ready_publication: "BLOCKED",
      },
      unsupported_capabilities: ["EXTERNAL_CLIENT_COMMUNICATION"],
    });
  });
  await page.route("**/api/bff/api/v1/advisor-cockpit/actions?**", async (route) => {
    await waitForReconciliation();
    await fulfill(route, {
      total_count: 2,
      items: [
        {
          action_item_id: "aci_policy_review_001",
          action_item_version: 1,
          action_family: "POLICY_REVIEW_REQUIRED",
          status: "PENDING_REVIEW",
          priority: "HIGH",
          owner_role: "ADVISOR",
          title: "Policy review required",
          next_required_action: "Review policy evidence before client discussion.",
          reason_codes: ["POLICY_PENDING_REVIEW"],
          evidence_refs: [
            { summary: "Policy evaluation requires compliance review." },
          ],
          unsupported_capabilities: ["CLIENT_READY_PUBLICATION"],
          acknowledgement_state: acknowledgedActionIds.has(
            "aci_policy_review_001",
          )
            ? { acknowledged: true, acknowledged_by: "advisor_1" }
            : { acknowledged: false },
        },
        {
          action_item_id: "aci_liquidity_review_002",
          action_item_version: 1,
          action_family: "LIQUIDITY_REVIEW_REQUIRED",
          status: "PENDING_REVIEW",
          priority: "HIGH",
          owner_role: "ADVISOR",
          title: "Liquidity evidence review",
          next_required_action:
            "Confirm liquidity evidence with the portfolio team.",
          reason_codes: ["LIQUIDITY_EVIDENCE_PENDING"],
          evidence_refs: [
            { summary: "Liquidity evidence requires advisor review." },
          ],
          unsupported_capabilities: ["CLIENT_READY_PUBLICATION"],
          acknowledgement_state: acknowledgedActionIds.has(
            "aci_liquidity_review_002",
          )
            ? { acknowledged: true, acknowledged_by: "advisor_1" }
            : { acknowledged: false },
        },
      ],
    });
  });
  await page.route(
    "**/api/bff/api/v1/advisor-cockpit/preparation-packets?**",
    async (route) => {
      await waitForReconciliation();
      await fulfill(route, {
        total_count: 1,
        items: [
          {
            packet_id: "prep_1",
            context_type: "PORTFOLIO",
            context_ref: portfolioId,
            status: "READY",
            evidence_refs: [
              { summary: "Proposal and policy evidence available." },
            ],
          },
        ],
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/advisor-cockpit/supportability?**",
    async (route) => {
      await waitForReconciliation();
      await fulfill(route, {
        posture: "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
        unsupported_capabilities: ["OMS_ORDER_LIFECYCLE"],
      });
    },
  );
  await page.route(
    "**/api/bff/api/v1/advisor-cockpit/actions/*/acknowledgements?**",
    async (route) => {
      acknowledgementRequests += 1;
      const actionItemId = new URL(route.request().url()).pathname
        .split("/")
        .at(-2);
      if (!actionItemId) {
        throw new Error("Advisor Cockpit acknowledgement route omitted action identity.");
      }
      acknowledgedActionIds.add(actionItemId);
      await fulfill(route, {
        action_item: { action_item_id: actionItemId },
        acknowledgement: {
          acknowledged: true,
          acknowledged_by: "advisor_1",
        },
        replayed: false,
      });
    },
  );

  return {
    acknowledgementRequests: () => acknowledgementRequests,
    acknowledgedActionIds: () => [...acknowledgedActionIds],
  };
}

test("keeps advisor readiness business-facing and support evidence on demand", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockAdvisorCockpit(page);
  await page.goto(`/recommendations?portfolioId=${portfolioId}&mode=cockpit`, {
    waitUntil: "domcontentloaded",
  });

  const readiness = page
    .getByRole("heading", { name: "Preparation Readiness" })
    .locator("xpath=ancestor::article[contains(@class, 'section-block')][1]");
  await expect(readiness).toBeVisible();
  await expect(readiness.getByText("Available", { exact: true })).toHaveCount(4);
  await expect(readiness.getByText("Blocked", { exact: true })).toBeVisible();
  await expect(readiness.getByText("Client communication unavailable")).toBeVisible();
  await expect(readiness.getByText("Order workflow unavailable")).toBeVisible();

  await expect(readiness.getByText("SUPPORTED_BY_LOTUS_GATEWAY_RFC0026")).toBeHidden();
  await expect(readiness.getByText("OMS_ORDER_LIFECYCLE")).toBeHidden();
  if (process.env.LOTUS_CAPTURE_DIAGNOSTIC_SCREENSHOTS === "1") {
    await page.screenshot({
      path: "output/playwright/diagnostic-advisor-cockpit-readiness-primary-448.png",
      fullPage: true,
    });
  }
  await readiness.getByText("Support details", { exact: true }).click();
  await expect(readiness.getByText("SUPPORTED_BY_LOTUS_GATEWAY_RFC0026")).toBeVisible();
  await expect(readiness.getByText("OMS_ORDER_LIFECYCLE")).toBeVisible();

  await expect(page.getByText("Unsupported Claims", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Source Readiness", { exact: true })).toHaveCount(0);
  await expect(page.getByText("actions from Advise", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Gateway-backed", { exact: false })).toHaveCount(0);
  await expect(page.getByText("supportability", { exact: false })).toHaveCount(0);

  if (process.env.LOTUS_CAPTURE_DIAGNOSTIC_SCREENSHOTS === "1") {
    await page.screenshot({
      path: "output/playwright/diagnostic-advisor-cockpit-readiness-support-details-448.png",
      fullPage: true,
    });
  }
});

test("qualifies cached advisor evidence until acknowledgement reconciliation completes", async ({
  page,
}) => {
  let releaseReconciliation!: () => void;
  const reconciliationGate = new Promise<void>((resolve) => {
    releaseReconciliation = resolve;
  });
  const mockState = await mockAdvisorCockpit(page, { reconciliationGate });
  await page.goto(`/recommendations?portfolioId=${portfolioId}&mode=cockpit`, {
    waitUntil: "domcontentloaded",
  });

  const compactActions = page.getByTestId("advisor-cockpit-action-records");
  await expect(compactActions).toBeVisible();
  const policyAction = compactActions.locator(
    '[data-action-item-id="aci_policy_review_001"]',
  );
  const liquidityAction = compactActions.locator(
    '[data-action-item-id="aci_liquidity_review_002"]',
  );
  const policyButton = policyAction.locator("button");
  await policyButton.focus();
  await policyButton.click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Confirming advisor priorities" }),
  ).toBeVisible();
  await expect(page.getByText("Confirmation in progress")).toBeVisible();
  await expect(
    compactActions.getByText("Policy evaluation requires compliance review."),
  ).toBeVisible();
  await expect(policyButton).toHaveText("Confirming...");
  await expect(policyButton).toBeDisabled();
  await expect(policyButton).toBeFocused();
  await expect(liquidityAction.locator("button")).toHaveText("Acknowledge review");
  await expect(liquidityAction).not.toContainText("Confirming current advisor evidence");
  expect(mockState.acknowledgementRequests()).toBe(1);

  releaseReconciliation();

  await expect(page.getByText("Action required")).toBeVisible();
  await expect(page.getByText("Confirmation in progress")).toHaveCount(0);
  await expect(policyButton).toHaveText("Acknowledged");
  await expect(policyButton).toBeDisabled();
  await expect(policyButton).toBeFocused();
  await expect(liquidityAction.locator("button")).toHaveText("Acknowledge review");
  await expect(liquidityAction.locator("button")).toBeEnabled();
  expect(mockState.acknowledgedActionIds()).toEqual(["aci_policy_review_001"]);
  expect(mockState.acknowledgementRequests()).toBe(1);
});

test("keeps advisor action evidence and review controls visible by module capacity", async ({
  page,
}) => {
  await mockAdvisorCockpit(page);
  const viewports = [
    { name: "wide", width: 1800, height: 1000 },
    { name: "workstation", width: 1440, height: 1000 },
    { name: "tablet", width: 1024, height: 900 },
    { name: "compact", width: 519, height: 900 },
  ];
  let tablePresentations = 0;
  let compactPresentations = 0;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`/recommendations?portfolioId=${portfolioId}&mode=cockpit`, {
      waitUntil: "domcontentloaded",
    });

    const worklist = page.getByTestId("advisor-cockpit-action-worklist");
    await expect(worklist).toBeVisible();
    const capacity = await worklist.evaluate((element) => element.clientWidth);
    const table = page.getByTestId("advisor-cockpit-action-table");
    const records = page.getByTestId("advisor-cockpit-action-records");

    if (capacity >= actionTableMinimumCapacity) {
      tablePresentations += 1;
      await expect(table).toBeVisible();
      await expect(records).toBeHidden();
      await expect(
        table.getByRole("button", { name: "Acknowledge review" }).first(),
      ).toBeVisible();
      await expect(
        table.getByText("Review policy evidence before client discussion."),
      ).toBeVisible();
    } else {
      compactPresentations += 1;
      await expect(records).toBeVisible();
      await expect(table).toBeHidden();
      const policyAction = records.getByRole("article", {
        name: "Policy review required",
      });
      const reviewButton = policyAction.getByRole("button", {
        name: "Acknowledge review",
      });
      await expect(reviewButton).toBeVisible();
      await expect(
        policyAction.getByText("Review policy evidence before client discussion."),
      ).toBeVisible();
      expect(
        await reviewButton.evaluate((element) =>
          Math.min(
            element.getBoundingClientRect().width,
            element.getBoundingClientRect().height,
          ),
        ),
      ).toBeGreaterThanOrEqual(44);
    }

    const readinessHeading = page.getByText(/^Preparation data$/i);
    const readinessBadge = readinessHeading
      .locator("..")
      .getByText("Available", { exact: true });
    const [headingBox, badgeBox] = await Promise.all([
      readinessHeading.boundingBox(),
      readinessBadge.boundingBox(),
    ]);
    expect(headingBox).not.toBeNull();
    expect(badgeBox).not.toBeNull();
    expect(headingBox!.x + headingBox!.width).toBeLessThanOrEqual(badgeBox!.x);

    const measures = page.getByLabel("Advisor cockpit counts").locator("> div");
    const [firstMeasureBox, secondMeasureBox] = await Promise.all([
      measures.nth(0).boundingBox(),
      measures.nth(1).boundingBox(),
    ]);
    expect(firstMeasureBox).not.toBeNull();
    expect(secondMeasureBox).not.toBeNull();
    if (viewport.name === "compact") {
      expect(firstMeasureBox!.y).toBe(secondMeasureBox!.y);
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);

    if (process.env.LOTUS_CAPTURE_DIAGNOSTIC_SCREENSHOTS === "1") {
      await page.screenshot({
        path: `output/playwright/issue-733-advisor-cockpit-${viewport.name}.png`,
        fullPage: true,
      });
    }
  }

  expect(tablePresentations).toBeGreaterThan(0);
  expect(compactPresentations).toBeGreaterThan(0);
});
