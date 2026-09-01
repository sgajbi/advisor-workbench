import { formatTimestampValue } from "@/design-system/utils/financial-formatters";
import { preserveBusinessAcronyms } from "./business-label-formatters";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "./types";

export type PmOperatingQualityPanelState =
  | "ready"
  | "partial"
  | "blocked"
  | "empty"
  | "unavailable";

export type PmOperatingQualitySelection = {
  scoreRunId: string | null;
  fairnessAnalysisId: string | null;
  reviewActionId: string | null;
};

export type PmOperatingQualityPolicyRow = {
  key: string;
  policyId: string;
  policyVersion: string;
  enabled: string;
  state: string;
  asOfDate: string;
  reasonCodes: string;
};

export type PmOperatingQualityScoreRunRow = {
  key: string;
  scoreRunId: string;
  pmId: string;
  bookId: string;
  policy: string;
  state: string;
  score: string;
  asOfDate: string;
  forbiddenUses: string;
  sourceRefs: string;
  reasonCodes: string;
  contentHash: string;
  sourceService: string;
};

export type PmOperatingQualityFairnessSegmentRequest = {
  segment_id: string;
  segment_type: string;
  display_name: string;
  score_run_ids: string[];
  source_refs?: Array<Record<string, unknown>>;
};

export type PmOperatingQualitySourceSegmentRow = {
  key: string;
  segment: string;
  segmentType: string;
  scoreRunCount: string;
  sourceRefs: string;
};

export type PmOperatingQualityFairnessSegmentRow = {
  key: string;
  segment: string;
  segmentType: string;
  state: string;
  scoreRunCount: string;
  averageScore: string;
  minimumScore: string;
  maximumScore: string;
  scoreRunRefs: string;
  sourceRefs: string;
  reasonCodes: string;
};

export type PmOperatingQualityFairnessAnalysisRow = {
  key: string;
  fairnessAnalysisId: string;
  policy: string;
  state: string;
  asOfDate: string;
  observedSpread: string;
  segmentCount: string;
  generatedBy: string;
  reasonCodes: string;
  sourceRefs: string;
};

export type PmOperatingQualityReviewActionRow = {
  key: string;
  reviewActionId: string;
  reviewActionRef: string;
  target: string;
  actionType: string;
  actionState: string;
  actorId: string;
  asOfDate: string;
  policy: string;
  reasonCodes: string;
  sourceRefs: string;
  supportability: string;
  operatingBoundaries: string;
};

export type PmOperatingQualityReviewActionDetail = {
  reviewActionId: string;
  reviewActionRef: string;
  target: string;
  actionType: string;
  actionState: string;
  actorId: string;
  asOfDate: string;
  policy: string;
  rationale: string;
  supportability: string;
  sourceRefs: string;
  reasonCodes: string;
  operatingBoundaries: string;
};

export type PmOperatingQualitySummaryInvocationRow = {
  key: string;
  summaryInvocationId: string;
  summaryRef: string;
  scoreRunId: string;
  reviewActionId: string;
  invocationState: string;
  workflowRunId: string;
  artifactRef: string;
  requestedBy: string;
  asOfDate: string;
  policy: string;
  contentHash: string;
  reasonCodes: string;
  sourceRefs: string;
  textBoundary: string;
};

export type PmOperatingQualitySummaryInvocationDetail = {
  summaryInvocationId: string;
  summaryRef: string;
  scoreRunId: string;
  reviewActionId: string;
  invocationState: string;
  workflowPack: string;
  workflowRunId: string;
  artifactRef: string;
  requestedBy: string;
  policy: string;
  sourceRefs: string;
  reasonCodes: string;
  contentHash: string;
  textBoundary: string;
  operatingBoundaries: string;
};

export type PmOperatingQualityFairnessDetail = {
  product: string;
  asOfDate: string;
  minimumSegmentScoreRunCount: string;
  maximumAverageScoreSpread: string;
  observedAverageScoreSpread: string;
  generatedAt: string;
  generatedBy: string;
  sourceRefs: string;
  forbiddenUses: string;
  reasonCodes: string;
};

export type PmOperatingQualityOperationEvidence = {
  operation: string;
  correlationId: string;
  contractVersion: string;
  sourceService: string;
  upstreamStatus: string;
};

export type PmOperatingQualitySummaryPosture = {
  status: string;
  reviewState: string;
  workflowAuthority: string;
  runId: string;
  requestedOutputs: string;
  audience: string;
  evidenceSource: string;
  supportability: string;
  boundary: string;
};

export type PmOperatingQualityPanelModel = {
  state: PmOperatingQualityPanelState;
  supportabilityState: string;
  authority: string;
  policyId: string;
  policyVersion: string;
  scoreRunId: string;
  fairnessAnalysisId: string;
  summaryInvocationId: string;
  count: string;
  reasonCodes: string[];
  blockedActions: string[];
  blockedActionPosture: string;
  policyRows: PmOperatingQualityPolicyRow[];
  scoreRunRows: PmOperatingQualityScoreRunRow[];
  fairnessSegmentRequests: PmOperatingQualityFairnessSegmentRequest[];
  sourceSegmentRows: PmOperatingQualitySourceSegmentRow[];
  fairnessAnalysisRows: PmOperatingQualityFairnessAnalysisRow[];
  reviewActionRows: PmOperatingQualityReviewActionRow[];
  summaryInvocationRows: PmOperatingQualitySummaryInvocationRow[];
  fairnessSegmentRows: PmOperatingQualityFairnessSegmentRow[];
  selectedFairnessAnalysis: PmOperatingQualityFairnessAnalysisRow | null;
  selectedReviewAction: PmOperatingQualityReviewActionRow | null;
  selectedScoreRun: PmOperatingQualityScoreRunRow | null;
  fairnessAsOfDate: string;
  forbiddenUsePosture: string;
  fairnessState: string;
  fairnessSpread: string;
  fairnessDetail: PmOperatingQualityFairnessDetail;
  reviewActionDetail: PmOperatingQualityReviewActionDetail;
  summaryInvocationDetail: PmOperatingQualitySummaryInvocationDetail;
  operationEvidence: PmOperatingQualityOperationEvidence;
  summaryPosture: PmOperatingQualitySummaryPosture;
  summaryRequestReadinessState: string;
  summaryRequestReadiness: string;
  scoreRunPreviewReadinessState: string;
  scoreRunPreviewReadiness: string;
  fairnessPreviewReadinessState: string;
  fairnessPreviewReadiness: string;
};

function compactGatewayResponses(
  responses: ReadonlyArray<DpmPmOperatingQualityGatewayResponse | null | undefined>,
): DpmPmOperatingQualityGatewayResponse[] {
  return responses.filter(
    (response): response is DpmPmOperatingQualityGatewayResponse => Boolean(response),
  );
}

