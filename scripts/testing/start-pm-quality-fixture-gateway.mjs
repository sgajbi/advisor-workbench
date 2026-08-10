import { createServer } from "node:http";

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const portValue = process.env.PM_QUALITY_E2E_FIXTURE_PORT?.trim() || "18140";
if (!/^\d+$/.test(portValue)) {
  throw new Error("PM_QUALITY_E2E_FIXTURE_PORT must be an integer between 1024 and 65535.");
}
const port = Number.parseInt(portValue, 10);
if (port < 1024 || port > 65_535) {
  throw new Error("PM_QUALITY_E2E_FIXTURE_PORT must be an integer between 1024 and 65535.");
}
if (process.env.PM_QUALITY_E2E_FIXTURE !== "record-selection") {
  throw new Error("PM quality fixture requires PM_QUALITY_E2E_FIXTURE=record-selection.");
}

const policySupportability = {
  source_service: "lotus-manage",
  authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
  state: "READY",
  reason_codes: ["PM_QUALITY_READY"],
  blocked_actions: [],
  policy_id: "pmq_sg_dpm",
  policy_version: "2026.05",
  count: 2,
};

const scoreRuns = [
  scoreRun("pmq_run_001", "PM_SG_001", "PM_BOOK_SG_BALANCED", "READY", "90.00"),
  scoreRun("pmq_run_002", "PM_SG_002", "PM_BOOK_SG_INCOME", "REVIEW_REQUIRED", "74.00"),
];
const fairnessAnalyses = [
  fairnessAnalysis("pmq_fair_001", "PENDING_REVIEW", "12.00"),
  fairnessAnalysis("pmq_fair_002", "REVIEW_REQUIRED", "18.00"),
];
const reviewActions = [
  reviewAction("pmq_review_001", "PMQ-RA-001", "pmq_run_001", "PENDING_REVIEW"),
  reviewAction("pmq_review_002", "PMQ-RA-002", "pmq_run_002", "REVIEW_REQUIRED"),
];

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const path = requestUrl.pathname;

  if (path === `/api/v1/workbench/${portfolioId}/portfolio-360`) {
    sendJson(response, portfolio360());
    return;
  }
  if (path === "/api/v1/dpm/command-center/pm-operating-quality/policies") {
    sendJson(response, envelope({ policies: [policy()] }, "corr-pmq-policies"));
    return;
  }
  if (path === "/api/v1/dpm/command-center/pm-operating-quality/score-runs") {
    sendJson(response, envelope({ score_runs: scoreRuns, fairness_segments: segments() }, "corr-pmq-runs"));
    return;
  }
  if (path === "/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses") {
    sendJson(response, envelope({ fairness_analyses: fairnessAnalyses }, "corr-pmq-fairness"));
    return;
  }
  if (path.startsWith("/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses/")) {
    const id = decodeURIComponent(path.split("/").at(-1) ?? "");
    const item = fairnessAnalyses.find((candidate) => candidate.fairness_analysis_id === id);
    sendJson(response, item ? envelope({ fairness_analysis: fairnessDetail(item) }, `corr-${id}`) : { code: "not_found" }, item ? 200 : 404);
    return;
  }
  if (path === "/api/v1/dpm/command-center/pm-operating-quality/review-actions") {
    sendJson(response, envelope({ review_actions: reviewActions }, "corr-pmq-reviews"));
    return;
  }
  if (path.startsWith("/api/v1/dpm/command-center/pm-operating-quality/review-actions/")) {
    const id = decodeURIComponent(path.split("/").at(-1) ?? "");
    const item = reviewActions.find((candidate) => candidate.review_action_id === id);
    sendJson(response, item ? envelope({ review_action: reviewDetail(item) }, `corr-${id}`) : { code: "not_found" }, item ? 200 : 404);
    return;
  }
  if (path === "/api/v1/dpm/command-center/pm-operating-quality/summary-invocations") {
    sendJson(response, envelope({ summary_invocations: [summaryInvocation()] }, "corr-pmq-summaries"));
    return;
  }
  if (path.endsWith("/pm-operating-quality/summary-invocations/pmq_summary_001")) {
    sendJson(response, envelope({ summary_invocation: summaryInvocation() }, "corr-pmq-summary-detail"));
    return;
  }

  sendJson(response, { code: "fixture_route_unavailable", path }, 503);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PM quality fixture listening on http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}

