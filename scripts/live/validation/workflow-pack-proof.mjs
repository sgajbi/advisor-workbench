function buildAdvisorBriefWorkspaceQuery(params) {
  const query = new URLSearchParams();
  query.set("period", params.period);
  query.set("chart_frequency", params.chartFrequency ?? "monthly");
  query.set("contribution_dimension", params.contributionDimension ?? "asset_class");
  query.set("attribution_dimension", params.attributionDimension ?? "asset_class");
  query.set("detail_basis", params.detailBasis);
  query.set("benchmark_code", params.benchmarkCode);
  if (params.reportStartDate) {
    query.set("report_start_date", params.reportStartDate);
  }
  if (params.reportEndDate) {
    query.set("report_end_date", params.reportEndDate);
  }
  return query.toString();
}

function recordWorkflowPackCheck(summary, payload) {
  summary.workflowPackChecks.push(payload);
}

function assertWorkflowPackRunPresence(payload, description) {
  const run = payload?.workflow_pack_run;
  if (!run?.run_id) {
    throw new Error(`${description} returned no workflow-pack run identity.`);
  }
  return run;
}

function assertReplacementLineagePosture(payload, expectedReviewState, replacementRunId) {
  const run = assertWorkflowPackRunPresence(
    payload,
    `Advisor brief ${expectedReviewState} review action`
  );
  if (run.review_state !== expectedReviewState) {
    throw new Error(
      `Advisor brief ${expectedReviewState} review action returned review state '${String(
        run.review_state
      )}' instead of '${expectedReviewState}'.`
    );
  }
  if (run.supportability_status !== "HISTORICAL") {
    throw new Error(
      `Advisor brief ${expectedReviewState} review action returned supportability '${String(
        run.supportability_status
      )}' instead of 'HISTORICAL'.`
    );
  }
  if (run.superseded !== true) {
    throw new Error(
      `Advisor brief ${expectedReviewState} review action did not mark the run as historical.`
    );
  }
  if (run.replacement_run_id !== replacementRunId) {
    throw new Error(
      `Advisor brief ${expectedReviewState} review action returned replacement_run_id '${String(
        run.replacement_run_id
      )}' instead of '${replacementRunId}'.`
    );
  }
  return run;
}