export function buildPmOperatingQualityPanelModel(params: {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalyses?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetail?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetails?: ReadonlyArray<DpmPmOperatingQualityGatewayResponse | null | undefined>;
  retainedFairnessAnalyses?: ReadonlyArray<DpmPmOperatingQualityGatewayResponse | null | undefined>;
  reviewActions?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActionDetail?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActionDetails?: ReadonlyArray<DpmPmOperatingQualityGatewayResponse | null | undefined>;
  retainedReviewActions?: ReadonlyArray<DpmPmOperatingQualityGatewayResponse | null | undefined>;
  summaryInvocations?: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocationDetail?: DpmPmOperatingQualityGatewayResponse | null;
  preview?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessPreview?: DpmPmOperatingQualityGatewayResponse | null;
  summary?: DpmPmOperatingQualitySummaryResponse | null;
  selection?: Partial<PmOperatingQualitySelection> | null;
}): PmOperatingQualityPanelModel {
  const policyRows = buildPolicyRows(params.policies);
  const fairnessAnalysisDetails = compactGatewayResponses([
    ...(params.fairnessAnalysisDetails ?? []),
    params.fairnessAnalysisDetail,
  ]);
  const reviewActionDetails = compactGatewayResponses([
    ...(params.reviewActionDetails ?? []),
    params.reviewActionDetail,
  ]);
  const retainedFairnessAnalyses = compactGatewayResponses(
    params.retainedFairnessAnalyses ?? [],
  );
  const retainedReviewActions = compactGatewayResponses(
    params.retainedReviewActions ?? [],
  );
  const scoreRunRows = [
    ...buildScoreRunRows(params.preview),
    ...buildScoreRunRows(params.scoreRuns),
  ].filter(uniqueByScoreRunId);
  const fairnessAnalysisRows = [
    ...fairnessAnalysisDetails.flatMap(buildFairnessAnalysisRows),
    ...buildFairnessAnalysisRows(params.fairnessPreview),
    ...buildFairnessAnalysisRows(params.fairnessAnalyses),
    ...retainedFairnessAnalyses.flatMap(buildFairnessAnalysisRows),
  ].filter(uniqueByFairnessAnalysisId);
  const reviewActionRows = [
    ...reviewActionDetails.flatMap(buildReviewActionRows),
    ...buildReviewActionRows(params.reviewActions),
    ...retainedReviewActions.flatMap(buildReviewActionRows),
  ].filter(uniqueByReviewActionId);
  const summaryInvocationRows = [
    ...buildSummaryInvocationRows(params.summaryInvocationDetail),
    ...buildSummaryInvocationRows(params.summaryInvocations),
  ].filter(uniqueBySummaryInvocationId);
  const selection = resolvePmOperatingQualitySelection({
    scoreRunRows,
    fairnessAnalysisRows,
    reviewActionRows,
    preferredSelection: params.selection,
  });
  const selectedScoreRun =
    scoreRunRows.find((row) => row.scoreRunId === selection.scoreRunId) ?? null;
  const selectedFairnessAnalysis =
    fairnessAnalysisRows.find(
      (row) => row.fairnessAnalysisId === selection.fairnessAnalysisId
    ) ?? null;
  const selectedReviewAction =
    reviewActionRows.find((row) => row.reviewActionId === selection.reviewActionId) ?? null;
  const selectedFairnessAnalysisDetail =
    fairnessAnalysisDetails.find((response) =>
      hasPmOperatingQualityFairnessAnalysis(response, selection.fairnessAnalysisId)
    ) ?? null;
  const selectedFairnessPreview = hasPmOperatingQualityFairnessAnalysis(
    params.fairnessPreview,
    selection.fairnessAnalysisId,
  )
    ? params.fairnessPreview
    : null;
  const selectedFairnessAnalyses = hasPmOperatingQualityFairnessAnalysis(
    params.fairnessAnalyses,
    selection.fairnessAnalysisId,
  )
    ? params.fairnessAnalyses
    : null;
  const selectedRetainedFairnessAnalysis =
    retainedFairnessAnalyses.find((response) =>
      hasPmOperatingQualityFairnessAnalysis(response, selection.fairnessAnalysisId)
    ) ?? null;
  const fairnessAnalysisResponse =
    selectedFairnessAnalysisDetail ??
    selectedFairnessPreview ??
    selectedFairnessAnalyses ??
    selectedRetainedFairnessAnalysis;
  const fairnessAnalysis = findFairnessAnalysis(
    fairnessAnalysisResponse,
    selection.fairnessAnalysisId,
  );
  const selectedReviewActionDetail =
    reviewActionDetails.find((response) =>
      hasPmOperatingQualityReviewAction(response, selection.reviewActionId)
    ) ?? null;
  const selectedReviewActions = hasPmOperatingQualityReviewAction(
    params.reviewActions,
    selection.reviewActionId,
  )
    ? params.reviewActions
    : null;
  const selectedRetainedReviewAction =
    retainedReviewActions.find((response) =>
      hasPmOperatingQualityReviewAction(response, selection.reviewActionId)
    ) ?? null;
  const reviewActionResponse =
    selectedReviewActionDetail ?? selectedReviewActions ?? selectedRetainedReviewAction;
  const reviewAction = findReviewAction(reviewActionResponse, selection.reviewActionId);
  const summary = matchesPmOperatingQualitySummaryScoreRun(
    params.summary,
    selectedScoreRun?.scoreRunId ?? null,
  )
    ? params.summary
    : null;
  const primary =
    summary ??
    params.summaryInvocationDetail ??
    params.summaryInvocations ??
    fairnessAnalysisResponse ??
    reviewActionResponse ??
    params.preview ??
    params.scoreRuns ??
    params.policies;
  const supportability = primary?.supportability;
  const supportabilityState = resolvePanelSupportabilityState(
    [
      params.policies?.supportability?.state,
      params.scoreRuns?.supportability?.state,
      fairnessAnalysisResponse?.supportability?.state,
      reviewActionResponse?.supportability?.state,
      params.summaryInvocations?.supportability?.state,
      params.summaryInvocationDetail?.supportability?.state,
      summary?.supportability?.state,
    ],
    policyRows.length,
    scoreRunRows,
  );
  const fairnessSegmentRows = buildFairnessSegmentRows(fairnessAnalysis);
  const fairnessSegmentRequests = extractFairnessSegmentRequests(params.scoreRuns);
  const reasonCodes = [
    ...(supportability?.reason_codes ?? []),
    ...scoreRunRows.flatMap((row) => splitList(row.reasonCodes)),
    ...fairnessAnalysisRows.flatMap((row) => splitList(row.reasonCodes)),
    ...reviewActionRows.flatMap((row) => splitList(row.reasonCodes)),
    ...summaryInvocationRows.flatMap((row) => splitList(row.reasonCodes)),
    ...fairnessSegmentRows.flatMap((row) => splitList(row.reasonCodes)),
  ].filter(uniqueString);
  const blockedActions = supportability?.blocked_actions ?? [];
  const policyId = firstNonEmpty(
    supportability?.policy_id,
    selectedScoreRun?.policy.split(" / ")[0],
    policyRows[0]?.policyId,
  );
  const policyVersion = firstNonEmpty(
    supportability?.policy_version,
    selectedScoreRun?.policy.split(" / ")[1],
    policyRows[0]?.policyVersion,
  );
  const fairnessPreviewReadiness = resolveFairnessPreviewReadiness({
    policyId,
    policyVersion,
    segmentCount: fairnessSegmentRequests.length,
    blockedActions,
  });
  const scoreRunPreviewReadiness = resolveScoreRunPreviewReadiness({
    policyId,
    policyVersion,
    blockedActions,
  });
  const summaryRequestReadiness = resolveSummaryRequestReadiness({
    scoreRunId: selectedScoreRun?.scoreRunId ?? "N/A",
    blockedActions,
  });

  return {
    state: resolvePanelState(supportabilityState, policyRows.length, scoreRunRows.length, Boolean(primary)),
    supportabilityState,
    authority: supportability?.authority ?? "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    policyId,
    policyVersion,
    scoreRunId: firstNonEmpty(selectedScoreRun?.scoreRunId, supportability?.score_run_id),
    fairnessAnalysisId: firstNonEmpty(
      selectedFairnessAnalysis?.fairnessAnalysisId,
      readString(fairnessAnalysis, "fairness_analysis_id"),
      supportability?.fairness_analysis_id,
    ),
    summaryInvocationId: firstNonEmpty(
      supportability?.summary_invocation_id,
      summaryInvocationRows[0]?.summaryInvocationId
    ),
    count: formatCount(
      supportability?.count,
      Math.max(
        scoreRunRows.length,
        fairnessAnalysisRows.length,
        reviewActionRows.length,
        summaryInvocationRows.length
      )
    ),
    reasonCodes,
    blockedActions,
    blockedActionPosture: summarizeBlockedActions(blockedActions, supportability?.source_service),
    policyRows,
    scoreRunRows,
    fairnessSegmentRequests,
    sourceSegmentRows: buildSourceSegmentRows(fairnessSegmentRequests),
    fairnessAnalysisRows,
    reviewActionRows,
    summaryInvocationRows,
    fairnessSegmentRows,
    selectedFairnessAnalysis,
    selectedReviewAction,
    selectedScoreRun,
    fairnessAsOfDate: firstNonEmpty(selectedScoreRun?.asOfDate),
    forbiddenUsePosture: summarizeForbiddenUses(scoreRunRows),
    fairnessState: normalizeState(readString(fairnessAnalysis, "state")),
    fairnessSpread: readString(fairnessAnalysis, "observed_average_score_spread") || "N/A",
    fairnessDetail: buildFairnessDetail(fairnessAnalysis),
    reviewActionDetail: buildReviewActionDetail(reviewAction),
    summaryInvocationDetail: buildSummaryInvocationDetail(
      readSummaryInvocation(params.summaryInvocationDetail)
    ),
    operationEvidence: buildOperationEvidence({
      policies: params.policies,
      scoreRuns: params.scoreRuns,
      fairnessAnalyses: selectedFairnessAnalyses,
      fairnessAnalysisDetail:
        selectedFairnessAnalysisDetail ?? selectedRetainedFairnessAnalysis,
      reviewActions: selectedReviewActions,
      reviewActionDetail: selectedReviewActionDetail ?? selectedRetainedReviewAction,
      summaryInvocations: params.summaryInvocations,
      summaryInvocationDetail: params.summaryInvocationDetail,
      preview: params.preview,
      fairnessPreview: selectedFairnessPreview,
      summary,
    }),
    summaryPosture: buildSummaryPosture(summary),
    summaryRequestReadinessState: summaryRequestReadiness.state,
    summaryRequestReadiness: summaryRequestReadiness.detail,
    scoreRunPreviewReadinessState: scoreRunPreviewReadiness.state,
    scoreRunPreviewReadiness: scoreRunPreviewReadiness.detail,
    fairnessPreviewReadinessState: fairnessPreviewReadiness.state,
    fairnessPreviewReadiness: fairnessPreviewReadiness.detail,
  };
}