function envelope(data, correlationId) {
  return {
    correlation_id: correlationId,
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    supportability: policySupportability,
    data,
  };
}

function policy() {
  return {
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    enabled: true,
    state: "READY",
    as_of_date: "2026-05-13",
  };
}

function scoreRun(scoreRunId, pmId, bookId, state, score) {
  return {
    score_run_id: scoreRunId,
    pm_id: pmId,
    book_id: bookId,
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    state,
    score,
    as_of_date: "2026-05-13",
    reason_codes: [state === "READY" ? "PM_QUALITY_READY" : "PM_QUALITY_REVIEW_REQUIRED"],
    forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
    source_refs: sourceRefs("PmOperatingQualityScoreRun", scoreRunId),
  };
}

function fairnessAnalysis(fairnessAnalysisId, state, observedSpread) {
  return {
    fairness_analysis_id: fairnessAnalysisId,
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    state,
    as_of_date: "2026-05-13",
    observed_average_score_spread: observedSpread,
    segment_count: 2,
    generated_by: "lotus-manage",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    source_refs: sourceRefs("PmOperatingQualityFairnessAnalysis", fairnessAnalysisId),
  };
}

function fairnessDetail(item) {
  return {
    ...item,
    product_name: "PmOperatingQualityFairnessAnalysis",
    product_version: "v1",
    minimum_segment_score_run_count: 2,
    maximum_average_score_spread: "15.00",
    generated_at: "2026-05-13T10:40:00Z",
    forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
    segment_results: [],
  };
}

function reviewAction(reviewActionId, reviewActionRef, targetId, actionState) {
  return {
    review_action_id: reviewActionId,
    review_action_ref: reviewActionRef,
    target_type: "SCORE_RUN",
    target_id: targetId,
    action_type: "SUPERVISORY_REVIEW",
    action_state: actionState,
    actor_id: "supervisor_sg_1",
    as_of_date: "2026-05-13",
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
    operating_boundaries: ["NO_CLIENT_COMMUNICATION", "NO_TRADE_OR_EXECUTION"],
    source_refs: sourceRefs("PmOperatingQualityReviewAction", reviewActionId),
  };
}

function reviewDetail(item) {
  return {
    ...item,
    bounded_review_rationale: "Bounded supervisory review of source-owned PM quality posture.",
    forbidden_uses: ["client_contact", "oms_routing", "trade_execution"],
  };
}

function summaryInvocation() {
  return {
    summary_invocation_id: "pmq_summary_001",
    summary_ref: "PMQ-SUMMARY-001",
    score_run_id: "pmq_run_001",
    review_action_id: "pmq_review_001",
    invocation_state: "PENDING_REVIEW",
    workflow_pack_name: "pm-operating-quality-summary",
    workflow_pack_version: "2026.05",
    workflow_run_id: "wf_pmq_summary_001",
    requested_by: "supervisor_sg_1",
    as_of_date: "2026-05-13",
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
    source_refs: sourceRefs("PmOperatingQualitySummaryInvocation", "pmq_summary_001"),
    text_boundary: {
      generated_summary_text_stored: false,
      prompt_body_stored: false,
      model_response_stored: false,
      client_communication_projected: false,
      order_or_oms_projected: false,
    },
  };
}

function segments() {
  return [
    { segment_id: "balanced", segment_type: "MANDATE_TYPE", display_name: "Balanced mandates", score_run_ids: ["pmq_run_001"] },
    { segment_id: "income", segment_type: "MANDATE_TYPE", display_name: "Income mandates", score_run_ids: ["pmq_run_002"] },
  ];
}

function sourceRefs(sourceProduct, sourceId) {
  return [{ source_system: "lotus-manage", source_product: sourceProduct, source_id: sourceId }];
}

function portfolio360() {
  return {
    correlation_id: "corr-pmq-portfolio",
    contract_version: "v1",
    as_of_date: "2026-05-13",
    portfolio: { portfolio_id: portfolioId, client_id: "CLIENT_SG_001", base_currency: "USD", booking_center_code: "SG" },
    overview: { market_value_base: 12_500_000, cash_weight_pct: 6, position_count: 18 },
    performance_snapshot: null,
    rebalance_snapshot: null,
    current_positions: [],
    projected_positions: [],
    projected_summary: null,
    active_session_id: null,
    warnings: [],
    partial_failures: [],
  };
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}
