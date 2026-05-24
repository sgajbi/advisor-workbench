import process from "node:process";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { resolveValidationConfig } from "./validation/args.mjs";
import {
  loadCanonicalContractMetadata,
  loadWorkbenchPanelRegistryMetadata,
} from "./validation/contract-metadata.mjs";
import {
  buildSummaryPaths,
  createValidationSummary,
  ensureDirectory,
  writeShotIndex,
  writeValidationSummary,
} from "./validation/evidence-summary-writer.mjs";
import {
  checkDns,
  fetchJson,
  fetchJsonUntil,
  fetchText,
  postJson,
  sendJson,
} from "./validation/probes.mjs";
import {
  assertPerformanceCalculationSanity,
  assertRiskCalculationSanity,
} from "./validation/calculation-sanity.mjs";
import {
  createBrowserValidationHelpers,
  validateAdvisorBriefPanel,
  validateConstructionAlternativesPanel,
  validateDpmCopilotWorkspace,
  validateProposalNarrativePosturePanel,
  validateDpmCommandCenterPanel,
  validatePortfolioMemoryPanel,
  validateDpmWaveCommandCenterPanel,
  validateEvidencePanel,
  validatePerformanceAnalysisPanel,
  validatePerformanceSummaryPanel,
  validatePortfolioPanels,
  validatePmOperatingQualityPanel,
  validateOutcomeReviewPanel,
  validateProofPackPanel,
  validateRiskPanel,
} from "./validation/browser-workflows.mjs";
import { createPanelGovernance } from "./validation/panel-governance.mjs";
import {
  assertRfc3643FeatureCoverage,
  buildRfc3643FeatureCoverage,
} from "./validation/rfc36-43-feature-coverage.mjs";
import { validateAdvisorBriefWorkflowPackReviewChain } from "./validation/workflow-pack-proof.mjs";

const {
  portfolioId,
  benchmarkCode,
  workbenchBaseUrl,
  gatewayBaseUrl,
  outputDir,
  timeoutMs,
  canonicalAsOfDate,
} = resolveValidationConfig(process.argv.slice(2));
const { summaryPath, shotIndexPath } = buildSummaryPaths(outputDir);
const canonicalContract = await loadCanonicalContractMetadata();
const panelRegistry = await loadWorkbenchPanelRegistryMetadata();
const dpmCommandCenterDefaults = {
  tenantId: process.env.WORKBENCH_DPM_COMMAND_CENTER_TENANT_ID ?? "default",
  portfolioManagerId:
    process.env.WORKBENCH_DPM_COMMAND_CENTER_PORTFOLIO_MANAGER_ID ?? "PM_SG_DPM_001",
  bookId: process.env.WORKBENCH_DPM_COMMAND_CENTER_BOOK_ID ?? "BOOK_SG_BALANCED_DPM",
  asOfDate: process.env.WORKBENCH_DPM_COMMAND_CENTER_AS_OF_DATE ?? "2026-05-03",
};

const summary = createValidationSummary({
  generatedAt: new Date().toISOString(),
  portfolioId,
  benchmarkCode,
  canonicalContract,
  workbenchBaseUrl,
  gatewayBaseUrl,
  panelRegistry,
});
const panelGovernance = createPanelGovernance(summary, panelRegistry);

function buildPayloadScopedIdempotencyKey(prefix, payload) {
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  return `${prefix}-${digest}`.slice(0, 64);
}

