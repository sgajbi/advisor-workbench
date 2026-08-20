import path from "node:path";
import { expect } from "@playwright/test";

const HIGH_CASH_IDEA_CANDIDATE_PATTERN = /^idea_high_cash_[0-9a-f]{16}$/;

export function resolveHighCashIdeaCandidateId(candidateHref, workbenchBaseUrl) {
  if (!candidateHref) {
    throw new Error("The canonical high-cash candidate link has no href.");
  }

  const candidateId = new URL(candidateHref, workbenchBaseUrl).searchParams.get(
    "candidateId",
  );
  if (!candidateId || !HIGH_CASH_IDEA_CANDIDATE_PATTERN.test(candidateId)) {
    throw new Error(
      `The canonical Idea queue exposed an invalid high-cash candidate id: ${candidateId ?? "missing"}.`,
    );
  }

  return candidateId;
}

export function hasAcceptedAdvisorBriefReviewPosture(text) {
  return (
    text.includes("Human Review") &&
    text.includes("Accepted for internal use") &&
    text.includes("Supportability READY") &&
    text.includes("Recorded by") &&
    /Recorded\s+(?!by\b)\S+/i.test(text)
  );
}

export function hasRecordedAdvisorBriefAcceptProof(text, expectedReviewer) {
  const reviewer =
    typeof expectedReviewer === "string" ? expectedReviewer.trim() : "";
  const escapedReviewer = reviewer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    hasAcceptedAdvisorBriefReviewPosture(text) &&
    reviewer.length > 0 &&
    new RegExp(`Recorded\\s+by\\s+${escapedReviewer}(?=\\s|•|$)`).test(text)
  );
}

export function classifyAdvisorBriefAcceptProofPosture(text, expectedReviewer) {
  if (hasRecordedAdvisorBriefAcceptProof(text, expectedReviewer)) {
    return "source-confirmed-existing-action";
  }
  if (hasAcceptedAdvisorBriefReviewPosture(text)) {
    return "accepted-by-another-reviewer";
  }
  if (text.includes("Human Review") && text.includes("Awaiting review")) {
    return "review-action-available";
  }
  return "review-action-unavailable";
}

