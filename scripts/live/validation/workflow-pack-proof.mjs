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

function assertWorkflowPackTaskFlowPresence(payload, description) {
  const taskFlow = payload?.workflow_pack_task_flow;
  if (!taskFlow?.task_flow_id) {
    throw new Error(`${description} returned no workflow-pack task-flow identity.`);
  }
  return taskFlow;
}

function assertTaskFlowRunRef(taskFlow, runId, description) {
  const runRefs = Array.isArray(taskFlow.run_refs) ? taskFlow.run_refs : [];
  if (!runRefs.includes(runId)) {
    throw new Error(
      `${description} task-flow run_refs did not include source run '${runId}'.`
    );
  }
}

function assertTaskFlowReviewState(taskFlow, runId, expectedReviewState, description) {
  const reviewStates =
    taskFlow.review_states && typeof taskFlow.review_states === "object"
      ? taskFlow.review_states
      : {};
  if (reviewStates[runId] !== expectedReviewState) {
    throw new Error(
      `${description} task-flow review state for '${runId}' was '${String(
        reviewStates[runId]
      )}' instead of '${expectedReviewState}'.`
    );
  }
}

function assertAcceptedTaskFlowPosture(payload, runId) {
  const taskFlow = assertWorkflowPackTaskFlowPresence(
    payload,
    "Advisor brief ACCEPT review action"
  );
  assertTaskFlowRunRef(taskFlow, runId, "Advisor brief ACCEPT review action");
  assertTaskFlowReviewState(taskFlow, runId, "ACCEPTED", "Advisor brief ACCEPT review action");
  if (taskFlow.flow_status !== "COMPLETED") {
    throw new Error(
      `Advisor brief ACCEPT review action returned task-flow status '${String(
        taskFlow.flow_status
      )}' instead of 'COMPLETED'.`
    );
  }
  if (taskFlow.supportability_status !== "READY") {
    throw new Error(
      `Advisor brief ACCEPT review action returned task-flow supportability '${String(
        taskFlow.supportability_status
      )}' instead of 'READY'.`
    );
  }
  const handoffRefs = Array.isArray(taskFlow.handoff_refs) ? taskFlow.handoff_refs : [];
  if (!handoffRefs.some((handoff) => handoff?.status === "READY_FOR_HANDOFF")) {
    throw new Error(
      "Advisor brief ACCEPT review action returned no READY_FOR_HANDOFF task-flow handoff."
    );
  }
  return taskFlow;
}

function assertInitialTaskFlowPosture(payload, runId, description) {
  const taskFlow = assertWorkflowPackTaskFlowPresence(payload, description);
  assertTaskFlowRunRef(taskFlow, runId, description);
  if (!taskFlow.flow_status) {
    throw new Error(`${description} returned no task-flow status.`);
  }
  if (!taskFlow.supportability_status) {
    throw new Error(`${description} returned no task-flow supportability status.`);
  }
  return taskFlow;
}

function assertReplacementTaskFlowPosture(
  payload,
  expectedReviewState,
  sourceRunId,
  replacementRunId
) {
  const taskFlow = assertWorkflowPackTaskFlowPresence(
    payload,
    `Advisor brief ${expectedReviewState} review action`
  );
  assertTaskFlowRunRef(taskFlow, sourceRunId, `Advisor brief ${expectedReviewState} review action`);
  assertTaskFlowReviewState(
    taskFlow,
    sourceRunId,
    expectedReviewState,
    `Advisor brief ${expectedReviewState} review action`
  );
  if (taskFlow.flow_status !== "SUPERSEDED") {
    throw new Error(
      `Advisor brief ${expectedReviewState} review action returned task-flow status '${String(
        taskFlow.flow_status
      )}' instead of 'SUPERSEDED'.`
    );
  }
  if (taskFlow.supportability_status !== "HISTORICAL") {
    throw new Error(
      `Advisor brief ${expectedReviewState} review action returned task-flow supportability '${String(
        taskFlow.supportability_status
      )}' instead of 'HISTORICAL'.`
    );
  }
  const lineageRefs = Array.isArray(taskFlow.replacement_lineage)
    ? taskFlow.replacement_lineage
    : [];
  if (!lineageRefs.some((lineage) => lineage?.replacement_run_id === replacementRunId)) {
    throw new Error(
      `Advisor brief ${expectedReviewState} review action returned no task-flow replacement lineage edge for '${replacementRunId}'.`
    );
  }
  return taskFlow;
}

function assertAcceptedRunPosture(payload) {
  const run = assertWorkflowPackRunPresence(payload, "Advisor brief ACCEPT review action");
  if (run.review_state !== "ACCEPTED") {
    throw new Error(
      `Advisor brief ACCEPT review action returned review state '${String(
        run.review_state
      )}' instead of 'ACCEPTED'.`
    );
  }
  if (run.superseded === true) {
    throw new Error("Advisor brief ACCEPT review action incorrectly marked the run as historical.");
  }
  if (!run.supportability_status) {
    throw new Error("Advisor brief ACCEPT review action returned no supportability status.");
  }
  return run;
}

function isReviewActionAllowed(payload, actionType) {
  const run = assertWorkflowPackRunPresence(payload, `Advisor brief ${actionType} source run`);
  const allowedActions = Array.isArray(run.allowed_review_actions)
    ? run.allowed_review_actions
    : [];
  return allowedActions.includes(actionType);
}

