import path from "node:path";
import { expect } from "@playwright/test";

export function hasAcceptedAdvisorBriefReviewPosture(text) {
  return (
    text.includes("AI Review") &&
    text.includes("ACCEPTED") &&
    (text.includes("Supportability ACTION REQUIRED") ||
      text.includes("Supportability READY"))
  );
}

export function createBrowserValidationHelpers({
  outputDir,
  summary,
  portfolioId,
  benchmarkCode,
  canonicalAsOfDate,
  timeoutMs,
  panelRegistryById,
}) {
  async function assertListHasItems(locator, description) {
    await expect(locator).toBeVisible({ timeout: timeoutMs });
    const count = await locator.locator('[role="listitem"]').count();
    if (count < 1) {
      throw new Error(`${description} is visible but empty.`);
    }
    summary.uiChecks.push({ description, kind: "list", itemCount: count });
  }

  async function assertTableHasRows(
    locator,
    minimumRows,
    description,
    options = {},
  ) {
    if (options.requireVisible !== false) {
      await expect(locator).toBeVisible({ timeout: timeoutMs });
    } else {
      await expect(locator).toHaveCount(1, { timeout: timeoutMs });
    }
    const count = await locator.locator("tbody tr").count();
    if (count < minimumRows) {
      throw new Error(
        `${description} expected at least ${minimumRows} body rows but found ${count}.`,
      );
    }
    summary.uiChecks.push({ description, kind: "table", rowCount: count });
  }

  async function screenshot(page, name, metadata) {
    const target = path.join(outputDir, name);
    await page.mouse?.move(1, 1);
    await page.keyboard?.press("Escape");
    await page.screenshot({ path: target, fullPage: true });
    summary.screenshots.push({
      name,
      path: target,
      route: metadata.route,
      panel: metadata.panel,
      portfolioId,
      benchmarkCode,
      asOfDate: canonicalAsOfDate,
      state: metadata.state ?? "demo_ready",
    });
  }

  function resolveRegistryRoute(routeTemplate) {
    return routeTemplate
      .replaceAll("{portfolioId}", portfolioId)
      .replaceAll("{portfolio_id}", portfolioId)
      .replaceAll("{benchmarkCode}", benchmarkCode);
  }

  async function screenshotRegisteredPanel(page, panelId, metadata = {}) {
    const panelSpec = panelRegistryById.get(panelId);
    if (!panelSpec) {
      throw new Error(
        `Screenshot requested for unregistered panel '${panelId}'.`,
      );
    }
    if (!panelSpec.screenshotName) {
      throw new Error(`Panel '${panelId}' has no governed screenshot name.`);
    }
    await screenshot(page, panelSpec.screenshotName, {
      route: metadata.route ?? resolveRegistryRoute(panelSpec.route),
      panel: panelId,
      state: metadata.state,
    });
  }

  async function screenshotAdvisoryJourney(page, name, metadata) {
    await screenshot(page, name, {
      route: metadata.route,
      panel: metadata.panel,
      state: metadata.state,
    });
  }

  return {
    assertListHasItems,
    assertTableHasRows,
    screenshotAdvisoryJourney,
    screenshotRegisteredPanel,
    resolveRegistryRoute,
  };
}

async function assertRailModeActive(page, labelPattern, timeoutMs) {
  const railButton = page.getByRole("button", { name: labelPattern }).first();
  await expect(railButton).toBeVisible({ timeout: timeoutMs });
  await expect(railButton).toHaveAttribute("aria-current", "page", {
    timeout: timeoutMs,
  });
}

function tableByExactLabel(page, label) {
  return page.locator(`table[aria-label="${label}"]`);
}

function workbenchPanelByClass(page, className) {
  return page.locator(`article.${className}`).first();
}

function advisoryJourneyRoute({ workbenchBaseUrl, portfolioId, path }) {
  const separator = path.includes("?") ? "&" : "?";
  return `${workbenchBaseUrl}${path}${separator}portfolioId=${encodeURIComponent(portfolioId)}`;
}

