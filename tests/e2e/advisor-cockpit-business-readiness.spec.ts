import { expect, test, type Page, type Route } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";

async function mockAdvisorCockpit(
  page: Page,
  {
    reconciliationGate,
  }: {
    reconciliationGate?: Promise<void>;
  } = {},
) {
  let acknowledgementRecorded = false;
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
    if (acknowledgementRecorded && reconciliationGate) {
      await reconciliationGate;
    }
  };

  await page.route("**/api/bff/api/v1/advisor-cockpit/snapshot?**", async (route) => {
    await waitForReconciliation();
    await fulfill(route, {
      snapshot_id: "cockpit_snapshot_business_readiness",
      action_counts: {
        "status.PENDING_REVIEW": 1,
        "status.BLOCKED": 0,
        "priority.HIGH": 1,
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
      total_count: 1,
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
          acknowledgement_state: acknowledgementRecorded
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
      acknowledgementRecorded = true;
      await fulfill(route, {
        action_item: { action_item_id: "aci_policy_review_001" },
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

  await page.getByRole("button", { name: "Acknowledge review" }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Confirming advisor priorities" }),
  ).toBeVisible();
  await expect(page.getByText("Confirmation in progress")).toBeVisible();
  await expect(page.getByText("Policy evaluation requires compliance review.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirming..." })).toBeDisabled();
  expect(mockState.acknowledgementRequests()).toBe(1);

  releaseReconciliation();

  await expect(page.getByText("Action required")).toBeVisible();
  await expect(page.getByText("Confirmation in progress")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Acknowledged" })).toBeDisabled();
  expect(mockState.acknowledgementRequests()).toBe(1);
});