function recordSkippedReviewAction(summary, payload, actionType, route) {
  const run = assertWorkflowPackRunPresence(payload, `Advisor brief ${actionType} source run`);
  const taskFlow = assertInitialTaskFlowPosture(
    payload,
    run.run_id,
    `Advisor brief ${actionType} source run`
  );
  recordWorkflowPackCheck(summary, {
    actionType,
    route,
    sourceRunId: run.run_id,
    taskFlowId: taskFlow.task_flow_id,
    taskFlowStatus: taskFlow.flow_status,
    taskFlowSupportabilityStatus: taskFlow.supportability_status,
    resultReviewState: run.review_state,
    resultSupportabilityStatus: run.supportability_status,
    skipped: true,
    skipReason: `Review action ${actionType} is not currently allowed by workflow-pack run posture.`,
    runtimeState: run.runtime_state,
    allowedReviewActions: Array.isArray(run.allowed_review_actions)
      ? run.allowed_review_actions
      : [],
  });
  return { run, taskFlow };
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
  canonicalStartDate,
  canonicalAsOfDate,
  timeoutMs,
  fetchJson,
  postJson,
}) {
  const acceptQuery = buildAdvisorBriefWorkspaceQuery({
    period: "EXPLICIT",
    detailBasis: "NET",
    benchmarkCode,
    reportStartDate: canonicalStartDate,
    reportEndDate: canonicalAsOfDate,
  });
  const acceptRoute = `/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${acceptQuery}`;
  const acceptSourceRoute = `/api/v1/workbench/${portfolioId}/performance/advisor-brief?${acceptQuery}`;
  const acceptSource = await fetchJson(
    summary,
    `${gatewayBaseUrl}${acceptSourceRoute}`,
    "Advisor brief ACCEPT source run",
    timeoutMs
  );
  if (!isReviewActionAllowed(acceptSource, "ACCEPT")) {
    recordSkippedReviewAction(summary, acceptSource, "ACCEPT", acceptRoute);
    return;
  }
  const acceptedBrief = await postJson(
    summary,
    `${gatewayBaseUrl}${acceptRoute}`,
    "Advisor brief ACCEPT review action",
    timeoutMs,
    {
      action_type: "ACCEPT",
      reviewed_by: "live.validator.accept",
      reason: "Live canonical validator proving bounded ACCEPT review posture.",
    }
  );
  const acceptedRun = assertAcceptedRunPosture(acceptedBrief);
  const acceptedTaskFlow = assertAcceptedTaskFlowPosture(acceptedBrief, acceptedRun.run_id);
  recordWorkflowPackCheck(summary, {
    actionType: "ACCEPT",
    route: acceptRoute,
    sourceRunId: acceptedRun.run_id,
    taskFlowId: acceptedTaskFlow.task_flow_id,
    taskFlowStatus: acceptedTaskFlow.flow_status,
    taskFlowSupportabilityStatus: acceptedTaskFlow.supportability_status,
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
  assertInitialTaskFlowPosture(
    supersedeOriginal,
    supersedeSourceRun.run_id,
    "Advisor brief supersede source run"
  );
  const supersedeReplacementRun = assertWorkflowPackRunPresence(
    supersedeReplacement,
    "Advisor brief supersede replacement run"
  );
  assertInitialTaskFlowPosture(
    supersedeReplacement,
    supersedeReplacementRun.run_id,
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
  const supersededTaskFlow = assertReplacementTaskFlowPosture(
    supersededBrief,
    "SUPERSEDED",
    supersedeSourceRun.run_id,
    supersedeReplacementRun.run_id
  );
  recordWorkflowPackCheck(summary, {
    actionType: "SUPERSEDE",
    route: `/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${supersedeOriginalQuery}`,
    sourceRunId: supersedeSourceRun.run_id,
    replacementRunId: supersedeReplacementRun.run_id,
    taskFlowId: supersededTaskFlow.task_flow_id,
    taskFlowStatus: supersededTaskFlow.flow_status,
    taskFlowSupportabilityStatus: supersededTaskFlow.supportability_status,
    resultReviewState: supersededRun.review_state,
    resultSupportabilityStatus: supersededRun.supportability_status,
  });

  const reviseOriginalQuery = buildAdvisorBriefWorkspaceQuery({
    period: "EXPLICIT",
    detailBasis: "GROSS",
    benchmarkCode,
    reportStartDate: canonicalStartDate,
    reportEndDate: canonicalAsOfDate,
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
  assertInitialTaskFlowPosture(
    reviseOriginal,
    reviseSourceRun.run_id,
    "Advisor brief revise source run"
  );
  const reviseReplacementRun = assertWorkflowPackRunPresence(
    reviseReplacement,
    "Advisor brief revise replacement run"
  );
  assertInitialTaskFlowPosture(
    reviseReplacement,
    reviseReplacementRun.run_id,
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
  const revisedTaskFlow = assertReplacementTaskFlowPosture(
    revisedBrief,
    "REVISED",
    reviseSourceRun.run_id,
    reviseReplacementRun.run_id
  );
  recordWorkflowPackCheck(summary, {
    actionType: "REVISE",
    route: `/api/v1/workbench/${portfolioId}/performance/advisor-brief/review-actions?${reviseOriginalQuery}`,
    sourceRunId: reviseSourceRun.run_id,
    replacementRunId: reviseReplacementRun.run_id,
    taskFlowId: revisedTaskFlow.task_flow_id,
    taskFlowStatus: revisedTaskFlow.flow_status,
    taskFlowSupportabilityStatus: revisedTaskFlow.supportability_status,
    resultReviewState: revisedRun.review_state,
    resultSupportabilityStatus: revisedRun.supportability_status,
  });
}