function recordAdvisoryJourneyCheck(summary, payload) {
  summary.advisoryJourneyChecks ??= [];
  summary.advisoryJourneyChecks.push({
    ...payload,
    state: payload.state ?? "ready",
    owner: payload.owner ?? "lotus-workbench",
    gatewayBacked: payload.gatewayBacked ?? true,
  });
}

async function validateAdvisoryJourneyRoute(
  page,
  {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    key,
    title,
    route,
    screenshotName,
    panel,
    owner,
    sourcePosture,
    validate,
    screenshotAdvisoryJourney,
  },
) {
  await page.goto(route, { waitUntil: "networkidle", timeout: timeoutMs });
  await expect(
    page.getByRole("heading", { name: title, exact: true }).first(),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await validate();
  await screenshotAdvisoryJourney(page, screenshotName, {
    route: route.replace(workbenchBaseUrl, ""),
    panel,
    state: "demo_ready",
  });
  recordAdvisoryJourneyCheck(summary, {
    key,
    title,
    route: route.replace(workbenchBaseUrl, ""),
    panel,
    owner,
    sourcePosture,
  });
}

export async function validateAdvisoryJourneyScreens(
  page,
  {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    screenshotAdvisoryJourney,
  },
) {
  const recommendationsRoute = advisoryJourneyRoute({
    workbenchBaseUrl,
    portfolioId,
    path: "/recommendations",
  });
  const opportunitiesRoute = advisoryJourneyRoute({
    workbenchBaseUrl,
    portfolioId,
    path: "/recommendations?mode=opportunities",
  });
  const cockpitRoute = advisoryJourneyRoute({
    workbenchBaseUrl,
    portfolioId,
    path: "/recommendations?mode=cockpit",
  });
  const copilotRoute = advisoryJourneyRoute({
    workbenchBaseUrl,
    portfolioId,
    path: "/recommendations?mode=copilot",
  });
  const portfolioRoute = advisoryJourneyRoute({
    workbenchBaseUrl,
    portfolioId,
    path: "/portfolio",
  });
  const proposalBuilderRoute = advisoryJourneyRoute({
    workbenchBaseUrl,
    portfolioId,
    path: "/proposals/simulate",
  });

  await validateAdvisoryJourneyRoute(page, {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    key: "overview",
    title: "Advisory Overview",
    route: recommendationsRoute,
    screenshotName: "advisory-overview-live.png",
    panel: "advisory.overview",
    owner: "lotus-advise",
    sourcePosture: "proposal-list-through-gateway",
    screenshotAdvisoryJourney,
    validate: async () => {
      await expect(page.getByLabel("Advisory overview summary")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByLabel("Advisory journey screens")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("Priority Advisory Actions")).toBeVisible({
        timeout: timeoutMs,
      });
    },
  });

  await validateAdvisoryJourneyRoute(page, {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    key: "client-context",
    title: "Portfolio Review",
    route: portfolioRoute,
    screenshotName: "advisory-client-context-live.png",
    panel: "advisory.client_context",
    owner: "lotus-core",
    sourcePosture: "portfolio-context-through-gateway",
    screenshotAdvisoryJourney,
    validate: async () => {
      await expect(
        page.getByRole("region", { name: "Portfolio decision review" }),
      ).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("Balanced Mandate")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("Review Evidence")).toBeVisible({
        timeout: timeoutMs,
      });
    },
  });

  await validateAdvisoryJourneyRoute(page, {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    key: "opportunities",
    title: "Opportunities And Ideas",
    route: opportunitiesRoute,
    screenshotName: "advisory-opportunities-live.png",
    panel: "advisory.opportunities",
    owner: "lotus-advise",
    sourcePosture: "draft-proposals-through-gateway",
    screenshotAdvisoryJourney,
    validate: async () => {
      await expect(page.getByLabel("Draft advisory ideas")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(
        page.getByText("Advisor Decision", { exact: true }),
      ).toBeVisible({ timeout: timeoutMs });
    },
  });

  await validateAdvisoryJourneyRoute(page, {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    key: "advisor-cockpit",
    title: "Advisor Cockpit",
    route: cockpitRoute,
    screenshotName: "advisory-advisor-cockpit-live.png",
    panel: "advisory.advisor_cockpit",
    owner: "lotus-advise",
    sourcePosture: "advisor-cockpit-actions-through-gateway",
    screenshotAdvisoryJourney,
    validate: async () => {
      await expect(
        page.getByText("Advisor Decision", { exact: true }),
      ).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByLabel("Advisor cockpit counts")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(
        page.getByText("Supportability", { exact: true }).first(),
      ).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(
        page.getByText("Meeting Preparation", { exact: true }).first(),
      ).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(
        page
          .getByRole("button", { name: /Acknowledge review|Acknowledged/ })
          .first(),
      ).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("CLIENT_READY_PUBLICATION")).toHaveCount(0);
    },
  });

  await validateAdvisoryJourneyRoute(page, {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    key: "advisory-copilot",
    title: "Advisory Copilot",
    route: copilotRoute,
    screenshotName: "advisory-advisory-copilot-live.png",
    panel: "advisory.advisory_copilot",
    owner: "lotus-advise",
    sourcePosture: "advisory-copilot-through-gateway",
    screenshotAdvisoryJourney,
    validate: async () => {
      await expect(page.getByText("Advisor Decision", { exact: true })).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByLabel("Advisory copilot posture")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByLabel("Advisory copilot actions")).toBeVisible({
        timeout: timeoutMs,
      });
      await page.getByRole("button", { name: "Prepare review" }).first().click();
      await expect(page.getByText("Source Evidence", { exact: true })).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("Review Posture", { exact: true })).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("Run posture", { exact: true })).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(
        page.getByRole("button", { name: "Record internal review" }),
      ).toBeEnabled({
        timeout: timeoutMs,
      });
      await page.getByRole("button", { name: "Record internal review" }).click();
      await expect(page.getByLabel("Status Approved For Internal Use")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("workflow_pack")).toHaveCount(0);
      await expect(page.getByText("PROPOSAL_EXPLANATION")).toHaveCount(0);
      await expect(page.getByText("CLIENT_READY_PUBLICATION")).toHaveCount(0);
    },
  });

  await validateAdvisoryJourneyRoute(page, {
    summary,
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    key: "proposal-builder",
    title: "Proposal Workspace",
    route: proposalBuilderRoute,
    screenshotName: "advisory-proposal-builder-live.png",
    panel: "advisory.proposal_builder",
    owner: "lotus-advise",
    sourcePosture: "portfolio-book-and-workspace-through-gateway",
    screenshotAdvisoryJourney,
    validate: async () => {
      await expect(page.getByText("Create Advisory Proposal")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("Current Positions")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText("Draft Order Blotter")).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(
        page.getByRole("button", { name: "Evaluate Workspace" }),
      ).toBeVisible({
        timeout: timeoutMs,
      });
    },
  });

  await page.goto(`${proposalBuilderRoute}#simulation`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Proposal Workspace", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await page
    .getByRole("button", { name: "Evaluate Workspace" })
    .click({ timeout: timeoutMs });
  await expect(page.getByText("Advise Evaluation Summary")).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotAdvisoryJourney(
    page,
    "advisory-proposal-simulation-live.png",
    {
      route: `/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}#simulation`,
      panel: "advisory.proposal_simulation",
      state: "demo_ready",
    },
  );
  recordAdvisoryJourneyCheck(summary, {
    key: "simulation",
    title: "Proposal Simulation",
    route: `/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}#simulation`,
    panel: "advisory.proposal_simulation",
    owner: "lotus-advise",
    sourcePosture: "workspace-evaluation-through-gateway",
  });

  for (const lifecycle of [
    {
      key: "suitability",
      title: "Suitability Review",
      screenshotName: "advisory-suitability-review-live.png",
      panel: "advisory.suitability_review",
      sourcePosture: "proposal-lifecycle-through-gateway",
    },
    {
      key: "risk-impact",
      title: "Risk And Impact",
      screenshotName: "advisory-risk-impact-live.png",
      panel: "advisory.risk_impact",
      sourcePosture: "risk-review-proposals-through-gateway",
    },
    {
      key: "approval-queue",
      title: "Approval Queue",
      screenshotName: "advisory-approval-queue-live.png",
      panel: "advisory.approval_queue",
      sourcePosture: "proposal-approval-queue-through-gateway",
    },
    {
      key: "discussion-pack",
      title: "Discussion Pack Review",
      screenshotName: "advisory-client-discussion-pack-live.png",
      panel: "advisory.client_discussion_pack",
      sourcePosture: "discussion-pack-posture-through-gateway",
    },
    {
      key: "implementation",
      title: "Implementation Status",
      screenshotName: "advisory-implementation-status-live.png",
      panel: "advisory.implementation_status",
      sourcePosture: "implementation-follow-up-through-gateway",
    },
  ]) {
    const route = advisoryJourneyRoute({
      workbenchBaseUrl,
      portfolioId,
      path: `/proposals?mode=${lifecycle.key}`,
    });
    await validateAdvisoryJourneyRoute(page, {
      summary,
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      ...lifecycle,
      owner: "lotus-advise",
      route,
      screenshotAdvisoryJourney,
      validate: async () => {
        await expect(page.getByLabel("Proposal lifecycle counts")).toBeVisible({
          timeout: timeoutMs,
        });
        await expect(
          page.getByText("Advisor Decision", { exact: true }),
        ).toBeVisible({ timeout: timeoutMs });
      },
    });
  }
}