export function resolvePmOperatingQualitySelection({
  scoreRunRows,
  fairnessAnalysisRows,
  reviewActionRows,
  preferredSelection,
}: {
  scoreRunRows: PmOperatingQualityScoreRunRow[];
  fairnessAnalysisRows: PmOperatingQualityFairnessAnalysisRow[];
  reviewActionRows: PmOperatingQualityReviewActionRow[];
  preferredSelection?: Partial<PmOperatingQualitySelection> | null;
}): PmOperatingQualitySelection {
  return {
    scoreRunId: resolveSelectedRecordId(
      scoreRunRows,
      preferredSelection?.scoreRunId,
      (row) => row.scoreRunId,
    ),
    fairnessAnalysisId: resolveSelectedRecordId(
      fairnessAnalysisRows,
      preferredSelection?.fairnessAnalysisId,
      (row) => row.fairnessAnalysisId,
    ),
    reviewActionId: resolveSelectedRecordId(
      reviewActionRows,
      preferredSelection?.reviewActionId,
      (row) => row.reviewActionId,
    ),
  };
}

function resolveSelectedRecordId<T>(
  rows: T[],
  preferredId: string | null | undefined,
  readId: (row: T) => string,
): string | null {
  if (preferredId && rows.some((row) => readId(row) === preferredId)) {
    return preferredId;
  }
  return rows[0] ? readId(rows[0]) : null;
}

export function matchesPmOperatingQualitySummaryScoreRun(
  response: DpmPmOperatingQualitySummaryResponse | null | undefined,
  expectedScoreRunId: string | null | undefined,
): response is DpmPmOperatingQualitySummaryResponse {
  if (!response || !expectedScoreRunId) {
    return false;
  }
  return readString(asRecord(response.score_run), "score_run_id") === expectedScoreRunId;
}