export async function validateAdvisorBriefWorkflowPackReviewChain({
  summary,
  gatewayBaseUrl,
  portfolioId,
  benchmarkCode,
  canonicalAsOfDate,
  timeoutMs,
  fetchJson,
  postJson,
}) {
  const acceptQuery = buildAdvisorBriefWorkspaceQuery({
    period: "YTD",
    detailBasis: "NET",
    benchmarkCode,
  });
  const acceptedBrief = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${acceptQuery}`,
    "Advisor brief ACCEPT review action",
    timeoutMs,
    {
      action_type: "ACCEPT",
      reviewed_by: "live.validator.accept",
      reason: "Live canonical validator proving bounded ACCEPT review posture.",
    }
  );
  const acceptedRun = assertWorkflowPackRunPresence(acceptedBrief, "Advisor brief ACCEPT review action");
  if (acceptedRun.review_state !== "ACCEPTED") {
    throw new Error(
      `Advisor brief ACCEPT review action returned review state '${String(
        acceptedRun.review_state
      )}' instead of 'ACCEPTED'.`
    );
  }
  if (acceptedRun.supportability_status !== "READY") {
    throw new Error(
      `Advisor brief ACCEPT review action returned supportability '${String(
        acceptedRun.supportability_status
      )}' instead of 'READY'.`
    );
  }
  recordWorkflowPackCheck(summary, {
    actionType: "ACCEPT",
    route: `/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${acceptQuery}`,
    sourceRunId: acceptedRun.run_id,
    resultReviewState: acceptedRun.review_state,
    resultSupportabilityStatus: acceptedRun.supportability_status,
  });

  const supersedeOriginalQuery = buildAdvisorBriefWorkspaceQuery({
    period: "EXPLICIT",
    detailBasis: "NET",
    benchmarkCode,
    reportStartDate: "2026-01-01",
    reportEndDate: canonicalAsOfDate,
  });
  const supersedeReplacementQuery = buildAdvisorBriefWorkspaceQuery({
    period: "EXPLICIT",
    detailBasis: "GROSS",
    benchmarkCode,
    reportStartDate: "2026-01-01",
    reportEndDate: canonicalAsOfDate,
  });
  const supersedeOriginal = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?${supersedeOriginalQuery}`,
    "Advisor brief supersede source run",
    timeoutMs
  );
  const supersedeReplacement = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?${supersedeReplacementQuery}`,
    "Advisor brief supersede replacement run",
    timeoutMs
  );
  const supersedeSourceRun = assertWorkflowPackRunPresence(
    supersedeOriginal,
    "Advisor brief supersede source run"
  );
  const supersedeReplacementRun = assertWorkflowPackRunPresence(
    supersedeReplacement,
    "Advisor brief supersede replacement run"
  );
  const supersededBrief = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${supersedeOriginalQuery}`,
    "Advisor brief SUPERSEDE review action",
    timeoutMs,
    {
      action_type: "SUPERSEDE",
      reviewed_by: "live.validator.supersede",
      reason: "Live canonical validator proving bounded SUPERSEDE replacement lineage.",
      replacement_run_id: supersedeReplacementRun.run_id,
    }
  );
  const supersededRun = assertReplacementLineagePosture(
    supersededBrief,
    "SUPERSEDED",
    supersedeReplacementRun.run_id
  );
  recordWorkflowPackCheck(summary, {
    actionType: "SUPERSEDE",
    route: `/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${supersedeOriginalQuery}`,
    sourceRunId: supersedeSourceRun.run_id,
    replacementRunId: supersedeReplacementRun.run_id,
    resultReviewState: supersededRun.review_state,
    resultSupportabilityStatus: supersededRun.supportability_status,
  });

  const reviseOriginalQuery = buildAdvisorBriefWorkspaceQuery({
    period: "YTD",
    detailBasis: "GROSS",
    benchmarkCode,
  });
  const reviseReplacementQuery = buildAdvisorBriefWorkspaceQuery({
    period: "EXPLICIT",
    detailBasis: "NET",
    benchmarkCode,
    reportStartDate: "2026-02-01",
    reportEndDate: canonicalAsOfDate,
  });
  const reviseOriginal = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?${reviseOriginalQuery}`,
    "Advisor brief revise source run",
    timeoutMs
  );
  const reviseReplacement = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?${reviseReplacementQuery}`,
    "Advisor brief revise replacement run",
    timeoutMs
  );
  const reviseSourceRun = assertWorkflowPackRunPresence(
    reviseOriginal,
    "Advisor brief revise source run"
  );
  const reviseReplacementRun = assertWorkflowPackRunPresence(
    reviseReplacement,
    "Advisor brief revise replacement run"
  );
  const revisedBrief = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${reviseOriginalQuery}`,
    "Advisor brief REVISE review action",
    timeoutMs,
    {
      action_type: "REVISE",
      reviewed_by: "live.validator.revise",
      reason: "Live canonical validator proving bounded REVISE replacement lineage.",
      replacement_run_id: reviseReplacementRun.run_id,
    }
  );
  const revisedRun = assertReplacementLineagePosture(
    revisedBrief,
    "REVISED",
    reviseReplacementRun.run_id
  );
  recordWorkflowPackCheck(summary, {
    actionType: "REVISE",
    route: `/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${reviseOriginalQuery}`,
    sourceRunId: reviseSourceRun.run_id,
    replacementRunId: reviseReplacementRun.run_id,
    resultReviewState: revisedRun.review_state,
    resultSupportabilityStatus: revisedRun.supportability_status,
  });
}