export function classifyRegisteredPanelScreenshotState(panelState, requiredSupportState) {
  return panelState && requiredSupportState && panelState === requiredSupportState
    ? "demo_ready"
    : "truthfully_degraded";
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

  function recordUiCheck(check) {
    summary.uiChecks.push(check);
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
      .replaceAll("{portfolio_id}", portfolioId)
      .replaceAll("{benchmarkCode}", benchmarkCode)
      .replaceAll("{canonicalAsOfDate}", canonicalAsOfDate);
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
    const panelClassification = summary.panelClassifications?.find(
      (classification) => classification.panel === panelId,
    );
    await screenshot(page, panelSpec.screenshotName, {
      route: metadata.route ?? resolveRegistryRoute(panelSpec.route),
      panel: panelId,
      state:
        metadata.state ??
        classifyRegisteredPanelScreenshotState(
          panelClassification?.state,
          panelSpec.requiredSupportState,
        ),
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
    recordUiCheck,
    screenshotAdvisoryJourney,
    screenshotRegisteredPanel,
    resolveRegistryRoute,
  };
}

export function classifyAttributionDetailEvidence({
  detailTableCount,
  summaryTableCount,
  partialFallbackCount,
  readyEmptyStateCount,
}) {
  if (detailTableCount > 0) {
    return "detail_rows";
  }
  if (summaryTableCount > 0) {
    return "summary_fallback";
  }
  if (partialFallbackCount > 0) {
    return "governed_partial_fallback";
  }
  if (readyEmptyStateCount > 0) {
    return "ready_empty_state";
  }
  throw new Error(
    "Attribution detail has neither source rows nor a governed fallback state.",
  );
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
  const observedRoute = page.url().replace(workbenchBaseUrl, "");
  await screenshotAdvisoryJourney(page, screenshotName, {
    route: observedRoute,
    panel,
    state: "demo_ready",
  });
  recordAdvisoryJourneyCheck(summary, {
    key,
    title,
    route: observedRoute,
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
    assertTableHasRows,
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
      await expect(
        page.getByRole("heading", { name: "Review Evidence", exact: true }),
      ).toBeVisible({
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
    owner: "lotus-idea",
    sourcePosture: "idea-review-queue-through-gateway",
    screenshotAdvisoryJourney,
    validate: async () => {
      await expect(page.getByLabel("Idea candidates")).toBeVisible({
        timeout: timeoutMs,
      });
      const queueProofPosture = page.getByLabel("Idea queue proof posture");
      await expect(queueProofPosture).toContainText(
        "Policy: idea-deterministic-ranking-v1",
        { timeout: timeoutMs },
      );
      await expect(queueProofPosture).toContainText(
        /Evaluated: \d{4}-\d{2}-\d{2}T/,
        { timeout: timeoutMs },
      );
      await expect(queueProofPosture).toContainText(
        "Durable storage: Backed",
        { timeout: timeoutMs },
      );
      const candidateTable = tableByExactLabel(page, "Idea candidate review queue");
      await assertTableHasRows(
        candidateTable,
        1,
        "Idea candidate review queue",
      );
      const canonicalCandidateLink = candidateTable.getByRole("link", {
        name: /^High Cash - idea_high_cash_[0-9a-f]{16}$/,
      });
      await expect(canonicalCandidateLink).toBeVisible({ timeout: timeoutMs });
      const canonicalCandidateId = resolveHighCashIdeaCandidateId(
        await canonicalCandidateLink.getAttribute("href"),
        workbenchBaseUrl,
      );
      await canonicalCandidateLink.click();
      await expect(page).toHaveURL(
        new RegExp(
          `candidateId=${encodeURIComponent(canonicalCandidateId)}`,
        ),
        { timeout: timeoutMs },
      );
      const candidateDetailPanel = page.getByLabel(
        "Idea candidate source-safe detail",
      );
      await expect(candidateDetailPanel).toBeVisible({ timeout: timeoutMs });
      await expect(
        candidateDetailPanel.getByText(canonicalCandidateId, {
          exact: true,
        }),
      ).toBeVisible({ timeout: timeoutMs });
      await expect(page.getByText(/Lifecycle: (?!Pending).+/)).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(page.getByText(/Sources: [1-9]\d*/)).toBeVisible({
        timeout: timeoutMs,
      });
      await expect(
        candidateDetailPanel.getByText(/Source refs: (?!None).+/),
      ).toBeVisible({ timeout: timeoutMs });
      await expect(
        candidateDetailPanel.getByText(/Source signals: (?!None).+/),
      ).toBeVisible({ timeout: timeoutMs });
      await expect(
        candidateDetailPanel.getByText(
          /Queue policy: idea-deterministic-ranking-v1/,
        ),
      ).toBeVisible({ timeout: timeoutMs });
      await expect(
        candidateDetailPanel.getByText(/Queue evaluated: \d{4}-\d{2}-\d{2}T/),
      ).toBeVisible({ timeout: timeoutMs });
      const ideaDetailHash = candidateDetailPanel
        .getByText(/Evidence hash: sha256:/)
        .first();
      const ideaDetailHashAvailable = (await ideaDetailHash.count()) > 0;
      await expect(
        page.getByText(
          "Candidate detail is unavailable through Gateway. No raw API response is shown.",
        ),
      ).toHaveCount(0);
      await expect(
        page.getByText("Advisor Decision", { exact: true }),
      ).toBeVisible({ timeout: timeoutMs });
      const actionPanel = page.getByLabel("Idea candidate advisor actions");
      await expect(actionPanel).toBeVisible({ timeout: timeoutMs });

      await actionPanel.getByRole("button", { name: "Record feedback" }).click();
      const feedbackStatus = page.getByTestId("idea-action-feedback-status");
      await expect(feedbackStatus).toBeVisible({ timeout: timeoutMs });
      await expect(feedbackStatus).toHaveAttribute(
        "data-action-state",
        "recorded-and-refreshed",
      );
      await expect(feedbackStatus).toContainText("Feedback recorded through Gateway.");

      await actionPanel.getByRole("button", { name: "Record review" }).click();
      const reviewStatus = page.getByTestId("idea-action-review-status");
      await expect(reviewStatus).toBeVisible({ timeout: timeoutMs });
      await expect(reviewStatus).toHaveAttribute(
        "data-action-state",
        "recorded-and-refreshed",
      );
      await expect(reviewStatus).toContainText("Review recorded through Gateway.");

      await actionPanel.getByRole("button", { name: "Record intent" }).click();
      const conversionStatus = page.getByTestId(
        "idea-action-conversion-status",
      );
      await expect(conversionStatus).toBeVisible({ timeout: timeoutMs });
      await expect(conversionStatus).toHaveAttribute(
        "data-action-state",
        "recorded-and-refreshed",
      );
      await expect(conversionStatus).toContainText(
        "Conversion intent recorded through Gateway.",
      );

      summary.uiChecks.push({
        description:
          "Lotus Idea review-action, feedback, and conversion-intent browser controls",
        kind: "idea-action-control-browser-proof",
        route: "/recommendations?mode=opportunities",
        owner: "lotus-idea",
        gatewayBacked: true,
        selectedCandidateId: canonicalCandidateId,
        canonicalCandidateProof:
          "candidate_id_policy_evaluation_source_signal_and_source_ref_verified",
        sourceHashVerified: ideaDetailHashAvailable,
        sourceHashBoundary: ideaDetailHashAvailable
          ? "Idea detail exposed source hash and browser proof observed it."
          : "Idea detail contract did not expose a source hash; no hash-backed deterministic seed claim is made.",
        sourceRefresh: "verified_after_each_mutation",
        actions: ["feedback", "review_action", "conversion_intent"],
        nonClaims: [
          "production_identity",
          "supported_feature_promotion",
          "client_publication",
          "suitability_approval",
          "proposal_creation",
          "execution_authority",
        ],
      });
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
        page.getByText("Preparation Readiness", { exact: true }).first(),
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
      const internalReviewButton = page.getByRole("button", {
        name: "Record internal review",
      });
      const approvedPosture = page.getByText("Approved For Internal Use", {
        exact: true,
      });
      const reviewReadyDeadline = Date.now() + timeoutMs;
      let reviewState = "pending";
      while (Date.now() < reviewReadyDeadline) {
        if (
          await approvedPosture
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          reviewState = "approved";
          break;
        }
        if (await internalReviewButton.isEnabled().catch(() => false)) {
          reviewState = "reviewable";
          break;
        }
        await page.waitForTimeout(500);
      }
      if (reviewState === "pending") {
        throw new Error(
          "Advisory copilot review never became reviewable or approved.",
        );
      }
      if (reviewState === "reviewable") {
        await internalReviewButton.click();
      }
      await expect(approvedPosture.first()).toBeVisible({
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
    sourcePosture: "portfolio-book-and-workspace-evaluation-through-gateway",
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
      await page
        .getByRole("button", { name: "Evaluate Workspace" })
        .click({ timeout: timeoutMs });
      await expect(
        page.getByRole("status", { name: "Proposal evaluation summary" }),
      ).toContainText("Advise Evaluation Summary", {
        timeout: timeoutMs,
      });
    },
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
  const priorityAttentionHeading = page.getByRole("heading", {
    name: "Review priority attention",
  });
  if ((await priorityAttentionHeading.count()) > 0) {
    await expect(priorityAttentionHeading).toBeVisible({
      timeout: timeoutMs,
    });
  } else {
    const decisionReview = page.getByRole("region", {
      name: "Portfolio decision review",
    });
    const attentionItems = decisionReview.locator(
      ".workbench-decision-brief-attention-item",
    );
    const emptyState = decisionReview.locator(
      ".workbench-decision-brief-empty",
    );
    if ((await attentionItems.count()) > 0) {
      await expect(attentionItems.first()).toBeVisible({
        timeout: timeoutMs,
      });
    } else {
      await expect(emptyState).toHaveText("No source-reported items need attention.", {
        timeout: timeoutMs,
      });
    }
  }
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

export function buildReportCentreProofPosture(pdfOutputReady) {
  if (pdfOutputReady) {
    return {
      panelState: "partial",
      outputFormat: "pdf",
      pdfOutputState: "ready",
      reason:
        "Structured report data and governed PDF creation are available for advisor review; archive retention and client delivery remain separate controls.",
    };
  }

  return {
    panelState: "partial",
    outputFormat: "json",
    pdfOutputState: "unavailable",
    reason:
      "Structured report data is available while governed PDF creation remains unavailable; archive retention and client delivery remain separate controls.",
  };
}

export async function validateReportCentrePanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertTableHasRows,
  },
) {
  await page.goto(`${workbenchBaseUrl}/reports?portfolioId=${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Report Centre" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Approved report" })).toBeVisible({
    timeout: timeoutMs,
  });
  const structuredDataRadio = page.getByRole("radio", {
    name: /Structured data package/,
  });
  const governedPdfRadio = page.getByRole("radio", {
    name: /Governed PDF document/,
  });
  const reportCentreProof = buildReportCentreProofPosture(
    !(await governedPdfRadio.isDisabled()),
  );

  if (reportCentreProof.pdfOutputState === "ready") {
    await governedPdfRadio.check({ timeout: timeoutMs });
    await expect(governedPdfRadio).toBeChecked({ timeout: timeoutMs });
    await expect(
      page.getByText("Governed document creation is available."),
    ).toBeVisible({ timeout: timeoutMs });
  } else {
    await expect(structuredDataRadio).toBeChecked({ timeout: timeoutMs });
    await expect(governedPdfRadio).toBeDisabled({ timeout: timeoutMs });
    await expect(
      page.getByText(/PDF creation is temporarily unavailable/),
    ).toBeVisible({ timeout: timeoutMs });
  }
  await expect(page.getByText("Review before any client use")).toBeVisible({
    timeout: timeoutMs,
  });

  await page.getByRole("button", { name: "Review Request" }).click({
    timeout: timeoutMs,
  });
  const submitButton = page.getByRole("button", {
    name: "Submit Report Request",
  });
  await expect(submitButton).toBeEnabled({ timeout: timeoutMs });
  await submitButton.click({ timeout: timeoutMs });
  await expect(page.getByText("Report request recorded")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Report request accepted" }),
  ).toBeVisible({ timeout: timeoutMs });
  await expect(
    page.getByRole("button", { name: "Submit Report Request" }),
  ).toHaveCount(0);
  await assertTableHasRows(
    tableByExactLabel(page, "Recent portfolio report requests"),
    1,
    "Recent portfolio report requests",
  );
  return reportCentreProof;
}

export async function validateAdvisorBookPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(`${workbenchBaseUrl}/book?asOfDate=${canonicalAsOfDate}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "My book", exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Own book", { exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  const bookTable = tableByExactLabel(page, "Portfolios in my book");
  await assertTableHasRows(bookTable, 1, "Portfolios in my book");
  const canonicalPortfolioLink = bookTable
    .locator(`a[href*="portfolioId=${encodeURIComponent(portfolioId)}"]`)
    .first();
  await expect(canonicalPortfolioLink).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByRole("heading", { name: "Operating boundaries" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Operational details" })).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "advisor.book_overview");
}

export async function validatePerformanceSummaryPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalStartDate,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&period=EXPLICIT&detailBasis=NET&benchmark=${benchmarkCode}&reportStartDate=${canonicalStartDate}&reportEndDate=${canonicalAsOfDate}`,
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
    canonicalStartDate,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    recordUiCheck,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=analysis&period=EXPLICIT&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&benchmark=${benchmarkCode}&reportStartDate=${canonicalStartDate}&reportEndDate=${canonicalAsOfDate}`,
    { waitUntil: "networkidle", timeout: timeoutMs },
  );
  await assertRailModeActive(page, /^Performance Analysis/, timeoutMs);
  const attributionTrendEvidence = page.getByTestId("attribution-trend-evidence");
  await expect(attributionTrendEvidence).toBeVisible({ timeout: timeoutMs });
  await expect(attributionTrendEvidence).not.toHaveAttribute("data-state", "loading");
  const attributionTrendPosture = await attributionTrendEvidence.getAttribute("data-state");
  if (attributionTrendPosture === "multi-observation") {
    await expect(
      page.getByRole("heading", { name: "Attribution Over Time", exact: true }),
    ).toBeVisible({ timeout: timeoutMs });
    await expect(
      page.getByRole("img", { name: "Attribution over time chart", exact: true }),
    ).toBeVisible({ timeout: timeoutMs });
    await assertTableHasRows(
      page.locator('table[aria-label="Attribution trend table"]'),
      2,
      "Attribution trend table",
    );
  } else if (attributionTrendPosture === "single-observation") {
    await expect(attributionTrendEvidence).toHaveAttribute("data-observation-count", "1");
    await expect(
      page.getByRole("heading", { name: "Attribution Observation", exact: true }),
    ).toBeVisible({ timeout: timeoutMs });
    await assertTableHasRows(
      page.locator('table[aria-label="Attribution observation table"]'),
      1,
      "Attribution observation table",
    );
  } else {
    throw new Error(
      `Performance Analysis attribution history must be source-confirmed evidence, received ${attributionTrendPosture ?? "missing"}.`,
    );
  }
  recordUiCheck({
    description: "Attribution history evidence",
    kind: "supportability",
    posture: attributionTrendPosture,
  });
  await expect(
    page.getByRole("heading", { name: "Attribution Detail", exact: true }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Performance Drivers" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  const attributionDetailTable = tableByExactLabel(
    page,
    "Asset Class attribution table",
  );
  const attributionSummaryTable = tableByExactLabel(
    page,
    "Asset Class attribution totals",
  );
  const partialFallbackHeading = page.getByRole("heading", {
    name: "Attribution detail is partial",
    exact: true,
  });
  const readyEmptyState = page.getByText(
    "Attribution detail is marked available, but no segment attribution levels were returned for the current selection.",
    { exact: true },
  );
  const attributionEvidence = classifyAttributionDetailEvidence({
    detailTableCount: await attributionDetailTable.count(),
    summaryTableCount: await attributionSummaryTable.count(),
    partialFallbackCount: await partialFallbackHeading.count(),
    readyEmptyStateCount: await readyEmptyState.count(),
  });
  if (attributionEvidence === "detail_rows") {
    await assertTableHasRows(attributionDetailTable, 1, "Attribution detail table");
  } else if (attributionEvidence === "summary_fallback") {
    await assertTableHasRows(attributionSummaryTable, 1, "Attribution summary fallback table");
  } else if (attributionEvidence === "governed_partial_fallback") {
    await expect(partialFallbackHeading).toBeVisible({ timeout: timeoutMs });
  } else {
    await expect(readyEmptyState).toBeVisible({ timeout: timeoutMs });
  }
  recordUiCheck({
    description: "Attribution detail evidence",
    kind: "supportability",
    posture: attributionEvidence,
  });
  const performanceDriversPanel = page.locator("#performance-drivers").first();
  await expect(performanceDriversPanel).toBeVisible({ timeout: timeoutMs });
  await performanceDriversPanel.scrollIntoViewIfNeeded();
  const positionsTab = performanceDriversPanel.getByRole("tab", {
    name: /^Positions/i,
  });
  await expect(positionsTab).toBeVisible({ timeout: timeoutMs });
  await positionsTab.scrollIntoViewIfNeeded();
  await positionsTab.click({ timeout: timeoutMs });
  await assertTableHasRows(
    performanceDriversPanel.locator('table[aria-label="Position contribution table"]'),
    1,
    "Position contribution detail table",
  );
  const segmentSummaryTab = performanceDriversPanel.getByRole("tab", {
    name: /^Segment Summary/i,
  });
  await expect(segmentSummaryTab).toBeVisible({ timeout: timeoutMs });
  await segmentSummaryTab.scrollIntoViewIfNeeded();
  await segmentSummaryTab.click({ timeout: timeoutMs });
  await assertTableHasRows(
    performanceDriversPanel.locator('table[aria-label="Asset Class contribution table"]'),
    1,
    "Segment contribution detail table",
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
    canonicalStartDate,
    canonicalAsOfDate,
    timeoutMs,
    screenshotRegisteredPanel,
    performAcceptReviewActionProof = false,
  },
) {
  const buildAdvisorBriefRoute = ({ detailBasis, chartFrequency }) =>
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=advisor&period=EXPLICIT&detailBasis=${detailBasis}&chartFrequency=${chartFrequency}&benchmark=${benchmarkCode}&reportStartDate=${canonicalStartDate}&reportEndDate=${canonicalAsOfDate}`;
  let proofQuery = { detailBasis: "NET", chartFrequency: "monthly" };
  await page.goto(
    buildAdvisorBriefRoute(proofQuery),
    { waitUntil: "networkidle", timeout: timeoutMs },
  );
  await assertRailModeActive(page, /^Advisor Brief/, timeoutMs);
  await expect(
    page.getByRole("heading", { name: "Performance Advisor Brief" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "Advisor Talking Points" }),
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
    let reviewRegion = page.getByLabel("Advisor brief human review");
    let supportabilityRegion = page.getByLabel(
      "Advisor brief supportability",
    );
    await expect(reviewRegion).toBeVisible({ timeout: timeoutMs });
    await expect(supportabilityRegion).toBeVisible({ timeout: timeoutMs });
    const expectedReviewer = "live.validator.ui";
    let proofPosture = classifyAdvisorBriefAcceptProofPosture(
      await supportabilityRegion.innerText(),
      expectedReviewer,
    );
    if (
      proofPosture === "accepted-by-another-reviewer" ||
      proofPosture === "review-action-unavailable"
    ) {
      proofQuery = { detailBasis: "GROSS", chartFrequency: "quarterly" };
      await page.goto(buildAdvisorBriefRoute(proofQuery), {
        waitUntil: "networkidle",
        timeout: timeoutMs,
      });
      await assertRailModeActive(page, /^Advisor Brief/, timeoutMs);
      reviewRegion = page.getByLabel("Advisor brief human review");
      supportabilityRegion = page.getByLabel("Advisor brief supportability");
      await expect(reviewRegion).toBeVisible({ timeout: timeoutMs });
      await expect(supportabilityRegion).toBeVisible({ timeout: timeoutMs });
      proofPosture = classifyAdvisorBriefAcceptProofPosture(
        await supportabilityRegion.innerText(),
        expectedReviewer,
      );
      if (
        proofPosture === "accepted-by-another-reviewer" ||
        proofPosture === "review-action-unavailable"
      ) {
        throw new Error(
          `Advisor brief browser ACCEPT proof could not reserve an actionable GROSS fallback run (posture: ${proofPosture}).`,
        );
      }
    }
    const existingRecordedAccept =
      proofPosture === "source-confirmed-existing-action";
    if (!existingRecordedAccept) {
      const reviewDecision = reviewRegion.getByLabel("Review decision");
      await expect(reviewDecision).toBeVisible({ timeout: timeoutMs });
      await reviewDecision.selectOption("ACCEPT");
      await reviewRegion
        .getByLabel("Reviewer reference")
        .fill(expectedReviewer);
      await reviewRegion
        .getByLabel("Review rationale")
        .fill(
          "Live canonical validator proving the Workbench ACCEPT review path.",
        );
      await reviewRegion
        .getByRole("button", { name: "Review decision", exact: true })
        .click();
      const confirmAcceptance = reviewRegion.getByRole("button", {
        name: "Confirm acceptance",
        exact: true,
      });
      await expect(confirmAcceptance).toBeVisible({ timeout: timeoutMs });
      await confirmAcceptance.click();
    }
    await expect
      .poll(
        async () =>
          hasRecordedAdvisorBriefAcceptProof(
            await supportabilityRegion.innerText(),
            expectedReviewer,
          ),
        {
          timeout: timeoutMs,
        },
      )
      .toBe(true);
    await expect(supportabilityRegion).toContainText(expectedReviewer, {
      timeout: timeoutMs,
    });
    summary.uiChecks.push({
      description: "Advisor brief ACCEPT review action",
      kind: "workflow-pack-review-action",
      actionType: "ACCEPT",
      state: "accepted",
      proofSource: existingRecordedAccept
        ? "source-confirmed-existing-action"
        : "workbench-review-action",
      detailBasis: proofQuery.detailBasis,
      chartFrequency: proofQuery.chartFrequency,
    });
    return proofQuery;
  }

  return null;
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

export async function validateBankDemoProofPanel(
  page,
  { summary, workbenchBaseUrl, portfolioId, timeoutMs, screenshotRegisteredPanel },
) {
  await page.goto(
    `${workbenchBaseUrl}/recommendations?portfolioId=${encodeURIComponent(portfolioId)}&mode=proof`,
    {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    },
  );
  await expect(
    page.getByRole("heading", { name: "Bank Demo Proof", exact: true }).first(),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByLabel("Bank demo proof summary")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByLabel("Bank demo scenario steps")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByLabel("Supported claim register")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Client Publication")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Blocked").first()).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByText("Client-ready publication is blocked").first(),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Unsupported").first()).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("button", { name: /approve|publish|client-ready/i }),
  ).toHaveCount(0);
  await expect(page.getByText("CLIENT_READY_PUBLICATION")).toHaveCount(0);
  await expect(page.getByText("OMS_ORDER_LIFECYCLE")).toHaveCount(0);

  summary.uiChecks.push({
    description: "RFC-0028 bank demo proof supported-claim surface",
    kind: "bank-demo-proof",
    portfolioId,
    route: `/recommendations?portfolioId=${encodeURIComponent(portfolioId)}&mode=proof`,
    clientReadyPublication: "blocked",
    sourcePosture: "scenario-and-claims-through-gateway",
  });
  await screenshotRegisteredPanel(page, "advisory.bank_demo_proof", {
    route: `/recommendations?portfolioId=${encodeURIComponent(portfolioId)}&mode=proof`,
  });
}

export async function validateRiskPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalStartDate,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=risk&period=EXPLICIT&detailBasis=NET&benchmark=${benchmarkCode}&reportStartDate=${canonicalStartDate}&reportEndDate=${canonicalAsOfDate}`,
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

  const executiveEvidence = page.getByRole("region", {
    name: "Risk executive overview",
  });
  await expect(executiveEvidence).toBeVisible({ timeout: timeoutMs });
  for (const label of [
    "Realized volatility",
    "Max drawdown",
    "Largest position",
    "Source coverage",
  ]) {
    await expect(executiveEvidence.getByText(label, { exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
  }
  const policyBoundary = page.getByRole("note", {
    name: "Risk mandate comparison boundary",
  });
  await expect(policyBoundary).toContainText("Not supplied by source", {
    timeout: timeoutMs,
  });
  await expect(policyBoundary).toContainText(
    "does not infer a breach or an all-clear",
    { timeout: timeoutMs },
  );
  for (const retiredClassification of [
    "Contained",
    "Moderate",
    "Elevated",
    "High",
    "Severe",
    "Acceptable",
    "Diversified",
  ]) {
    await expect(
      executiveEvidence.getByText(retiredClassification, { exact: true }),
    ).toHaveCount(0);
  }

  const originalViewport = page.viewportSize() ?? { width: 1440, height: 1000 };
  for (const width of [1440, 1024, 519]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(executiveEvidence).toBeVisible({ timeout: timeoutMs });
    await expect(policyBoundary).toBeVisible({ timeout: timeoutMs });
    const pageReflows = await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.document.documentElement.clientWidth + 1,
    );
    if (!pageReflows) {
      throw new Error(`Risk Review creates page-level horizontal scrolling at ${width}px.`);
    }
  }
  await page.setViewportSize(originalViewport);
  await screenshotRegisteredPanel(page, "performance.risk.snapshot");
}

export function classifyPerformanceEvidenceScreenshotState(assuranceState) {
  return assuranceState === "ready" ? "demo_ready" : "truthfully_degraded";
}

export async function validateEvidencePanel(
  page,
  {
    summary,
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalStartDate,
    canonicalAsOfDate,
    timeoutMs,
    screenshotRegisteredPanel,
  },
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=evidence&period=EXPLICIT&detailBasis=NET&benchmark=${benchmarkCode}&reportStartDate=${canonicalStartDate}&reportEndDate=${canonicalAsOfDate}`,
    { waitUntil: "networkidle", timeout: timeoutMs },
  );
  await assertRailModeActive(page, /^Evidence/, timeoutMs);
  await expect(
    page.getByRole("heading", { name: "Calculation assurance" }),
  ).toBeVisible({ timeout: timeoutMs });
  const assuranceWorkspace = page.getByTestId("performance-evidence-assurance");
  let screenshotState = "truthfully_degraded";
  if (await assuranceWorkspace.count()) {
    await expect(assuranceWorkspace).toBeVisible({ timeout: timeoutMs });
    await expect(assuranceWorkspace).toHaveAttribute(
      "data-assurance-state",
      /^(ready|attention|incomplete|unavailable)$/,
    );
    await expect(
      assuranceWorkspace.getByRole("heading", { name: "Control exceptions" }),
    ).toBeVisible({ timeout: timeoutMs });
    await expect(
      assuranceWorkspace.getByRole("heading", { name: "Calculation coverage" }),
    ).toBeVisible({ timeout: timeoutMs });
    const assuranceState = await assuranceWorkspace.getAttribute("data-assurance-state");
    summary.uiChecks.push({
      description: "Calculation assurance source posture",
      kind: "assurance-workspace",
      state: assuranceState,
    });
    screenshotState = classifyPerformanceEvidenceScreenshotState(assuranceState);
  } else {
    await expect(
      page.getByRole("heading", { name: /Assurance (evidence incomplete|unavailable)/ }),
    ).toBeVisible({
      timeout: timeoutMs,
    });
    summary.uiChecks.push({
      description: "Calculation assurance source posture",
      kind: "assurance-workspace",
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
  const mandatePanel = workbenchPanelByClass(page, "manage-mandate-panel");
  await expect(
    mandatePanel.getByRole("heading", { name: "Mandate review workflow" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(mandatePanel.getByText("Mandate health", { exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(mandatePanel.getByText("Data readiness", { exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    mandatePanel.getByRole("heading", { name: "Attention Required" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(
    mandatePanel.getByRole("heading", { name: "Health Dimensions Breakdown" }),
  ).toBeVisible({
    timeout: timeoutMs,
  });

  const attentionItems = mandatePanel.getByLabel("Mandate attention items");
  const attentionButtons = attentionItems.getByRole("button");
  const attentionCount = await attentionButtons.count();
  if (attentionCount < 1) {
    throw new Error("DPM mandate review expected at least one source-owned attention item.");
  }
  const selectedIndex = attentionCount > 1 ? 1 : 0;
  const selectedAttention = attentionButtons.nth(selectedIndex);
  await selectedAttention.focus();
  await selectedAttention.press("Enter");
  await expect(selectedAttention).toHaveAttribute("aria-pressed", "true", {
    timeout: timeoutMs,
  });

  const selectedReview = mandatePanel.getByLabel("Selected mandate review item");
  await expect(selectedReview.getByText("Source-owned next step")).toBeVisible({
    timeout: timeoutMs,
  });
  await selectedReview.getByText("Evidence and technical identifiers").click();
  await expect(selectedReview.getByText("Exception ID")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(mandatePanel.getByText("DPM_SOURCE_STALE", { exact: true })).toHaveCount(0);
  await expect(
    mandatePanel.getByText("SOURCE_RISK_HEALTH_ATTENTION", { exact: true }),
  ).toHaveCount(0);
  await expect(
    mandatePanel.getByText("Source Risk Health Attention", { exact: true }),
  ).toHaveCount(0);
  await expect(
    mandatePanel.getByText("Advisor review recommended before rebalance approval.", {
      exact: true,
    }),
  ).toHaveCount(0);

  const originalViewport = page.viewportSize() ?? { width: 1440, height: 1000 };
  for (const width of [1024, 768, 720, 519]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(mandatePanel).toBeVisible({ timeout: timeoutMs });
    const pageReflows = await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.document.documentElement.clientWidth + 1,
    );
    if (!pageReflows) {
      throw new Error(`DPM mandate review creates page-level horizontal scrolling at ${width}px.`);
    }
  }
  await page.setViewportSize(originalViewport);
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