function buildOperationEvidence(params: {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalyses?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetail?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActions?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActionDetail?: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocations?: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocationDetail?: DpmPmOperatingQualityGatewayResponse | null;
  preview?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessPreview?: DpmPmOperatingQualityGatewayResponse | null;
  summary?: DpmPmOperatingQualitySummaryResponse | null;
}): PmOperatingQualityOperationEvidence {
  const operation =
    params.summary
      ? "PM quality support summary"
      : params.fairnessPreview
      ? "Fairness analysis preview"
      : params.summaryInvocationDetail
        ? "Summary invocation detail load"
        : params.summaryInvocations
          ? "Summary invocation ledger load"
      : params.reviewActionDetail
        ? "Review-action detail load"
        : params.reviewActions
          ? "Review-action ledger load"
      : params.fairnessAnalysisDetail
        ? "Fairness analysis detail load"
        : params.fairnessAnalyses
          ? "Fairness analysis list load"
      : params.preview
        ? "Score-run preview"
        : params.scoreRuns
          ? "Score-run evidence load"
          : params.policies
            ? "Policy evidence load"
            : "No Gateway operation";
  const response =
    params.summary ??
    params.fairnessPreview ??
    params.summaryInvocationDetail ??
    params.summaryInvocations ??
    params.reviewActionDetail ??
    params.reviewActions ??
    params.fairnessAnalysisDetail ??
    params.fairnessAnalyses ??
    params.preview ??
    params.scoreRuns ??
    params.policies;
  return {
    operation,
    correlationId: response?.correlation_id ?? "N/A",
    contractVersion: response?.contract_version ?? "N/A",
    sourceService: response?.source_service ?? "N/A",
    upstreamStatus: readGatewayStatus(response),
  };
}

function readGatewayStatus(
  response:
    | DpmPmOperatingQualityGatewayResponse
    | DpmPmOperatingQualitySummaryResponse
    | null
    | undefined
): string {
  if (!response) {
    return "N/A";
  }
  if ("upstream_status" in response && typeof response.upstream_status === "number") {
    return String(response.upstream_status);
  }
  if ("ai_upstream_status" in response && typeof response.ai_upstream_status === "number") {
    return String(response.ai_upstream_status);
  }
  return "N/A";
}

function buildSummaryPosture(
  response: DpmPmOperatingQualitySummaryResponse | null | undefined
): PmOperatingQualitySummaryPosture {
  if (!response) {
    return {
      status: "Not requested",
      reviewState: "N/A",
      workflowAuthority: "N/A",
      runId: "N/A",
      requestedOutputs: "N/A",
      audience: "N/A",
      evidenceSource: "N/A",
      supportability: "N/A",
      boundary: "Gateway can request support-only summary; no browser prompt is constructed.",
    };
  }
  const execution = asRecord(response.data.execution);
  const workflowPackRun = asRecord(response.data.workflow_pack_run);
  const result = asRecord(execution.result);
  const structuredOutput = asRecord(result.structured_output);
  return {
    status: firstNonEmpty(readString(execution, "status"), readString(response.data, "status")),
    reviewState: firstNonEmpty(
      readString(structuredOutput, "summary_status"),
      readString(structuredOutput, "review_state"),
      readString(workflowPackRun, "review_state"),
      response.supportability.state
    ),
    workflowAuthority: firstNonEmpty(
      readString(workflowPackRun, "workflow_authority_owner"),
      response.supportability.authority
    ),
    runId: firstNonEmpty(
      readString(workflowPackRun, "run_id"),
      readString(asRecord(execution.audit), "workflow_pack_run_id")
    ),
    requestedOutputs: formatList(response.summary_request.requested_outputs),
    audience: formatList(response.summary_request.audience),
    evidenceSource: response.evidence_source_service || "lotus-manage",
    supportability: businessSummarySupportability(response.supportability.state),
    boundary:
      "Support-only, review-required summary from Gateway and lotus-ai; not approval, ranking, HR, compensation, conduct, client-contact, execution, or OMS evidence.",
  };
}

function buildPolicyRows(
  response: DpmPmOperatingQualityGatewayResponse | null
): PmOperatingQualityPolicyRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.policies).length
    ? extractRecords(data.policies)
    : [data].filter(hasAnyPolicyIdentity);
  return records.map((record, index) => {
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${policyId}-${policyVersion}-${index}`,
      policyId,
      policyVersion,
      enabled: formatBoolean(record.enabled),
      state:
        readString(record, "state") ||
        readString(record, "supportability_state") ||
        response.supportability.state ||
        "UNKNOWN",
      asOfDate: readString(record, "as_of_date") || "N/A",
      reasonCodes: formatList(record.reason_codes),
    };
  });
}

function buildScoreRunRows(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): PmOperatingQualityScoreRunRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.score_runs).length
    ? extractRecords(data.score_runs)
    : [asRecord(data.score_run)].filter(hasAnyScoreRunIdentity);
  return records.map((record, index) => {
    const scoreRunId =
      readString(record, "score_run_id") ||
      response.supportability.score_run_id ||
      `score-run-${index + 1}`;
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${scoreRunId}-${index}`,
      scoreRunId,
      pmId: readString(record, "pm_id") || "N/A",
      bookId: readString(record, "book_id") || "N/A",
      policy: `${policyId} / ${policyVersion}`,
      state:
        readString(record, "state") ||
        readString(record, "supportability_state") ||
        response.supportability.state ||
        "UNKNOWN",
      score: readString(record, "score") || readString(record, "overall_score") || "N/A",
      asOfDate: readString(record, "as_of_date") || readString(record, "created_at") || "N/A",
      forbiddenUses: formatForbiddenUses(record.forbidden_uses),
      sourceRefs: summarizeSourceRefs(extractRecords(record.source_refs)),
      reasonCodes: formatList(record.reason_codes),
      contentHash:
        readString(record, "content_hash") ||
        readString(record, "score_run_hash") ||
        readString(record, "payload_hash") ||
        "N/A",
      sourceService: response.source_service,
    };
  });
}

function buildSourceSegmentRows(
  segments: PmOperatingQualityFairnessSegmentRequest[]
): PmOperatingQualitySourceSegmentRow[] {
  return segments.map((segment, index) => ({
    key: `${segment.segment_id}-${index}`,
    segment: segment.display_name || segment.segment_id,
    segmentType: formatSegmentType(segment.segment_type),
    scoreRunCount: String(segment.score_run_ids.length),
    sourceRefs: summarizeSourceRefs(segment.source_refs ?? []),
  }));
}