export async function validatePortfolioPanels(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertListHasItems,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(`${workbenchBaseUrl}/portfolio?portfolioId=${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Portfolio Review", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("region", { name: "Portfolio decision review" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Balanced Mandate", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("MTD Return")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("QTD Return")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("YTD Return")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Review priority attention" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Review Evidence" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Performance Snapshot" }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Summary" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Detailed" })).toHaveCount(0);
  await screenshotRegisteredPanel(page, "portfolio.summary");
}

export async function validatePerformanceSummaryPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
    {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    },
  );
  await expect(
    page.getByRole("heading", { name: "Performance", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await assertRailModeActive(page, /^Performance Overview/, timeoutMs);
  await expect(
    page.getByRole("heading", { name: "Net Return Path" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Performance Drivers" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText(/Observation trail/i)).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText(/\d+\s+periods?/i)).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Return path observation table"),
    4,
    "Return path observation table",
    { requireVisible: false },
  );
  await screenshotRegisteredPanel(page, "performance.summary");
}

export async function validatePerformanceAnalysisPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=analysis&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
    { waitUntil: "networkidle", timeout: timeoutMs },
  );
  await assertRailModeActive(page, /^Performance Analysis/, timeoutMs);
  await expect(
    page.getByRole("heading", { name: "Attribution Over Time" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Attribution Detail" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Performance Drivers" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Asset Class attribution table"),
    1,
    "Attribution detail table",
  );
  await assertTableHasRows(
    tableByExactLabel(page, "Asset Class contribution table"),
    1,
    "Contribution detail table",
  );
  await screenshotRegisteredPanel(page, "performance.analysis.contribution");
}

export async function validateAdvisorBriefPanel(
  page,
  {
    summary,
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    screenshotRegisteredPanel,
    performAcceptReviewActionProof = false,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=advisor&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
    { waitUntil: "networkidle", timeout: timeoutMs },
  );
  await assertRailModeActive(page, /^Advisor Brief/, timeoutMs);
  await expect(
    page.getByRole("heading", { name: "Performance Advisor Brief" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Client Talking Points" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Source Metrics" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const sourceMetricButtons = await page
    .getByRole("region", { name: "Source Metrics" })
    .getByRole("button")
    .count();
  if (sourceMetricButtons < 3) {
    throw new Error(
      `Advisor brief source metrics expected at least 3 metric buttons but found ${sourceMetricButtons}.`,
    );
  }
  summary.uiChecks.push({
    description: "Advisor brief source metrics",
    kind: "buttons",
    buttonCount: sourceMetricButtons,
  });
  await screenshotRegisteredPanel(page, "performance.advisor_brief");

  if (performAcceptReviewActionProof) {
    const reviewRegion = page.getByLabel("Advisor brief review actions");
    const supportabilityRegion = page.getByLabel(
      "Advisor brief supportability",
    );
    if ((await reviewRegion.count()) === 0) {
      await expect(supportabilityRegion).toBeVisible({ timeout: timeoutMs });
      summary.uiChecks.push({
        description: "Advisor brief ACCEPT review action",
        kind: "workflow-pack-review-action",
        actionType: "ACCEPT",
        state: "not-currently-allowed",
      });
      return;
    }
    await expect(reviewRegion).toBeVisible({ timeout: timeoutMs });
    await reviewRegion.getByLabel("Reviewed by").fill("live.validator.ui");
    await reviewRegion
      .getByLabel("Review reason")
      .fill(
        "Live canonical validator proving the Workbench ACCEPT review path.",
      );
    await reviewRegion.getByRole("button", { name: "Accept Brief" }).click();
    await expect(supportabilityRegion).toBeVisible({ timeout: timeoutMs });
    await expect
      .poll(
        async () =>
          hasAcceptedAdvisorBriefReviewPosture(
            await supportabilityRegion.innerText(),
          ),
        {
          timeout: timeoutMs,
        },
      )
      .toBe(true);
    summary.uiChecks.push({
      description: "Advisor brief ACCEPT review action",
      kind: "workflow-pack-review-action",
      actionType: "ACCEPT",
      state: "accepted",
    });
  }
}

export async function validateProposalNarrativePosturePanel(
  page,
  {
    summary,
    workbenchBaseUrl,
    proposalId,
    timeoutMs,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/proposals/${encodeURIComponent(proposalId)}`,
    {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    },
  );
  await expect(
    page.getByRole("heading", { name: new RegExp(`Proposal ${proposalId}`) }),
  ).toBeVisible({
    timeout: timeoutMs,
  });

  const narrativePanel = workbenchPanelByClass(
    page,
    "proposal-narrative-posture-panel",
  );
  await expect(narrativePanel).toBeVisible({ timeout: timeoutMs });
  await expect(
    narrativePanel.getByText("Advisor Narrative And Delivery"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(narrativePanel.getByText("Review Posture")).toBeVisible({
    timeout: timeoutMs,
  });
  await narrativePanel
    .getByLabel("Review rationale")
    .fill(
      "Live canonical validator approved this advisor-use narrative from Gateway evidence.",
    );
  await narrativePanel
    .getByRole("button", { name: "Approve Advisor Narrative" })
    .click();
  await expect(
    narrativePanel.getByLabel("Status Approved For Advisor Use"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await narrativePanel
    .getByRole("button", { name: "Request Reviewed Report" })
    .click();
  await expect(
    narrativePanel.getByText("Included Reviewed Narrative"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    narrativePanel.getByText(/Source narrative hash: sha256:/),
  ).toBeVisible({
    timeout: timeoutMs,
  });

  summary.uiChecks.push({
    description: "Proposal narrative posture review and report package",
    kind: "proposal-narrative-posture",
    proposalId,
    reviewState: "APPROVED_FOR_ADVISOR_USE",
    reportPackageState: "INCLUDED_REVIEWED_NARRATIVE",
  });
  await screenshotRegisteredPanel(page, "proposal.narrative_posture", {
    route: `/proposals/${proposalId}`,
  });
}

export async function validateProposalMemoEvidencePackPanel(
  page,
  {
    summary,
    workbenchBaseUrl,
    proposalId,
    proposalVersionNo,
    timeoutMs,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/proposals/${encodeURIComponent(proposalId)}`,
    {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    },
  );
  await expect(
    page.getByRole("heading", { name: new RegExp(`Proposal ${proposalId}`) }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const memoPanel = workbenchPanelByClass(page, "proposal-memo-posture-panel");
  await expect(memoPanel).toBeVisible({ timeout: timeoutMs });
  await expect(
    memoPanel.getByText("Advisor Memo And Evidence Pack"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoPanel.getByText("Review Posture")).toBeVisible({
    timeout: timeoutMs,
  });
  if (proposalVersionNo) {
    await expect(memoPanel.getByLabel("Version")).toHaveValue(
      String(proposalVersionNo),
      {
        timeout: timeoutMs,
      },
    );
  }
  await memoPanel
    .getByRole("button", { name: "Prepare Or Refresh Memo" })
    .click();
  await expect(memoPanel.getByText(/Memo evidence: sha256:/)).toBeVisible({
    timeout: timeoutMs,
  });
  await memoPanel
    .getByLabel("Review rationale")
    .fill(
      "Live canonical validator requested advisor-use memo review from source evidence.",
    );
  await memoPanel
    .getByRole("button", { name: "Approve Memo For Advisor Use" })
    .click();
  await expect(memoPanel.getByText("Review Posture")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoPanel.getByText("Pending")).toBeVisible({
    timeout: timeoutMs,
  });
  await memoPanel
    .getByRole("button", { name: "Prepare Report Package" })
    .click();
  await expect(
    memoPanel.getByRole("button", { name: "Prepare Report Package" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await memoPanel
    .getByRole("button", { name: "Request Advisor Commentary" })
    .click();
  await expect(
    memoPanel.getByRole("button", { name: "Request Advisor Commentary" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoPanel.getByText(/Replay evidence: sha256:/)).toBeVisible({
    timeout: timeoutMs,
  });

  summary.uiChecks.push({
    description:
      "Proposal memo evidence-pack advisor-use review and support posture",
    kind: "proposal-memo-evidence-pack",
    proposalId,
    versionNo: proposalVersionNo,
    reviewState: "review-requested-source-posture-preserved",
    clientReadyRelease: "not-requested",
  });
  await screenshotRegisteredPanel(page, "proposal.memo_evidence_pack", {
    route: `/proposals/${proposalId}`,
  });
}

export async function validateRiskPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
    { waitUntil: "networkidle", timeout: timeoutMs },
  );
  await assertRailModeActive(page, /^Risk Review/, timeoutMs);
  await expect(
    page.getByRole("heading", { name: "Risk Snapshot", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Drawdown", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Concentration", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Rolling Risk", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", {
      name: "Historical Risk Attribution",
      exact: true,
    }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Historical risk attribution table"),
    5,
    "Historical risk attribution table",
  );
  await screenshotRegisteredPanel(page, "performance.risk.snapshot");
}

export async function validateEvidencePanel(
  page,
  {
    summary,
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=evidence&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
    { waitUntil: "networkidle", timeout: timeoutMs },
  );
  await assertRailModeActive(page, /^Evidence/, timeoutMs);
  await expect(
    page.getByRole("heading", { name: "Evidence and Calculation Context" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const evidenceStatusStrip = page.getByLabel("Evidence support status");
  let screenshotState = "truthfully_degraded";
  if (await evidenceStatusStrip.count()) {
    await expect(evidenceStatusStrip).toBeVisible({ timeout: timeoutMs });
    summary.uiChecks.push({
      description: "Evidence support status",
      kind: "status-strip",
      state: "supported",
    });
    screenshotState = "demo_ready";
  } else {
    await expect(
      page.getByText(/Evidence (partially available|unavailable)/),
    ).toBeVisible({
      timeout: timeoutMs,
    });
    summary.uiChecks.push({
      description: "Evidence support status",
      kind: "status-strip",
      state: "degraded",
    });
  }
  await screenshotRegisteredPanel(page, "performance.evidence", {
    state: screenshotState,
  });
}

export async function validateOutcomeReviewPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=reviews`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const outcomeReviewPanel = workbenchPanelByClass(
    page,
    "outcome-review-panel",
  );
  await expect(
    outcomeReviewPanel.getByRole("heading", { name: "Outcome Reviews" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(outcomeReviewPanel.getByText("Evidence available")).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Outcome reviews"),
    1,
    "Outcome reviews",
  );
  await assertTableHasRows(
    tableByExactLabel(page, "Outcome review dimensions"),
    1,
    "Outcome review dimensions",
  );
  await expect(
    outcomeReviewPanel.getByText("Selected Review Detail"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    outcomeReviewPanel.getByText("Evidence Availability"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    outcomeReviewPanel.getByRole("button", { name: "Request report" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    outcomeReviewPanel.getByRole("button", {
      name: "Request advisor memo",
      exact: true,
    }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.outcome_review");
}

export async function validateDpmCommandCenterPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=mandate`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Mandate Health" }).first(),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Mandate Readiness").first()).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Data Readiness").first()).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Attention Required").first()).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Recommended Actions").first()).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByText("Health Dimensions Breakdown").first(),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.command_center");
}

export async function validateDpmWaveCommandCenterPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, screenshotRegisteredPanel },
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=waves`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const wavePanel = workbenchPanelByClass(
    page,
    "dpm-wave-command-center-panel",
  );
  await expect(
    wavePanel.getByRole("heading", { name: "Rebalance", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const readinessStrip = wavePanel.getByLabel("Rebalance readiness");
  await expect(readinessStrip.getByText("Rebalance Status")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(readinessStrip.getByText("Approval Readiness")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Active Rebalance")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Recommended Actions")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    wavePanel.getByRole("heading", { name: "Proposed Changes" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const candidateSourceReview = page
    .locator(".rebalance-campaign-evidence")
    .filter({ hasText: "Candidate Source Review" })
    .first();
  await expect(candidateSourceReview).toBeVisible({ timeout: timeoutMs });
  for (const label of [
    "Source Product",
    "Selection Basis",
    "Readiness",
    "Candidates",
    "Eligible",
    "Filters",
    "Warnings",
    "Lineage Refs",
    "Next Action",
    "Boundaries",
  ]) {
    await expect(
      candidateSourceReview.getByText(label, { exact: true }),
    ).toBeVisible({
      timeout: timeoutMs,
    });
  }
  await expect(
    candidateSourceReview.getByText("DpmPortfolioUniverseCandidate:v1", {
      exact: true,
    }),
  ).toBeVisible({ timeout: timeoutMs });
  await expect(
    candidateSourceReview.getByText("Effective Discretionary Mandate Binding"),
  ).toBeVisible({ timeout: timeoutMs });
  await expect(
    candidateSourceReview.getByText("portfolio_mandate_bindings"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    candidateSourceReview.getByText("mandate_type=discretionary"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    candidateSourceReview.getByText("Check launch readiness through Gateway."),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    candidateSourceReview.getByText("NO_ORDER_GENERATION"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    candidateSourceReview.getByText("NO_OMS_EXECUTION_CLAIM"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    candidateSourceReview.getByText("NO_CLIENT_CONTACT_WORKFLOW"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    candidateSourceReview.getByRole("button", { name: /oms/i }),
  ).toHaveCount(0);
  await expect(
    candidateSourceReview.getByRole("button", { name: /client/i }),
  ).toHaveCount(0);
  await expect(
    candidateSourceReview.getByRole("button", { name: /order/i }),
  ).toHaveCount(0);
  for (const actionName of [
    "Preview",
    "Create Rebalance",
    "Review Data",
    "Simulate",
    "Request Approval",
    "Stage",
    "Prepare Handoff",
    "Open Evidence Pack",
    "Load Changes",
  ]) {
    await expect(
      wavePanel.getByRole("button", { name: actionName, exact: true }),
    ).toBeVisible({
      timeout: timeoutMs,
    });
  }
  await wavePanel.getByRole("button", { name: "Preview", exact: true }).click({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Preview completed.")).toBeVisible({
    timeout: timeoutMs,
  });
  await wavePanel.getByRole("button", { name: "Create Rebalance" }).click({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Create rebalance completed.")).toBeVisible({
    timeout: timeoutMs,
  });
  await wavePanel.getByRole("button", { name: "Load Changes" }).click({
    timeout: timeoutMs,
  });
  await expect(
    wavePanel.getByText("Load proposed changes completed."),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.wave_command_center");
}

export async function validatePortfolioMemoryPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=memory`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const memoryPanel = workbenchPanelByClass(page, "portfolio-memory-panel");
  await expect(
    memoryPanel.getByRole("heading", { name: "Portfolio Memory" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Audit trail available")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Historical Event Log")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Recommended Actions")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Support Snapshot")).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Portfolio memory event timeline"),
    1,
    "Portfolio memory event timeline",
  );
  await screenshotRegisteredPanel(page, "dpm.portfolio_memory");
}

export async function validateConstructionAlternativesPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, screenshotRegisteredPanel },
) {
  await page.goto(
    `${workbenchBaseUrl}/workbench/${portfolioId}?mode=construction`,
    {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    },
  );
  const constructionPanel = workbenchPanelByClass(
    page,
    "construction-alternatives-panel",
  );
  await expect(
    constructionPanel.getByRole("heading", {
      name: "Construction Alternatives",
    }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    constructionPanel.getByRole("button", { name: "Generate alternatives" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await constructionPanel
    .getByRole("button", { name: "Generate alternatives" })
    .click({
      timeout: timeoutMs,
    });
  await expect(
    constructionPanel.getByText("Construction alternatives generated."),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    constructionPanel.getByText("Alternatives Comparison"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const constructionSummary = constructionPanel.locator(
    ".construction-alternatives-summary",
  );
  await expect(
    constructionSummary.getByText("Recommended Path", { exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.construction_alternatives");
}

export async function validatePmOperatingQualityPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, screenshotRegisteredPanel },
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=quality`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const qualityPanel = workbenchPanelByClass(
    page,
    "pm-operating-quality-panel",
  );
  await expect(
    qualityPanel.getByRole("heading", { name: "PM Operating Quality" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const qualityStatusStrip = qualityPanel.locator(".pm-quality-status-strip");
  for (const label of [
    "Policy",
    "Latest Score Run",
    "Fairness Analysis",
    "Summary Invocation",
    "Authority",
  ]) {
    await expect(
      qualityStatusStrip.getByText(label, { exact: true }),
    ).toBeVisible({
      timeout: timeoutMs,
    });
  }
  await expect(
    page.getByLabel("PM operating quality summary-invocation posture"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByLabel("PM operating quality summary-invocation control"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByLabel("PM operating quality summary-invocation readiness"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    qualityPanel.getByText("Summary Invocation Detail", { exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByLabel("PM operating quality summary invocations"),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.pm_operating_quality");
}

export async function validateDpmCopilotWorkspace(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, screenshotRegisteredPanel },
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=copilot`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const copilotWorkspace = workbenchPanelByClass(page, "dpm-copilot-workspace");
  await expect(
    copilotWorkspace.getByRole("heading", { name: "PM Copilot Workspace" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByLabel("PM copilot posture")).toBeVisible({
    timeout: timeoutMs,
  });
  for (const label of [
    "Gateway only",
    "No prompt storage",
    "Evidence Owner",
    "Workflow Owner",
    "Forbidden Uses",
    "Operating boundaries",
  ]) {
    await expect(
      copilotWorkspace.getByText(label, { exact: true }),
    ).toBeVisible({
      timeout: timeoutMs,
    });
  }
  await screenshotRegisteredPanel(page, "dpm.copilot_workspace");
}

export async function validateProofPackPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=proof`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const proofPackPanel = workbenchPanelByClass(page, "proof-pack-panel");
  await expect(
    proofPackPanel.getByRole("heading", { name: "Evidence Pack" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    proofPackPanel.getByText(/Summary (Available|Unavailable)/),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    proofPackPanel.getByText(/Report (Available|Unavailable)/),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    proofPackPanel.getByText(/Memo (Available|Unavailable)/),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    proofPackPanel.getByRole("button", { name: "Open advisor memo" }).first(),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await proofPackPanel.getByRole("button", { name: "Prepare evidence" }).click({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText("Evidence pack prepared.")).toBeVisible(
    {
      timeout: timeoutMs,
    },
  );
  await proofPackPanel
    .getByRole("button", { name: "Open advisor memo" })
    .first()
    .click({
      timeout: timeoutMs,
    });
  await expect(proofPackPanel.getByText(/^Advisor memo /)).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Evidence areas"),
    1,
    "Evidence areas",
  );
  await screenshotRegisteredPanel(page, "dpm.proof_pack");
}