async function fetchOptionalJson(description, url) {
  try {
    return await fetchJson(summary, url, description, timeoutMs);
  } catch (error) {
    summary.apiChecks.push({
      description,
      url,
      status: "seed_gap",
      kind: "json",
      method: "GET",
      warning: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function readString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readSupportabilityState(supportability) {
  return readString(supportability?.state) || readString(supportability?.supportability_state);
}

function classifyCommandCenterPanelState(commandCenterPayload) {
  const supportability = commandCenterPayload?.supportability;
  const explicitState = readSupportabilityState(supportability)?.toLowerCase();
  if (explicitState === "ready") {
    return "ready";
  }
  if (explicitState === "partial" || explicitState === "degraded" || explicitState === "blocked") {
    return "partial";
  }
  if (explicitState === "empty") {
    return "empty";
  }
  const completenessState = readString(supportability?.data_completeness_state)?.toLowerCase();
  if (completenessState === "complete") {
    return "ready";
  }
  if (completenessState === "partial") {
    return "partial";
  }
  if (completenessState === "empty") {
    return "empty";
  }
  return "partial";
}

function extractGeneratedProofPackId(response) {
  return (
    readString(response?.data?.proof_pack?.proof_pack_id) ||
    readString(response?.data?.proof_pack_id) ||
    readString(response?.supportability?.proof_pack_id) ||
    null
  );
}

function extractDpmWaveId(response) {
  const payload = response?.data ?? response;
  return (
    readString(payload?.wave?.wave_id) ||
    readString(payload?.wave_id) ||
    readString(payload?.items?.[0]?.wave_id) ||
    readString(response?.supportability?.wave_id) ||
    null
  );
}

function extractWorkbenchRebalanceRunId(gatewayOverview) {
  const snapshot = gatewayOverview?.rebalance_snapshot;
  const latestRunId = readString(snapshot?.last_rebalance_run_id);
  if (latestRunId) {
    return latestRunId;
  }
  const recentRuns = Array.isArray(snapshot?.recent_runs) ? snapshot.recent_runs : [];
  const recentRun = recentRuns.find((item) => readString(item?.rebalance_run_id));
  return readString(recentRun?.rebalance_run_id);
}

function recordArrayCount(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object").length : 0;
}

function recordMapCount(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }
  return Object.values(value).filter((item) => {
    if (typeof item === "string") {
      return item.trim().length > 0;
    }
    return item !== null && item !== undefined;
  }).length;
}

function sourceEvidenceCount(proofPackPayload) {
  const sourceHashCount =
    recordArrayCount(proofPackPayload.source_hashes) || recordMapCount(proofPackPayload.source_hashes);
  const lineageCount = recordArrayCount(proofPackPayload.source_lineage);
  return sourceHashCount + lineageCount;
}

function isReviewableProofPackState(state) {
  const normalized = readString(state)?.toUpperCase();
  return (
    normalized === "READY" ||
    normalized === "PENDING_REVIEW" ||
    normalized === "DEGRADED" ||
    normalized === "BLOCKED"
  );
}

function extractWorkflowPackRunId(payload) {
  return (
    readString(payload?.run_id) ||
    readString(payload?.workflow_run_id) ||
    readString(payload?.workflow_pack_run?.run_id) ||
    readString(payload?.execution?.audit?.workflow_pack_run_id) ||
    readString(payload?.audit?.workflow_pack_run_id) ||
    null
  );
}

function extractGatewayEnvelopeData(payload) {
  return payload?.data ?? payload;
}

function buildPmQualitySourceRef({
  sourceSystem,
  sourceType,
  sourceId,
  sourceVersion,
  contentHash,
}) {
  return {
    source_system: sourceSystem,
    source_type: sourceType,
    source_id: sourceId,
    source_version: sourceVersion,
    content_hash: contentHash,
  };
}

function buildCanonicalPmQualityPolicy(asOfDate) {
  return {
    policy_id: "pmq_canonical_dpm",
    policy_version: "2026.05",
    as_of_date: asOfDate,
    access_purpose: "SUPERVISORY_CONTROL_REVIEW",
    indicator_weights: [
      {
        indicator: "OUTCOME_DISCIPLINE",
        weight: "70",
        minimum_evidence_count: 1,
      },
      {
        indicator: "SOURCE_QUALITY",
        weight: "30",
        minimum_evidence_count: 1,
      },
    ],
    governance_evidence: {
      approval_ref: "PMQ-CANONICAL-APPROVAL-2026-05",
      approved_by: "pm_quality_committee",
      approved_at: "2026-05-03T09:00:00Z",
      fairness_review_ref: "PMQ-CANONICAL-FAIRNESS-2026-05",
      fairness_reviewed_by: "model_risk_governance",
      fairness_reviewed_at: "2026-05-03T10:00:00Z",
      expires_on: "2026-06-30",
      entitled_actor_ids: [
        "workbench-system",
        "workbench-pm-operating-quality-supervisor",
        "ops",
      ],
      source_refs: [
        buildPmQualitySourceRef({
          sourceSystem: "bank-governance",
          sourceType: "PM_QUALITY_POLICY_APPROVAL",
          sourceId: "PMQ-CANONICAL-APPROVAL-2026-05",
          sourceVersion: "2026.05",
          contentHash: "sha256:pmq-canonical-approval",
        }),
      ],
    },
  };
}

function buildCanonicalPmQualityScoreRunRequest(asOfDate) {
  return {
    pm_id: dpmCommandCenterDefaults.portfolioManagerId,
    book_id: dpmCommandCenterDefaults.bookId,
    as_of_date: asOfDate,
    policy: buildCanonicalPmQualityPolicy(asOfDate),
    evidence_items: [
      {
        indicator: "OUTCOME_DISCIPLINE",
        evidence_state: "READY",
        score: "92",
        source_system: "lotus-manage",
        source_type: "DPM_OUTCOME_REVIEW_POSTURE",
        source_id: "canonical-outcome-review-posture",
        source_version: asOfDate,
        content_hash: "sha256:pmq-canonical-outcome",
      },
      {
        indicator: "SOURCE_QUALITY",
        evidence_state: "READY",
        score: "88",
        source_system: "lotus-core",
        source_type: "PortfolioManagerBookMembership",
        source_id: dpmCommandCenterDefaults.bookId,
        source_version: asOfDate,
        content_hash: "sha256:pmq-canonical-source-quality",
      },
    ],
    actor_id: "workbench-system",
  };
}

function extractPmQualityScoreRunId(response) {
  const data = extractGatewayEnvelopeData(response);
  return (
    readString(data?.score_run?.score_run_id) ||
    readString(data?.score_run_id) ||
    readString(data?.score_runs?.[0]?.score_run_id) ||
    readString(response?.supportability?.score_run_id) ||
    null
  );
}

function extractPmQualityFairnessAnalysisId(response) {
  const data = extractGatewayEnvelopeData(response);
  return (
    readString(data?.fairness_analysis?.fairness_analysis_id) ||
    readString(data?.fairness_analysis_id) ||
    readString(data?.fairness_analyses?.[0]?.fairness_analysis_id) ||
    readString(response?.supportability?.fairness_analysis_id) ||
    null
  );
}

function extractPmQualityReviewActionId(response) {
  const data = extractGatewayEnvelopeData(response);
  return (
    readString(data?.review_action?.review_action_id) ||
    readString(data?.review_action_id) ||
    readString(data?.review_actions?.[0]?.review_action_id) ||
    readString(response?.supportability?.review_action_id) ||
    null
  );
}

function extractPmQualitySummaryInvocationId(response) {
  const data = extractGatewayEnvelopeData(response);
  return (
    readString(data?.summary_invocation?.summary_invocation_id) ||
    readString(data?.summary_invocation_id) ||
    readString(data?.summary_invocations?.[0]?.summary_invocation_id) ||
    readString(response?.supportability?.summary_invocation_id) ||
    null
  );
}

async function ensureCanonicalPmOperatingQualityEvidence() {
  const asOfDate = dpmCommandCenterDefaults.asOfDate;
  const pmQualityBaseUrl = `${gatewayBaseUrl}/api/v1/dpm/command-center/pm-operating-quality`;
  const scoreRunRequest = buildCanonicalPmQualityScoreRunRequest(asOfDate);
  const scoreRunResponse = await postJson(
    summary,
    `${pmQualityBaseUrl}/score-runs`,
    "DPM PM operating-quality score-run create",
    timeoutMs,
    { body: scoreRunRequest }
  );
  const scoreRunId = extractPmQualityScoreRunId(scoreRunResponse);
  if (!scoreRunId) {
    throw new Error("DPM PM operating-quality score-run create returned no score-run id.");
  }

  const bookSourceRef = buildPmQualitySourceRef({
    sourceSystem: "lotus-core",
    sourceType: "PortfolioManagerBookMembership",
    sourceId: dpmCommandCenterDefaults.bookId,
    sourceVersion: asOfDate,
    contentHash: "sha256:pmq-canonical-source-quality",
  });
  const fairnessResponse = await postJson(
    summary,
    `${pmQualityBaseUrl}/fairness-analyses`,
    "DPM PM operating-quality fairness-analysis create",
    timeoutMs,
    {
      body: {
        policy_id: "pmq_canonical_dpm",
        policy_version: "2026.05",
        as_of_date: asOfDate,
        actor_id: "workbench-system",
        minimum_segment_score_run_count: 1,
        maximum_average_score_spread: "5.00",
        segments: [
          {
            segment_id: "canonical_sg_dpm_balanced",
            segment_type: "BOOK_PROFILE",
            display_name: "Singapore DPM balanced book",
            score_run_ids: [scoreRunId],
            source_refs: [bookSourceRef],
          },
          {
            segment_id: "canonical_apac_balanced",
            segment_type: "REGION",
            display_name: "APAC balanced DPM",
            score_run_ids: [scoreRunId],
            source_refs: [bookSourceRef],
          },
        ],
      },
    }
  );
  const fairnessAnalysisId = extractPmQualityFairnessAnalysisId(fairnessResponse);
  if (!fairnessAnalysisId) {
    throw new Error(
      "DPM PM operating-quality fairness-analysis create returned no fairness-analysis id."
    );
  }

  const reviewResponse = await postJson(
    summary,
    `${pmQualityBaseUrl}/review-actions`,
    "DPM PM operating-quality review-action create",
    timeoutMs,
    {
      body: {
        target_type: "SCORE_RUN",
        target_id: scoreRunId,
        action_type: "ACKNOWLEDGE",
        action_state: "REVIEW_REQUIRED",
        review_action_ref: `PMQ-CANONICAL-REVIEW-${scoreRunId}`,
        review_reason: "Canonical live validation recorded bounded supervisory review evidence.",
        actor_id: "workbench-system",
        policy_id: "pmq_canonical_dpm",
        policy_version: "2026.05",
        as_of_date: asOfDate,
        source_refs: [
          buildPmQualitySourceRef({
            sourceSystem: "lotus-workbench",
            sourceType: "CANONICAL_FRONT_OFFICE_VALIDATION",
            sourceId: "rfc36-43-audit-20260524",
            sourceVersion: "2026-05-24",
            contentHash: "sha256:pmq-canonical-review",
          }),
        ],
      },
    }
  );
  const reviewActionId = extractPmQualityReviewActionId(reviewResponse);
  if (!reviewActionId) {
    throw new Error("DPM PM operating-quality review-action create returned no review-action id.");
  }

  const summaryResponse = await postJson(
    summary,
    `${pmQualityBaseUrl}/summary-invocations`,
    "DPM PM operating-quality summary-invocation create",
    timeoutMs,
    {
      body: {
        score_run_id: scoreRunId,
        review_action_id: reviewActionId,
        invocation_state: "COMPLETED",
        summary_ref: `PMQ-CANONICAL-SUMMARY-${scoreRunId}`,
        workflow_pack_name: "pm_quality_summary.pack",
        workflow_pack_version: "v1",
        workflow_run_id: `pmq-canonical-summary-${scoreRunId}`,
        summary_artifact_ref: `pmq-canonical-summary-artifact-${scoreRunId}`,
        summary_content_hash: "sha256:pmq-canonical-summary",
        requested_by: "workbench-system",
        source_refs: [
          buildPmQualitySourceRef({
            sourceSystem: "lotus-ai",
            sourceType: "pm_quality_summary.pack",
            sourceId: `pmq-canonical-summary-${scoreRunId}`,
            sourceVersion: "v1",
            contentHash: "sha256:pmq-canonical-summary",
          }),
        ],
      },
    }
  );
  const summaryInvocationId = extractPmQualitySummaryInvocationId(summaryResponse);
  if (!summaryInvocationId) {
    throw new Error(
      "DPM PM operating-quality summary-invocation create returned no summary-invocation id."
    );
  }

  const scoreRunList = await fetchJson(
    summary,
    `${pmQualityBaseUrl}/score-runs?book_id=${encodeURIComponent(
      dpmCommandCenterDefaults.bookId
    )}&as_of_date=${encodeURIComponent(asOfDate)}&limit=10&offset=0`,
    "DPM PM operating-quality score-run list",
    timeoutMs
  );
  const reviewActionList = await fetchJson(
    summary,
    `${pmQualityBaseUrl}/review-actions?target_type=SCORE_RUN&target_id=${encodeURIComponent(
      scoreRunId
    )}&as_of_date=${encodeURIComponent(asOfDate)}&limit=10&offset=0`,
    "DPM PM operating-quality review-action list",
    timeoutMs
  );
  const fairnessAnalysisList = await fetchJson(
    summary,
    `${pmQualityBaseUrl}/fairness-analyses?policy_id=pmq_canonical_dpm&policy_version=2026.05&as_of_date=${encodeURIComponent(
      asOfDate
    )}&limit=10&offset=0`,
    "DPM PM operating-quality fairness-analysis list",
    timeoutMs
  );
  const summaryInvocationList = await fetchJson(
    summary,
    `${pmQualityBaseUrl}/summary-invocations?score_run_id=${encodeURIComponent(
      scoreRunId
    )}&review_action_id=${encodeURIComponent(reviewActionId)}&as_of_date=${encodeURIComponent(
      asOfDate
    )}&limit=10&offset=0`,
    "DPM PM operating-quality summary-invocation list",
    timeoutMs
  );
  if (extractPmQualityScoreRunId(scoreRunList) !== scoreRunId) {
    throw new Error("DPM PM operating-quality score-run list did not return the seeded score run.");
  }
  if (extractPmQualityReviewActionId(reviewActionList) !== reviewActionId) {
    throw new Error(
      "DPM PM operating-quality review-action list did not return the seeded review action."
    );
  }
  if (extractPmQualityFairnessAnalysisId(fairnessAnalysisList) !== fairnessAnalysisId) {
    throw new Error(
      "DPM PM operating-quality fairness-analysis list did not return the seeded analysis."
    );
  }
  if (extractPmQualitySummaryInvocationId(summaryInvocationList) !== summaryInvocationId) {
    throw new Error(
      "DPM PM operating-quality summary-invocation list did not return the seeded invocation."
    );
  }

  return {
    scoreRunId,
    fairnessAnalysisId,
    reviewActionId,
    summaryInvocationId,
    asOfDate,
  };
}

async function run() {
  await ensureDirectory(outputDir);

  const dnsChecks = await Promise.all([
    checkDns(summary, "workbench.dev.lotus"),
    checkDns(summary, "gateway.dev.lotus"),
    checkDns(summary, "core-query.dev.lotus"),
    checkDns(summary, "core-control.dev.lotus"),
    checkDns(summary, "core-ingestion.dev.lotus"),
    checkDns(summary, "performance.dev.lotus"),
    checkDns(summary, "risk.dev.lotus"),
    checkDns(summary, "advise.dev.lotus"),
    checkDns(summary, "manage.dev.lotus"),
    checkDns(summary, "report.dev.lotus"),
    checkDns(summary, "archive.dev.lotus"),
    checkDns(summary, "render.dev.lotus"),
    checkDns(summary, "ai.dev.lotus", { required: false }),
  ]);

  dnsChecks
    .filter((item) => !item.ok)
    .forEach((item) => console.warn(item.warning));

  const foundationWorkspace = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/foundation/portfolios/${portfolioId}/workspace`,
    "Foundation workspace",
    timeoutMs
  );
  if (foundationWorkspace?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error(`Foundation workspace did not resolve ${portfolioId}.`);
  }

  const performanceSummaryUrl = `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/summary?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}&report_end_date=${canonicalAsOfDate}`;
  const performanceSummary = await fetchJsonUntil(
    summary,
    performanceSummaryUrl,
    "Performance summary evidence readiness",
    timeoutMs,
    (payload) =>
      payload?.capabilities?.evidence?.state === "supported"
        ? true
        : `evidence state is ${payload?.capabilities?.evidence?.state ?? "missing"}`
  );
  if (!performanceSummary?.portfolio_id) {
    throw new Error("Performance summary returned no portfolio payload.");
  }

  const performanceDetails = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/details?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}&report_end_date=${canonicalAsOfDate}`,
    "Performance details",
    timeoutMs
  );
  if (!performanceDetails?.portfolio_id) {
    throw new Error("Performance details returned no portfolio payload.");
  }

  const riskSummary = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/summary?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&as_of_date=${canonicalAsOfDate}`,
    "Risk summary",
    timeoutMs
  );
  if (!riskSummary?.portfolio_id) {
    throw new Error("Risk summary returned no portfolio payload.");
  }

  const riskConcentration = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/concentration?period=YTD&benchmark_code=${benchmarkCode}&as_of_date=${canonicalAsOfDate}`,
    "Risk concentration",
    timeoutMs
  );
  const riskDrawdown = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/drawdown?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&as_of_date=${canonicalAsOfDate}&include_underwater_series=true`,
    "Risk drawdown",
    timeoutMs
  );
  const riskRolling = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&as_of_date=${canonicalAsOfDate}&include_time_series=true`,
    "Risk rolling",
    timeoutMs
  );
  const riskAttribution = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/attribution?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&as_of_date=${canonicalAsOfDate}&attribution_type=total_risk&grouping_dimension=sector`,
    "Risk attribution",
    timeoutMs
  );
  for (const [description, payload] of [
    ["Risk concentration", riskConcentration],
    ["Risk drawdown", riskDrawdown],
    ["Risk rolling", riskRolling],
    ["Risk attribution", riskAttribution],
  ]) {
    if (payload?.state !== "ready") {
      throw new Error(`${description} returned non-ready state: ${String(payload?.state)}.`);
    }
  }
  assertPerformanceCalculationSanity({
    summary,
    performanceSummary,
    performanceDetails,
    recordPanelClassification: panelGovernance.recordPanelClassification,
  });
  assertRiskCalculationSanity({
    summary,
    riskSummary,
    concentration: riskConcentration,
    drawdown: riskDrawdown,
    rolling: riskRolling,
    attribution: riskAttribution,
    recordPanelClassification: panelGovernance.recordPanelClassification,
  });

  const advisorBrief = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}&report_end_date=${canonicalAsOfDate}`,
    "Advisor brief",
    timeoutMs
  );
  if (!advisorBrief?.summary) {
    throw new Error("Advisor brief returned no summary.");
  }
  if (!advisorBrief?.workflow_pack_run?.run_id) {
    throw new Error("Advisor brief returned no workflow-pack run identity.");
  }
  summary.workflowPackChecks.push({
    actionType: "INITIAL_VISIBLE",
    route: `/api/v1/workbench/${portfolioId}/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}&report_end_date=${canonicalAsOfDate}`,
    sourceRunId: advisorBrief.workflow_pack_run.run_id,
    resultReviewState: advisorBrief.workflow_pack_run.review_state,
    resultSupportabilityStatus: advisorBrief.workflow_pack_run.supportability_status,
  });

  await validateAdvisorBriefWorkflowPackReviewChain({
    summary,
    gatewayBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    fetchJson,
    postJson,
  });

  const proposalCreateBody = {
    body: {
      created_by: "workbench-canonical-validator",
      input_mode: "stateful",
      stateful_input: {
        portfolio_id: portfolioId,
        as_of: canonicalAsOfDate,
        narrative_request: {
          audience: "ADVISOR_REVIEW",
          jurisdiction: "SG",
          client_audience: "ADVISOR_REVIEW",
          sections: ["EXECUTIVE_SUMMARY", "RISK_AND_CONCENTRATION"],
          requested_by: "workbench-canonical-validator",
        },
      },
      metadata: {
        title: "Canonical advisor narrative proof",
        advisor_notes: "Workbench canonical validation proposal for RFC-0023 Slice 12.",
        jurisdiction: "SG",
      },
    },
  };
  const proposalCreateIdempotencyKey = buildPayloadScopedIdempotencyKey(
    "wb-canonical-narrative",
    proposalCreateBody
  );
  const proposalCreate = await sendJson(
    summary,
    `${gatewayBaseUrl}/api/v1/proposals`,
    "Create proposal narrative canonical proof",
    timeoutMs,
    {
      method: "POST",
      body: proposalCreateBody,
      headers: {
        "Idempotency-Key": proposalCreateIdempotencyKey,
      },
    }
  );
  const proposalCreateData = extractGatewayEnvelopeData(proposalCreate);
  const proposalId = readString(proposalCreateData?.proposal?.proposal_id);
  const proposalVersionNo = proposalCreateData?.version?.version_no ?? null;
  const proposalNarrative = proposalCreateData?.version?.artifact?.proposal_narrative;
  if (!proposalId || !proposalNarrative?.narrative_id) {
    throw new Error("Canonical proposal narrative proof did not create a narrative proposal.");
  }
  summary.workflowPackChecks.push({
    actionType: "PROPOSAL_NARRATIVE_CREATED",
    route: `/api/v1/proposals`,
    sourceRunId: proposalNarrative.narrative_id,
    resultReviewState: proposalNarrative.review_state,
    resultSupportabilityStatus: proposalNarrative.generation_mode,
    proposalId,
    versionNo: proposalVersionNo,
  });

  const manageSupportabilitySummary = await fetchJson(
    summary,
    "http://manage.dev.lotus/api/v1/rebalance/supportability/summary",
    "lotus-manage supportability summary",
    timeoutMs
  );
  const manageSupportabilityState = readSupportabilityState(
    manageSupportabilitySummary?.supportability
  );
  if (!manageSupportabilityState) {
    throw new Error("lotus-manage supportability summary returned no bounded supportability state.");
  }
  summary.sourceSupportability = {
    ...(summary.sourceSupportability ?? {}),
    lotusManageActionRegister: {
      state: manageSupportabilityState,
      reason: readString(manageSupportabilitySummary?.supportability?.reason),
      freshnessBucket: readString(manageSupportabilitySummary?.supportability?.freshness_bucket),
      runCount: manageSupportabilitySummary?.supportability?.run_count ?? null,
      operationCount: manageSupportabilitySummary?.supportability?.operation_count ?? null,
      workflowDecisionCount:
        manageSupportabilitySummary?.supportability?.workflow_decision_count ?? null,
    },
  };

  const outcomeReviews = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/outcome-reviews?portfolio_id=${portfolioId}&limit=5`,
    "DPM outcome reviews",
    timeoutMs
  );
  const outcomeReviewItems = outcomeReviews?.data?.items ?? outcomeReviews?.items ?? [];
  if (!Array.isArray(outcomeReviewItems) || outcomeReviewItems.length < 1) {
    throw new Error("DPM outcome-review list returned no manage-backed reviews.");
  }
  const gatewayOverview = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/overview`,
    "Gateway workbench overview",
    timeoutMs
  );
  if (gatewayOverview?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error("Gateway workbench overview returned no portfolio payload.");
  }
  const proofPackSourceReview = outcomeReviewItems.find((item) => readString(item?.mandate_id));
  const rebalanceRunId = extractWorkbenchRebalanceRunId(gatewayOverview);
  if (!rebalanceRunId) {
    throw new Error("Gateway workbench overview returned no manage rebalance-run reference for proof-pack generation.");
  }
  const proofPackRequestBody = {
    source_type: "REBALANCE_RUN",
    rebalance_run_id: rebalanceRunId,
    mandate_id: readString(proofPackSourceReview?.mandate_id) ?? undefined,
    include_markdown: true,
    include_report_input: true,
    include_ai_evidence_input: true,
    actor_id: "workbench-proof-pack-operator",
    reason: "Workbench PM generated proof pack from Gateway-backed rebalance run.",
  };
  const proofPackIdempotencyKey = buildPayloadScopedIdempotencyKey(
    "wb-proof-pack",
    proofPackRequestBody
  );
  const generatedProofPack = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/proof-packs`,
    "Generate DPM proof-pack evidence",
    timeoutMs,
    {
      idempotency_key: proofPackIdempotencyKey,
      body: proofPackRequestBody,
    }
  );
  const proofPackId = extractGeneratedProofPackId(generatedProofPack);
  if (!proofPackId) {
    throw new Error("DPM proof-pack generation returned no proof-pack reference.");
  }
  const proofPack = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}`,
    "DPM proof-pack evidence",
    timeoutMs
  );
  const proofPackPayload = proofPack?.data?.proof_pack ?? proofPack?.data ?? proofPack;
  if (!proofPackPayload?.proof_pack_id) {
    throw new Error("DPM proof-pack evidence returned no proof-pack identity.");
  }
  const proofPackSectionCount = recordArrayCount(proofPackPayload.sections ?? proofPackPayload.section_posture);
  const proofPackSourceHashCount = sourceEvidenceCount(proofPackPayload);
  if (proofPackSectionCount < 1) {
    throw new Error("DPM proof-pack evidence returned no reviewable proof-pack sections.");
  }
  if (proofPackSourceHashCount < 1) {
    throw new Error("DPM proof-pack evidence returned no source hashes or lineage references.");
  }
  const proofPackSupportability = proofPack?.supportability;
  if (proofPackSupportability?.state && !isReviewableProofPackState(proofPackSupportability.state)) {
    throw new Error(`DPM proof-pack evidence returned non-reviewable state: ${proofPackSupportability.state}.`);
  }
  const proofPackAiPmMemo = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}/ai-pm-memo`,
    "DPM proof-pack AI PM memo",
    timeoutMs,
    {
      requested_outputs: ["pm_memo", "rationale_summary", "evidence_gaps"],
      audience: ["portfolio_manager", "investment_control"],
    }
  );
  const proofPackAiPmMemoPayload = proofPackAiPmMemo?.data ?? proofPackAiPmMemo;
  const proofPackAiPmMemoSourceService =
    readString(proofPackAiPmMemo?.source_service) ?? readString(proofPackAiPmMemo?.sourceService);
  if (proofPackAiPmMemoSourceService !== "lotus-ai") {
    throw new Error("DPM proof-pack AI PM memo did not return lotus-ai source authority.");
  }
  const proofPackAiPmMemoRunId = extractWorkflowPackRunId(proofPackAiPmMemoPayload);
  if (!proofPackAiPmMemoRunId) {
    throw new Error("DPM proof-pack AI PM memo returned no workflow-pack run reference.");
  }
  summary.workflowPackChecks.push({
    description: "DPM proof-pack AI PM memo",
    sourceService: proofPackAiPmMemoSourceService,
    proofPackId,
    sourceRunId: proofPackAiPmMemoRunId,
    resultReviewState:
      proofPackAiPmMemoPayload?.workflow_pack_run?.review_state ??
      proofPackAiPmMemoPayload?.execution?.review_state ??
      "unknown",
    resultSupportabilityStatus:
      proofPackAiPmMemoPayload?.workflow_pack_run?.supportability_status ??
      proofPackAiPmMemoPayload?.execution?.supportability_status ??
      "unknown",
  });

  const commandCenterParams = new URLSearchParams({
    tenant_id: dpmCommandCenterDefaults.tenantId,
    portfolio_manager_id: dpmCommandCenterDefaults.portfolioManagerId,
    book_id: dpmCommandCenterDefaults.bookId,
    as_of_date: dpmCommandCenterDefaults.asOfDate,
    limit: "25",
  });
  const dpmCommandCenter = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center?${commandCenterParams.toString()}`,
    "DPM command-center summary",
    timeoutMs
  );
  const dpmCommandCenterPayload = dpmCommandCenter?.data ?? dpmCommandCenter;
  if (!dpmCommandCenterPayload?.supportability) {
    throw new Error("DPM command-center summary returned no manage supportability envelope.");
  }
  const dpmCommandCenterPanelState = classifyCommandCenterPanelState(dpmCommandCenterPayload);
  if (!["ready", "partial"].includes(dpmCommandCenterPanelState)) {
    throw new Error(
      `DPM command-center summary did not return canonical populated posture; observed ${dpmCommandCenterPanelState}.`
    );
  }

  const portfolioMemory = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/portfolios/${encodeURIComponent(portfolioId)}/memory?limit=100`,
    "DPM portfolio memory",
    timeoutMs
  );
  const portfolioMemorySupportability = portfolioMemory?.supportability;
  const portfolioMemoryPayload = portfolioMemory?.data ?? portfolioMemory;
  const portfolioMemoryEvents = Array.isArray(portfolioMemoryPayload?.events)
    ? portfolioMemoryPayload.events
    : [];
  const portfolioMemoryState = readSupportabilityState(portfolioMemorySupportability);
  const supportedPortfolioMemoryStates = new Set(["ready", "partial", "degraded", "blocked"]);
  if (!supportedPortfolioMemoryStates.has(portfolioMemoryState?.toLowerCase())) {
    throw new Error(
      `DPM portfolio memory did not return populated manage supportability; observed ${
        portfolioMemoryState ?? "missing"
      }.`
    );
  }
  if (portfolioMemoryEvents.length < 1) {
    throw new Error("DPM portfolio memory returned no manage-owned timeline events.");
  }
  if (!readString(portfolioMemorySupportability?.content_hash)) {
    throw new Error("DPM portfolio memory returned no content hash.");
  }

  const dpmExceptions = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/exceptions?tenant_id=${encodeURIComponent(
      dpmCommandCenterDefaults.tenantId
    )}&portfolio_manager_id=${encodeURIComponent(
      dpmCommandCenterDefaults.portfolioManagerId
    )}&limit=25&state=ACTIVE`,
    "DPM command-center active exceptions",
    timeoutMs
  );
  const dpmExceptionItems =
    dpmExceptions?.data?.items ?? dpmExceptions?.items ?? dpmExceptions?.exceptions ?? [];
  if (!Array.isArray(dpmExceptionItems)) {
    throw new Error("DPM command-center exceptions returned no list envelope.");
  }

  const dpmMandate = await fetchOptionalJson(
    "DPM command-center mandate by portfolio",
    `${gatewayBaseUrl}/api/v1/dpm/command-center/mandates/by-portfolio/${portfolioId}`
  );
  const dpmMandatePayload = dpmMandate?.data ?? dpmMandate;
  const mandateId =
    dpmMandatePayload?.mandate_id ??
    dpmMandatePayload?.mandateId ??
    dpmMandatePayload?.mandate?.mandate_id ??
    dpmMandatePayload?.mandate?.mandateId;

  let mandateHealthObserved = false;
  if (mandateId) {
    const dpmMandateHealth = await fetchJson(
      summary,
      `${gatewayBaseUrl}/api/v1/dpm/command-center/mandates/${encodeURIComponent(mandateId)}/health`,
      "DPM command-center mandate health",
      timeoutMs
    );
    const dpmMandateHealthPayload = dpmMandateHealth?.data ?? dpmMandateHealth;
    if (!dpmMandateHealthPayload?.health_state && !dpmMandateHealthPayload?.state) {
      throw new Error("DPM command-center mandate health returned no health state.");
    }
    mandateHealthObserved = true;
  }

  const dpmWaveParams = new URLSearchParams({
    trigger_type: "EXPLICIT_PORTFOLIO_LIST",
    as_of_date: dpmCommandCenterDefaults.asOfDate,
    limit: "10",
    offset: "0",
  });
  const dpmWaves = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/waves?${dpmWaveParams.toString()}`,
    "DPM rebalance waves",
    timeoutMs
  );
  const dpmWaveSupportability = dpmWaves?.supportability;
  if (!readSupportabilityState(dpmWaveSupportability)) {
    throw new Error("DPM rebalance-wave list returned no manage supportability state.");
  }
  const dpmWavePayload = dpmWaves?.data ?? dpmWaves;
  let dpmWaveId = extractDpmWaveId(dpmWavePayload);
  const dpmWavePreview = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/waves/preview`,
    "DPM rebalance-wave preview",
    timeoutMs,
    {
      body: {
        trigger_type: "EXPLICIT_PORTFOLIO_LIST",
        trigger_id: `live-validation-wave-${portfolioId}-${dpmCommandCenterDefaults.asOfDate}`,
        rationale: "Canonical Workbench live validation previewed an RFC-0041 rebalance wave.",
        as_of_date: dpmCommandCenterDefaults.asOfDate,
        actor_id: "workbench-system",
        portfolios: [{ portfolio_id: portfolioId }],
      },
    }
  );
  const dpmWavePreviewSupportability = dpmWavePreview?.supportability;
  const dpmWavePreviewSupportabilityState = readSupportabilityState(dpmWavePreviewSupportability);
  if (dpmWavePreviewSupportabilityState?.toLowerCase() !== "ready") {
    throw new Error(
      `DPM rebalance-wave preview did not return ready manage supportability; observed ${
        dpmWavePreviewSupportabilityState ?? "missing"
      }.`
    );
  }
  if (!dpmWaveId) {
    const dpmWaveCreate = await postJson(
      summary,
      `${gatewayBaseUrl}/api/v1/dpm/command-center/waves`,
      "DPM rebalance-wave create",
      timeoutMs,
      {
        idempotency_key: [
          "workbench-live-validation-wave",
          portfolioId,
          dpmCommandCenterDefaults.asOfDate,
        ].join("-"),
        body: {
          trigger_type: "EXPLICIT_PORTFOLIO_LIST",
          trigger_id: `live-validation-wave-${portfolioId}-${dpmCommandCenterDefaults.asOfDate}`,
          rationale: "Canonical Workbench live validation created an RFC-0041 rebalance wave.",
          as_of_date: dpmCommandCenterDefaults.asOfDate,
          actor_id: "workbench-system",
          portfolios: [{ portfolio_id: portfolioId }],
        },
      }
    );
    dpmWaveId = extractDpmWaveId(dpmWaveCreate);
  }
  if (!dpmWaveId) {
    throw new Error("DPM rebalance-wave create returned no manage-owned wave id.");
  }
  const dpmWaveReportInput = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/waves/${encodeURIComponent(dpmWaveId)}/report-input`,
    "DPM rebalance-wave report input",
    timeoutMs
  );
  const dpmWaveReportInputPayload = dpmWaveReportInput?.data ?? dpmWaveReportInput;
  const dpmWaveReportInputRef =
    readString(dpmWaveReportInputPayload?.report_input_ref) ||
    readString(dpmWaveReportInputPayload?.evidence_ref?.ref_id);
  if (!dpmWaveReportInputRef) {
    throw new Error("DPM rebalance-wave report input returned no report input evidence ref.");
  }
  const dpmWaveAiPmMemo = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/waves/${encodeURIComponent(dpmWaveId)}/ai-pm-memo`,
    "DPM rebalance-wave AI PM memo",
    timeoutMs,
    {
      requested_outputs: ["wave_pm_memo", "approval_checklist", "evidence_gaps"],
      audience: ["portfolio_manager", "investment_control", "operations"],
    }
  );
  const dpmWaveAiPmMemoPayload = dpmWaveAiPmMemo?.data ?? dpmWaveAiPmMemo;
  const dpmWaveAiPmMemoSourceService =
    readString(dpmWaveAiPmMemo?.source_service) ?? readString(dpmWaveAiPmMemo?.sourceService);
  if (dpmWaveAiPmMemoSourceService !== "lotus-ai") {
    throw new Error("DPM rebalance-wave AI PM memo did not return lotus-ai source authority.");
  }
  const dpmWaveAiPmMemoRunId = extractWorkflowPackRunId(dpmWaveAiPmMemoPayload);
  if (!dpmWaveAiPmMemoRunId) {
    throw new Error("DPM rebalance-wave AI PM memo returned no workflow-pack run reference.");
  }
  summary.workflowPackChecks.push({
    description: "DPM rebalance-wave AI PM memo",
    sourceService: dpmWaveAiPmMemoSourceService,
    waveId: dpmWaveId,
    sourceRunId: dpmWaveAiPmMemoRunId,
    resultReviewState:
      dpmWaveAiPmMemoPayload?.workflow_pack_run?.review_state ??
      dpmWaveAiPmMemoPayload?.execution?.review_state ??
      dpmWaveAiPmMemoPayload?.status ??
      "UNKNOWN",
  });

  const pmOperatingQualityEvidence = await ensureCanonicalPmOperatingQualityEvidence();

  const reportCapabilities = await fetchJson(
    summary,
    "http://report.dev.lotus/integration/capabilities?consumerSystem=lotus-gateway&tenantId=default",
    "lotus-report integration capabilities",
    timeoutMs
  );
  if (!Array.isArray(reportCapabilities?.features) || reportCapabilities.features.length < 1) {
    throw new Error("lotus-report integration capabilities returned no feature flags.");
  }

  await fetchJson(
    summary,
    "http://archive.dev.lotus/health/ready",
    "lotus-archive readiness",
    timeoutMs
  );
  await fetchJson(
    summary,
    "http://render.dev.lotus/health/ready",
    "lotus-render readiness",
    timeoutMs
  );

  const gatewayCapabilities = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/platform/capabilities`,
    "Gateway platform capabilities",
    timeoutMs
  );
  const gatewayModuleHealth = gatewayCapabilities?.data?.normalized?.moduleHealth;
  if (!gatewayModuleHealth || typeof gatewayModuleHealth.lotus_manage !== "string") {
    throw new Error("Gateway platform capabilities returned no explicit lotus-manage module health.");
  }
  for (const requiredSource of ["lotus_core", "lotus_performance", "lotus_risk"]) {
    if (gatewayModuleHealth[requiredSource] !== "available") {
      throw new Error(`Gateway platform capabilities returned non-available ${requiredSource}.`);
    }
  }

  panelGovernance.recordPanelClassification("portfolio.summary", "ready", "lotus-gateway", {
    portfolioId,
  });
  panelGovernance.recordPanelClassification("portfolio.detailed", "ready", "lotus-gateway", {
    portfolioId,
  });
  panelGovernance.recordPanelClassification("performance.advisor_brief", "ready", "lotus-performance", {
    sourceMetricMinimum: 3,
  });
  panelGovernance.recordPanelClassification("proposal.narrative_posture", "ready", "lotus-advise", {
    route: `/proposals/${proposalId}`,
    proposalId,
    versionNo: proposalVersionNo,
    narrativeId: proposalNarrative.narrative_id,
    generationMode: proposalNarrative.generation_mode,
  });
  panelGovernance.recordPanelClassification("dpm.outcome_review", "ready", "lotus-manage", {
    route: `/workbench/${portfolioId}`,
    outcomeReviewMinimum: 1,
  });
  panelGovernance.recordPanelClassification("dpm.proof_pack", "ready", "lotus-manage", {
    route: `/workbench/${portfolioId}`,
    proofPackId,
    proofPackBusinessState: proofPackSupportability?.state ?? proofPackPayload.status ?? "UNKNOWN",
    sectionCount: proofPackSectionCount,
    sourceHashCount: proofPackSourceHashCount,
  });
  panelGovernance.recordPanelClassification("dpm.command_center", dpmCommandCenterPanelState, "lotus-manage", {
    route: `/workbench/${portfolioId}`,
    source: "Gateway DPM command-center summary",
    supportabilityState: readSupportabilityState(dpmCommandCenterPayload.supportability),
    dataCompletenessState: dpmCommandCenterPayload.supportability.data_completeness_state,
    reason: readString(dpmCommandCenterPayload.supportability.reason),
  });
  panelGovernance.recordPanelClassification("dpm.portfolio_memory", "ready", "lotus-manage", {
    route: `/workbench/${portfolioId}`,
    eventCount: portfolioMemoryEvents.length,
    source: "Gateway DPM portfolio-memory composition",
  });
  panelGovernance.recordPanelClassification("dpm.wave_command_center", "ready", "lotus-manage", {
    route: `/workbench/${portfolioId}`,
    source: "Gateway DPM rebalance-wave composition",
    waveId: dpmWaveId,
    reportInputRef: dpmWaveReportInputPayload.report_input_ref,
    aiMemoRunId: dpmWaveAiPmMemoRunId,
  });
  panelGovernance.recordPanelClassification("dpm.construction_alternatives", "ready", "lotus-manage", {
    route: `/workbench/${portfolioId}?mode=construction`,
    source: "Gateway DPM construction alternatives",
  });
  panelGovernance.recordPanelClassification("dpm.pm_operating_quality", "ready", "lotus-manage", {
    route: `/workbench/${portfolioId}?mode=quality`,
    source: "Gateway DPM PM operating quality",
    scoreRunId: pmOperatingQualityEvidence.scoreRunId,
    fairnessAnalysisId: pmOperatingQualityEvidence.fairnessAnalysisId,
    reviewActionId: pmOperatingQualityEvidence.reviewActionId,
    summaryInvocationId: pmOperatingQualityEvidence.summaryInvocationId,
    asOfDate: pmOperatingQualityEvidence.asOfDate,
  });
  panelGovernance.recordPanelClassification("dpm.copilot_workspace", "ready", "lotus-ai", {
    route: `/workbench/${portfolioId}?mode=copilot`,
    source: "Gateway/lotus-ai DPM workflow-pack workspace",
  });
  panelGovernance.assertNoUnsupportedBlankPanels();
  panelGovernance.assertPanelSupportabilityAlignment();
  summary.rfc3643FeatureCoverage = buildRfc3643FeatureCoverage(summary, {
    foundationWorkspace,
    manageSupportabilitySummary,
    gatewayOverview,
    commandCenterSummary: dpmCommandCenterPayload,
    dpmCommandCenterPanel: true,
    activeExceptions: true,
    portfolioMemory: portfolioMemoryEvents,
    mandateLookup: mandateId,
    mandateHealth: mandateHealthObserved,
    constructionAlternativesPanel: true,
    proofPackId,
    proofPackSections: proofPackSectionCount,
    proofPackSourceEvidence: proofPackSourceHashCount,
    proofPackPanel: true,
    proofPackAiMemo: proofPackAiPmMemoRunId,
    wavePreview: dpmWavePreviewSupportabilityState?.toLowerCase() === "ready",
    waveId: dpmWaveId,
    waveReportInput: dpmWaveReportInputRef,
    waveAiMemo: dpmWaveAiPmMemoRunId,
    wavePanel: true,
    outcomeReviewRows: outcomeReviewItems,
    outcomeReviewPanel: true,
    pmQualityScoreRun: pmOperatingQualityEvidence.scoreRunId,
    pmQualityFairnessAnalysis: pmOperatingQualityEvidence.fairnessAnalysisId,
    pmQualityReviewAction: pmOperatingQualityEvidence.reviewActionId,
    pmQualitySummaryInvocation: pmOperatingQualityEvidence.summaryInvocationId,
    pmQualityPanel: true,
    copilotWorkspace: true,
    copilotPanel: true,
    proposalNarrative: proposalNarrative.narrative_id,
    proposalNarrativePanel: true,
  });
  assertRfc3643FeatureCoverage(summary);

  const portfolioShell = await fetchText(
    summary,
    `${workbenchBaseUrl}/portfolio?portfolioId=${portfolioId}`,
    "Workbench portfolio route",
    timeoutMs
  );
  if (!portfolioShell.includes("Portfolio")) {
    throw new Error("Workbench portfolio route did not render the Portfolio shell.");
  }

  const performanceShell = await fetchText(
    summary,
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}`,
    "Workbench performance route",
    timeoutMs
  );
  if (!performanceShell.includes("Performance")) {
    throw new Error("Workbench performance route did not render the Performance shell.");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const browserHelpers = createBrowserValidationHelpers({
    outputDir,
    summary,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    panelRegistryById: panelGovernance.panelRegistryById,
  });

  try {
    await validatePortfolioPanels(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      assertListHasItems: browserHelpers.assertListHasItems,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validatePerformanceSummaryPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      canonicalAsOfDate,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validatePerformanceAnalysisPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      canonicalAsOfDate,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateAdvisorBriefPanel(page, {
      summary,
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      canonicalAsOfDate,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
      performAcceptReviewActionProof: true,
    });
    await validateProposalNarrativePosturePanel(page, {
      summary,
      workbenchBaseUrl,
      proposalId,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateRiskPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      canonicalAsOfDate,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateEvidencePanel(page, {
      summary,
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      canonicalAsOfDate,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateOutcomeReviewPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateProofPackPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateDpmCommandCenterPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validatePortfolioMemoryPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateDpmWaveCommandCenterPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateConstructionAlternativesPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validatePmOperatingQualityPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateDpmCopilotWorkspace(page, {
      workbenchBaseUrl,
      portfolioId,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
  } finally {
    await browser.close();
  }

  await writeValidationSummary(summaryPath, summary);
  await writeShotIndex(shotIndexPath, summary, summaryPath);
  console.log(`Live canonical Workbench validation passed for ${portfolioId}. Screenshots: ${outputDir}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