function buildFairnessAnalysisRows(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): PmOperatingQualityFairnessAnalysisRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.fairness_analyses).length
    ? extractRecords(data.fairness_analyses)
    : extractRecords(data.items).length
      ? extractRecords(data.items)
      : [asRecord(data.fairness_analysis)].filter(hasAnyFairnessAnalysisIdentity);
  return records.map((record, index) => {
    const fairnessAnalysisId =
      readString(record, "fairness_analysis_id") ||
      response.supportability.fairness_analysis_id ||
      `fairness-analysis-${index + 1}`;
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${fairnessAnalysisId}-${index}`,
      fairnessAnalysisId,
      policy: `${policyId} / ${policyVersion}`,
      state:
        readString(record, "state") ||
        readString(record, "supportability_state") ||
        response.supportability.state ||
        "UNKNOWN",
      asOfDate: readString(record, "as_of_date") || readString(record, "generated_at") || "N/A",
      observedSpread: readString(record, "observed_average_score_spread") || "N/A",
      segmentCount: formatCount(
        readNumber(record, "segment_count"),
        extractRecords(record.segment_results).length
      ),
      generatedBy: readString(record, "generated_by") || "N/A",
      reasonCodes: formatList(record.reason_codes),
      sourceRefs: summarizeSourceRefs(extractRecords(record.source_refs)),
    };
  });
}

function buildReviewActionRows(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): PmOperatingQualityReviewActionRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.review_actions).length
    ? extractRecords(data.review_actions)
    : extractRecords(data.items).length
      ? extractRecords(data.items)
      : [asRecord(data.review_action)].filter(hasAnyReviewActionIdentity);
  return records.map((record, index) => {
    const reviewActionId =
      readString(record, "review_action_id") ||
      response.supportability.review_action_id ||
      `review-action-${index + 1}`;
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${reviewActionId}-${index}`,
      reviewActionId,
      reviewActionRef: firstNonEmpty(readString(record, "review_action_ref"), reviewActionId),
      target: formatReviewTarget(record),
      actionType: formatActionLabel(readString(record, "action_type") || "REVIEW_ACTION"),
      actionState: normalizeState(
        readString(record, "action_state") ||
          readString(record, "state") ||
          response.supportability.state
      ),
      actorId: firstNonEmpty(readString(record, "actor_id"), readString(record, "created_by")),
      asOfDate: firstNonEmpty(readString(record, "as_of_date"), readString(record, "created_at")),
      policy: `${policyId} / ${policyVersion}`,
      reasonCodes: formatList(record.reason_codes),
      sourceRefs: summarizeSourceRefs(extractRecords(record.source_refs)),
      supportability: firstNonEmpty(
        readString(record, "supportability_state"),
        response.supportability.state
      ),
      operatingBoundaries: formatOperatingBoundaries(record),
    };
  });
}

export function hasPmOperatingQualityReviewAction(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined,
  reviewActionId: string | null,
): boolean {
  return Object.keys(findReviewAction(response, reviewActionId)).length > 0;
}

function findReviewAction(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined,
  reviewActionId: string | null,
): Record<string, unknown> {
  if (!response || !reviewActionId) return {};
  const data = asRecord(response.data);
  return (
    [
      asRecord(data.review_action),
      ...extractRecords(data.review_actions),
      ...extractRecords(data.items),
    ].find((record) => readString(record, "review_action_id") === reviewActionId) ?? {}
  );
}

function buildReviewActionDetail(
  reviewAction: Record<string, unknown>
): PmOperatingQualityReviewActionDetail {
  if (Object.keys(reviewAction).length === 0) {
    return {
      reviewActionId: "N/A",
      reviewActionRef: "N/A",
      target: "N/A",
      actionType: "N/A",
      actionState: "N/A",
      actorId: "N/A",
      asOfDate: "N/A",
      policy: "N/A",
      rationale: "No review-action detail returned by Gateway.",
      supportability: "N/A",
      sourceRefs: "N/A",
      reasonCodes: "N/A",
      operatingBoundaries: "No client communication, HR, conduct, PM ranking, OMS, trade, execution, fills, or settlement capability is enabled.",
    };
  }
  const policyId = readString(reviewAction, "policy_id") || "N/A";
  const policyVersion = readString(reviewAction, "policy_version") || "N/A";
  return {
    reviewActionId: readString(reviewAction, "review_action_id") || "N/A",
    reviewActionRef: firstNonEmpty(
      readString(reviewAction, "review_action_ref"),
      readString(reviewAction, "review_action_id")
    ),
    target: formatReviewTarget(reviewAction),
    actionType: formatActionLabel(readString(reviewAction, "action_type") || "REVIEW_ACTION"),
    actionState: normalizeState(
      readString(reviewAction, "action_state") || readString(reviewAction, "state")
    ),
    actorId: firstNonEmpty(readString(reviewAction, "actor_id"), readString(reviewAction, "created_by")),
    asOfDate: firstNonEmpty(readString(reviewAction, "as_of_date"), readString(reviewAction, "created_at")),
    policy: `${policyId} / ${policyVersion}`,
    rationale: firstNonEmpty(
      readString(reviewAction, "bounded_review_rationale"),
      readString(reviewAction, "review_reason"),
      readString(reviewAction, "rationale")
    ),
    supportability: firstNonEmpty(readString(reviewAction, "supportability_state"), "READY"),
    sourceRefs: summarizeSourceRefs(extractRecords(reviewAction.source_refs)),
    reasonCodes: formatList(reviewAction.reason_codes),
    operatingBoundaries: formatOperatingBoundaries(reviewAction),
  };
}

