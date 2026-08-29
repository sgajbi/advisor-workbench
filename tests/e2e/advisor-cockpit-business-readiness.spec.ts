import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page, type Route } from "@playwright/test";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const issue811EvidenceDirectory = process.env.ISSUE_811_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_811_EVIDENCE_DIR, "advisor-cockpit")
  : null;

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
          proposal_id: "proposal_sg_001",
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
  await expect(readiness.getByText("OMS_ORDER_LIFECYCLE")).toHaveCount(0);
  await expect(readiness.getByText("Order workflow unavailable")).toBeVisible();

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

  const actionWorkspace = page.getByTestId("advisor-cockpit-action-records");
  await expect(actionWorkspace).toBeVisible();
  const actionWorklist = actionWorkspace.getByRole("listbox", {
    name: "Advisor action review worklist",
  });
  const liquidityAction = actionWorklist.getByRole("option", {
    name: /Liquidity evidence review/,
  });
  const selectedDecision = actionWorkspace.getByRole("region", {
    name: "Selected advisor action",
  });
  const policyButton = selectedDecision.locator(
    '[data-action-item-id="aci_policy_review_001"] button',
  );
  await policyButton.focus();
  await policyButton.click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Confirming advisor priorities" }),
  ).toBeVisible();
  await expect(page.getByText("Confirmation in progress")).toBeVisible();
  await expect(
    selectedDecision.getByText("Policy evaluation requires compliance review."),
  ).toBeVisible();
  await expect(policyButton).toHaveText("Confirming...");
  await expect(policyButton).toBeDisabled();
  await expect(policyButton).toBeFocused();
  await expect(liquidityAction).not.toContainText("Confirming current advisor evidence");
  expect(mockState.acknowledgementRequests()).toBe(1);

  releaseReconciliation();

  await expect(page.getByText("Action required")).toBeVisible();
  await expect(page.getByText("Confirmation in progress")).toHaveCount(0);
  await expect(policyButton).toHaveText("Acknowledged");
  await expect(policyButton).toBeDisabled();
  await expect(policyButton).toBeFocused();
  await liquidityAction.click();
  await expect(selectedDecision).toContainText(
    "Confirm liquidity evidence with the portfolio team.",
  );
  await expect(
    selectedDecision.getByRole("button", { name: "Acknowledge review" }),
  ).toBeEnabled();
  expect(mockState.acknowledgedActionIds()).toEqual(["aci_policy_review_001"]);
  expect(mockState.acknowledgementRequests()).toBe(1);
});

test("keeps one advisor decision workflow usable at every supported viewport", async ({
  page,
}) => {
  await mockAdvisorCockpit(page);
  const viewports = [
    { name: "wide", width: 1800, height: 1000 },
    { name: "workstation", width: 1440, height: 1000 },
    { name: "tablet", width: 1024, height: 900 },
    { name: "compact", width: 519, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`/recommendations?portfolioId=${portfolioId}&mode=cockpit`, {
      waitUntil: "domcontentloaded",
    });

    const worklist = page.getByTestId("advisor-cockpit-action-worklist");
    await expect(worklist).toBeVisible();
    const sourceBoundary = page.locator('[data-context-presentation="inline"]');
    await expect(sourceBoundary).toContainText(
      "Advisor Cockpit source-owned action evidence",
    );
    await expect(page.getByText("Select a source record")).toHaveCount(0);
    await expect(page.getByText("Workflow context", { exact: true })).toHaveCount(0);
    await expect(page.locator(".workstation-shell-side")).toHaveCount(0);
    const proposalHandoffs = page.getByRole("link", {
      name: "Open proposal proposal_sg_001",
    });
    await expect(proposalHandoffs).toHaveCount(1);
    await expect(proposalHandoffs).toHaveAttribute(
      "href",
      "/proposals/proposal_sg_001",
    );
    const records = page.getByTestId("advisor-cockpit-action-records");
    await expect(records).toBeVisible();
    const actionWorklist = records.getByRole("listbox", {
      name: "Advisor action review worklist",
    });
    const options = actionWorklist.getByRole("option");
    await expect(options).toHaveCount(2);
    const selectedDecision = records.getByRole("region", {
      name: "Selected advisor action",
    });
    const reviewButton = selectedDecision.getByRole("button", {
      name: "Acknowledge review",
    });
    await expect(reviewButton).toBeVisible();
    await expect(selectedDecision).toContainText(
      "Review policy evidence before client discussion.",
    );
    await expect(
      records.getByText("Policy review required", { exact: true }),
    ).toHaveCount(1);
    await expect(actionWorklist).not.toContainText("Policy Review Required");
    await expect(actionWorklist).not.toContainText("Policy Pending Review");
    await expect(
      selectedDecision.getByText("Policy Review Required", { exact: true }),
    ).toBeVisible();
    const decisionId = await selectedDecision.getAttribute("id");
    expect(decisionId).not.toBeNull();
    await expect(options.first()).toHaveAttribute("aria-controls", decisionId!);
    expect(
      await reviewButton.evaluate((element) =>
        Math.min(
          element.getBoundingClientRect().width,
          element.getBoundingClientRect().height,
        ),
      ),
    ).toBeGreaterThanOrEqual(44);

    const [firstActionBox, decisionBox] = await Promise.all([
      options.first().boundingBox(),
      selectedDecision.boundingBox(),
    ]);
    expect(firstActionBox).not.toBeNull();
    expect(decisionBox).not.toBeNull();
    if (viewport.name === "workstation") {
      expect(firstActionBox!.y).toBeLessThan(900);
      expect(decisionBox!.y).toBeLessThan(900);
    }
    if (viewport.name === "compact") {
      expect(decisionBox!.y).toBeGreaterThan(firstActionBox!.y);
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
      const screenshotPath = issue811EvidenceDirectory
        ? path.join(
            issue811EvidenceDirectory,
            `advisor-cockpit-${viewport.name}.png`,
          )
        : `output/issue-736/advisor-cockpit-${viewport.name}.png`;
      if (issue811EvidenceDirectory) {
        await mkdir(issue811EvidenceDirectory, { recursive: true });
      }
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
    }
  }
});