function buildSummaryInvocationRows(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): PmOperatingQualitySummaryInvocationRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.summary_invocations).length
    ? extractRecords(data.summary_invocations)
    : extractRecords(data.items).length
      ? extractRecords(data.items)
      : [asRecord(data.summary_invocation)].filter(hasAnySummaryInvocationIdentity);
  return records.map((record, index) => {
    const summaryInvocationId =
      readString(record, "summary_invocation_id") ||
      response.supportability.summary_invocation_id ||
      `summary-invocation-${index + 1}`;
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${summaryInvocationId}-${index}`,
      summaryInvocationId,
      summaryRef: firstNonEmpty(readString(record, "summary_ref"), summaryInvocationId),
      scoreRunId: firstNonEmpty(
        readString(record, "score_run_id"),
        response.supportability.score_run_id
      ),
      reviewActionId: firstNonEmpty(
        readString(record, "review_action_id"),
        response.supportability.review_action_id
      ),
      invocationState: normalizeState(
        readString(record, "invocation_state") ||
          readString(record, "state") ||
          response.supportability.state
      ),
      workflowRunId: firstNonEmpty(readString(record, "workflow_run_id")),
      artifactRef: firstNonEmpty(readString(record, "summary_artifact_ref")),
      requestedBy: firstNonEmpty(readString(record, "requested_by"), readString(record, "created_by")),
      asOfDate: firstNonEmpty(
        readString(record, "as_of_date"),
        readString(record, "generated_at"),
        readString(record, "created_at")
      ),
      policy: `${policyId} / ${policyVersion}`,
      contentHash: firstNonEmpty(
        readString(record, "content_hash"),
        readString(record, "summary_content_hash")
      ),
      reasonCodes: formatList(record.reason_codes),
      sourceRefs: summarizeSourceRefs(extractRecords(record.source_refs)),
      textBoundary: formatSummaryTextBoundary(record),
    };
  });
}

function readSummaryInvocation(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): Record<string, unknown> {
  return asRecord(asRecord(response?.data).summary_invocation);
}

function buildSummaryInvocationDetail(
  summaryInvocation: Record<string, unknown>
): PmOperatingQualitySummaryInvocationDetail {
  if (Object.keys(summaryInvocation).length === 0) {
    return {
      summaryInvocationId: "N/A",
      summaryRef: "N/A",
      scoreRunId: "N/A",
      reviewActionId: "N/A",
      invocationState: "N/A",
      workflowPack: "N/A",
      workflowRunId: "N/A",
      artifactRef: "N/A",
      requestedBy: "N/A",
      policy: "N/A",
      sourceRefs: "N/A",
      reasonCodes: "N/A",
      contentHash: "N/A",
      textBoundary:
        "Generated summary text, prompts, model responses, client communication, orders, and OMS execution are not exposed by Workbench.",
      operatingBoundaries:
        "Persisted invocation history only; no summary text, prompt, model response, client communication, order, trade, execution, fill, settlement, or OMS capability is enabled.",
    };
  }
  const policyId = readString(summaryInvocation, "policy_id") || "N/A";
  const policyVersion = readString(summaryInvocation, "policy_version") || "N/A";
  return {
    summaryInvocationId: readString(summaryInvocation, "summary_invocation_id") || "N/A",
    summaryRef: firstNonEmpty(
      readString(summaryInvocation, "summary_ref"),
      readString(summaryInvocation, "summary_invocation_id")
    ),
    scoreRunId: firstNonEmpty(readString(summaryInvocation, "score_run_id")),
    reviewActionId: firstNonEmpty(readString(summaryInvocation, "review_action_id")),
    invocationState: normalizeState(
      readString(summaryInvocation, "invocation_state") || readString(summaryInvocation, "state")
    ),
    workflowPack:
      [
        readString(summaryInvocation, "workflow_pack_name"),
        readString(summaryInvocation, "workflow_pack_version"),
      ]
        .filter(Boolean)
        .join(" / ") || "N/A",
    workflowRunId: firstNonEmpty(readString(summaryInvocation, "workflow_run_id")),
    artifactRef: firstNonEmpty(readString(summaryInvocation, "summary_artifact_ref")),
    requestedBy: firstNonEmpty(
      readString(summaryInvocation, "requested_by"),
      readString(summaryInvocation, "created_by")
    ),
    policy: `${policyId} / ${policyVersion}`,
    sourceRefs: summarizeSourceRefs(extractRecords(summaryInvocation.source_refs)),
    reasonCodes: formatList(summaryInvocation.reason_codes),
    contentHash: firstNonEmpty(
      readString(summaryInvocation, "content_hash"),
      readString(summaryInvocation, "summary_content_hash")
    ),
    textBoundary: formatSummaryTextBoundary(summaryInvocation),
    operatingBoundaries: formatSummaryInvocationBoundaries(summaryInvocation),
  };
}

function extractFairnessSegmentRequests(
  response: DpmPmOperatingQualityGatewayResponse | null
): PmOperatingQualityFairnessSegmentRequest[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = [
    ...extractRecords(data.fairness_segments),
    ...extractRecords(data.segments),
    ...extractRecords(asRecord(data.score_run).fairness_segments),
  ];
  return records.map((record) => {
    const sourceRefs = extractRecords(record.source_refs);
    return {
      segment_id: readString(record, "segment_id"),
      segment_type: readString(record, "segment_type"),
      display_name: readString(record, "display_name"),
      score_run_ids: extractStringArray(record.score_run_ids),
      ...(sourceRefs.length > 0 ? { source_refs: sourceRefs } : {}),
    };
  }).filter((segment) =>
    segment.segment_id &&
    segment.segment_type &&
    segment.display_name &&
    segment.score_run_ids.length > 0
  );
}

export function hasPmOperatingQualityFairnessAnalysis(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined,
  fairnessAnalysisId: string | null,
): boolean {
  return Object.keys(findFairnessAnalysis(response, fairnessAnalysisId)).length > 0;
}

function findFairnessAnalysis(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined,
  fairnessAnalysisId: string | null,
): Record<string, unknown> {
  if (!response || !fairnessAnalysisId) return {};
  const data = asRecord(response.data);
  return (
    [
      asRecord(data.fairness_analysis),
      ...extractRecords(data.fairness_analyses),
      ...extractRecords(data.items),
    ].find(
      (record) => readString(record, "fairness_analysis_id") === fairnessAnalysisId
    ) ?? {}
  );
}

function buildFairnessSegmentRows(
  fairnessAnalysis: Record<string, unknown>
): PmOperatingQualityFairnessSegmentRow[] {
  return extractRecords(fairnessAnalysis.segment_results).map((record, index) => {
    const segmentId = readString(record, "segment_id") || `segment-${index + 1}`;
    return {
      key: `${segmentId}-${index}`,
      segment: readString(record, "display_name") || segmentId,
      segmentType: formatSegmentType(readString(record, "segment_type")),
      state: readString(record, "state") || "UNKNOWN",
      scoreRunCount: readString(record, "score_run_count") || "0",
      averageScore: readString(record, "average_score") || "N/A",
      minimumScore: readString(record, "minimum_score") || "N/A",
      maximumScore: readString(record, "maximum_score") || "N/A",
      scoreRunRefs: summarizeSourceRefs(extractRecords(record.score_run_refs)),
      sourceRefs: summarizeSourceRefs(extractRecords(record.source_refs)),
      reasonCodes: formatList(record.reason_codes),
    };
  });
}

function buildFairnessDetail(
  fairnessAnalysis: Record<string, unknown>
): PmOperatingQualityFairnessDetail {
  return {
    product: [
      readString(fairnessAnalysis, "product_name"),
      readString(fairnessAnalysis, "product_version"),
    ]
      .filter(Boolean)
      .join(" / ") || "N/A",
    asOfDate: readString(fairnessAnalysis, "as_of_date") || "N/A",
    minimumSegmentScoreRunCount:
      readString(fairnessAnalysis, "minimum_segment_score_run_count") || "N/A",
    maximumAverageScoreSpread:
      readString(fairnessAnalysis, "maximum_average_score_spread") || "N/A",
    observedAverageScoreSpread:
      readString(fairnessAnalysis, "observed_average_score_spread") || "N/A",
    generatedAt: formatTimestampValue(readString(fairnessAnalysis, "generated_at"), {
      nullDisplay: "Not reported",
    }),
    generatedBy: readString(fairnessAnalysis, "generated_by") || "N/A",
    sourceRefs: summarizeSourceRefs(extractRecords(fairnessAnalysis.source_refs)),
    forbiddenUses: formatForbiddenUses(fairnessAnalysis.forbidden_uses),
    reasonCodes: formatList(fairnessAnalysis.reason_codes),
  };
}

function resolveScoreRunPreviewReadiness(params: {
  policyId: string;
  policyVersion: string;
  blockedActions: string[];
}): { state: string; detail: string } {
  if (params.blockedActions.includes("PREVIEW_SCORE_RUN")) {
    return {
      state: "BLOCKED",
      detail: "Blocked by Manage action register",
    };
  }
  if (params.policyId === "N/A" || params.policyVersion === "N/A") {
    return {
      state: "BLOCKED",
      detail: "Blocked until Manage returns policy id and version",
    };
  }
  return {
    state: "READY",
    detail: `Ready for policy ${params.policyId} / ${params.policyVersion}`,
  };
}

function resolveSummaryRequestReadiness(params: {
  scoreRunId: string;
  blockedActions: string[];
}): { state: string; detail: string } {
  if (params.blockedActions.includes("REQUEST_PM_QUALITY_SUMMARY")) {
    return {
      state: "BLOCKED",
      detail: "Blocked by Manage action register",
    };
  }
  if (params.scoreRunId === "N/A") {
    return {
      state: "BLOCKED",
      detail: "Blocked until Manage returns a score run",
    };
  }
  return {
    state: "READY",
    detail: `Ready for score run ${params.scoreRunId}`,
  };
}

function resolveFairnessPreviewReadiness(params: {
  policyId: string;
  policyVersion: string;
  segmentCount: number;
  blockedActions: string[];
}): { state: string; detail: string } {
  if (params.blockedActions.includes("PREVIEW_FAIRNESS_ANALYSIS")) {
    return {
      state: "BLOCKED",
      detail: "Blocked by Manage action register",
    };
  }
  if (params.policyId === "N/A" || params.policyVersion === "N/A") {
    return {
      state: "BLOCKED",
      detail: "Blocked until Manage returns policy id and version",
    };
  }
  if (params.segmentCount < 2) {
    return {
      state: "BLOCKED",
      detail: `Blocked: ${params.segmentCount} source-defined ${formatSegmentCountNoun(
        params.segmentCount
      )} returned`,
    };
  }
  return {
    state: "READY",
    detail: `Ready: ${params.segmentCount} source-defined segments from Manage`,
  };
}

function businessSummarySupportability(value: string): string {
  const normalized = normalizeState(value);
  if (normalized.includes("READY")) {
    return "Review required";
  }
  return formatActionLabel(normalized);
}

function formatSegmentCountNoun(count: number): string {
  return count === 1 ? "segment" : "segments";
}

function resolvePanelState(
  supportabilityState: string,
  policyCount: number,
  scoreRunCount: number,
  hasResponse: boolean,
): PmOperatingQualityPanelState {
  const normalized = supportabilityState.toUpperCase();
  if (!hasResponse) {
    return "unavailable";
  }
  if (normalized.includes("BLOCKED") || normalized.includes("UNSUPPORTED")) {
    return "blocked";
  }
  if (
    normalized.includes("PARTIAL") ||
    normalized.includes("DEGRADED") ||
    normalized.includes("WATCH") ||
    normalized.includes("PENDING") ||
    normalized.includes("REVIEW") ||
    normalized.includes("BREACH")
  ) {
    return "partial";
  }
  if (normalized.includes("EMPTY") || (policyCount === 0 && scoreRunCount === 0)) {
    return "empty";
  }
  return "ready";
}

function resolvePanelSupportabilityState(
  states: ReadonlyArray<string | null | undefined>,
  policyCount: number,
  scoreRuns: ReadonlyArray<PmOperatingQualityScoreRunRow>,
): string {
  const normalizedStates = states
    .map(normalizeState)
    .filter((state) => state !== "UNKNOWN");
  const evidenceStates = [
    ...normalizedStates,
    ...scoreRuns.map((scoreRun) => normalizeState(scoreRun.state)),
  ];
  const blockedState = evidenceStates.find(
    (state) => state.includes("BLOCKED") || state.includes("UNSUPPORTED"),
  );
  if (blockedState) {
    return blockedState;
  }
  const attentionState = evidenceStates.find(
    (state) =>
      state.includes("PARTIAL") ||
      state.includes("DEGRADED") ||
      state.includes("WATCH") ||
      state.includes("PENDING") ||
      state.includes("REVIEW") ||
      state.includes("BREACH"),
  );
  if (attentionState) {
    return attentionState;
  }
  if (scoreRuns.length > 0) {
    return evidenceStates.find((state) => state.includes("READY")) ?? "READY";
  }
  if (
    normalizedStates.some((state) => state.includes("EMPTY")) ||
    policyCount === 0
  ) {
    return "EMPTY";
  }
  return normalizedStates[0] ?? "UNKNOWN";
}

function summarizeForbiddenUses(rows: PmOperatingQualityScoreRunRow[]): string {
  const forbiddenUses = rows.flatMap((row) => splitList(row.forbiddenUses)).filter(uniqueString);
  return forbiddenUses.length > 0
    ? forbiddenUses.map(formatForbiddenUse).join(", ")
    : "No forbidden-use list returned";
}

function summarizeBlockedActions(actions: string[], sourceService: string | null | undefined): string {
  if (actions.length === 0) {
    return "None";
  }
  const source = sourceService || "Manage action register";
  return actions.map((action) => `${formatActionLabel(action)} (${action}; ${source})`).join(", ");
}

function uniqueByScoreRunId(row: PmOperatingQualityScoreRunRow, index: number, rows: PmOperatingQualityScoreRunRow[]) {
  return rows.findIndex((candidate) => candidate.scoreRunId === row.scoreRunId) === index;
}

function uniqueString(value: string, index: number, values: string[]) {
  return value.length > 0 && values.indexOf(value) === index;
}

function hasAnyPolicyIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "policy_id") || readString(record, "policy_version"));
}

function hasAnyScoreRunIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "score_run_id"));
}

function hasAnyFairnessAnalysisIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "fairness_analysis_id"));
}

function hasAnyReviewActionIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "review_action_id"));
}

function hasAnySummaryInvocationIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "summary_invocation_id"));
}

function uniqueByFairnessAnalysisId(
  row: PmOperatingQualityFairnessAnalysisRow,
  index: number,
  rows: PmOperatingQualityFairnessAnalysisRow[]
) {
  return rows.findIndex((candidate) => candidate.fairnessAnalysisId === row.fairnessAnalysisId) === index;
}

function uniqueByReviewActionId(
  row: PmOperatingQualityReviewActionRow,
  index: number,
  rows: PmOperatingQualityReviewActionRow[]
) {
  return rows.findIndex((candidate) => candidate.reviewActionId === row.reviewActionId) === index;
}

function uniqueBySummaryInvocationId(
  row: PmOperatingQualitySummaryInvocationRow,
  index: number,
  rows: PmOperatingQualitySummaryInvocationRow[]
) {
  return rows.findIndex((candidate) => candidate.summaryInvocationId === row.summaryInvocationId) === index;
}

function formatCount(count: number | null | undefined, fallback: number) {
  if (typeof count === "number" && Number.isFinite(count)) {
    return String(count);
  }
  return String(fallback);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((value) => value && value.trim().length > 0 && value !== "N/A") ?? "N/A";
}

function normalizeState(value: string | null | undefined): string {
  return value?.trim().toUpperCase() || "UNKNOWN";
}

function formatBoolean(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }
  return "N/A";
}

function formatList(value: unknown): string {
  const items = extractStringArray(value);
  return items.length > 0 ? items.join(", ") : "N/A";
}

function formatForbiddenUses(value: unknown): string {
  const items = extractStringArray(value);
  return items.length > 0 ? items.map(formatForbiddenUse).join(", ") : "N/A";
}

function formatForbiddenUse(value: string): string {
  return `${formatActionLabel(value)} (${value})`;
}

function formatActionLabel(value: string): string {
  return preserveBusinessAcronyms(
    value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (match) => match.toUpperCase())
  );
}

function formatSegmentType(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return "N/A";
  }
  const labels: Record<string, string> = {
    MANDATE_TYPE: "Mandate type",
    REGION: "Region",
    BOOK_PROFILE: "Book profile",
    CLIENT_CONSTRAINT_PROFILE: "Client constraint profile",
    MARKET_REGIME: "Market regime",
    CUSTOM_SOURCE_SEGMENT: "Custom source segment",
  };
  return labels[normalized] ?? normalized.replaceAll("_", " ").toLowerCase();
}

function formatReviewTarget(record: Record<string, unknown>): string {
  const targetType = firstNonEmpty(readString(record, "target_type"), readString(record, "target_product"));
  const targetRef = firstNonEmpty(
    readString(record, "target_ref"),
    readString(record, "target_id"),
    readString(record, "score_run_id"),
    readString(record, "fairness_analysis_id")
  );
  if (targetType === "N/A" && targetRef === "N/A") {
    return "N/A";
  }
  return `${formatActionLabel(targetType)} / ${targetRef}`;
}

function formatOperatingBoundaries(record: Record<string, unknown>): string {
  const boundaryRecords = extractRecords(record.operating_boundaries);
  const explicit = extractStringArray(record.operating_boundaries);
  const forbiddenUses = extractStringArray(record.forbidden_uses);
  const boundaryIds = [
    ...boundaryRecords.map((boundary) =>
      firstNonEmpty(readString(boundary, "boundary_id"), readString(boundary, "boundary"))
    ),
    ...explicit,
    ...forbiddenUses,
  ].filter((value) => value !== "N/A").filter(uniqueString);
  if (boundaryIds.length === 0) {
    return "Supervisory record only; no client communication, HR, conduct, PM ranking, OMS, trade, execution, fills, or settlement capability is enabled.";
  }
  return boundaryIds.map(formatForbiddenUse).join(", ");
}

function formatSummaryInvocationBoundaries(record: Record<string, unknown>): string {
  const inherited = formatOperatingBoundaries(record);
  const textBoundary = formatSummaryTextBoundary(record);
  if (inherited === "Supervisory record only; no client communication, HR, conduct, PM ranking, OMS, trade, execution, fills, or settlement capability is enabled.") {
    return `${textBoundary}; persisted invocation evidence only; no generated summary text, prompt, model response, client communication, order, trade, execution, fill, settlement, or OMS capability is enabled.`;
  }
  return `${textBoundary}; ${inherited}`;
}

function formatSummaryTextBoundary(record: Record<string, unknown>): string {
  const boundary = {
    ...asRecord(record.text_boundary),
    ...asRecord(record.summary_text_boundary),
  };
  const explicitFlags = [
    formatBoundaryFlag(boundary, "generated_summary_text_stored", "Generated text stored"),
    formatBoundaryFlag(boundary, "prompt_body_stored", "Prompt stored"),
    formatBoundaryFlag(boundary, "model_response_stored", "Model response stored"),
    formatBoundaryFlag(boundary, "client_communication_projected", "Client communication projected"),
    formatBoundaryFlag(boundary, "order_or_oms_projected", "Order or OMS projected"),
  ].filter(Boolean);
  const boundaryRef = firstNonEmpty(
    readString(boundary, "boundary_ref"),
    readString(boundary, "boundary_id"),
    readString(record, "text_boundary_ref")
  );
  if (explicitFlags.length === 0 && boundaryRef === "N/A") {
    return "Generated summary text, prompts, model responses, client communication, orders, and OMS execution are not exposed by Workbench.";
  }
  return [
    ...explicitFlags,
    boundaryRef !== "N/A" ? `Boundary ref: ${boundaryRef}` : "",
  ].filter(Boolean).join("; ");
}

function formatBoundaryFlag(
  record: Record<string, unknown>,
  key: string,
  label: string
): string {
  if (!(key in record)) {
    return "";
  }
  return `${label}: ${formatYesNo(record[key])}`;
}

function formatYesNo(value: unknown): string {
  if (value === true) {
    return "Yes";
  }
  if (value === false) {
    return "No";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "N/A";
}

function summarizeSourceRefs(refs: Array<Record<string, unknown>>): string {
  if (refs.length === 0) {
    return "N/A";
  }
  return refs
    .map(formatSourceRef)
    .filter((value) => value !== "N/A")
    .join(", ") || "N/A";
}

function formatSourceRef(ref: Record<string, unknown>): string {
  const explicitRef = readString(ref, "source_ref");
  if (explicitRef) {
    return `Ref: ${explicitRef}`;
  }
  const system = readString(ref, "source_system");
  const product = readString(ref, "source_product") || readString(ref, "source_type");
  const id = readString(ref, "source_id");
  const parts = [
    system ? `System: ${system}` : "",
    product ? `Product: ${product}` : "",
    id ? `ID: ${id}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || firstNonEmpty(readString(ref, "source_type"));
}

function splitList(value: string): string[] {
  return value === "N/A" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean);
}

function extractRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}
