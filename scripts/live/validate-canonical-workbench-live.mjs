import process from "node:process";
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
import { checkDns, fetchJson, fetchText, postJson } from "./validation/probes.mjs";
import {
  assertPerformanceCalculationSanity,
  assertRiskCalculationSanity,
} from "./validation/calculation-sanity.mjs";
import {
  createBrowserValidationHelpers,
  validateAdvisorBriefPanel,
  validateDpmCommandCenterPanel,
  validatePortfolioMemoryPanel,
  validateDpmWaveCommandCenterPanel,
  validateEvidencePanel,
  validatePerformanceAnalysisPanel,
  validatePerformanceSummaryPanel,
  validatePortfolioPanels,
  validateOutcomeReviewPanel,
  validateProofPackPanel,
  validateRiskPanel,
} from "./validation/browser-workflows.mjs";
import { createPanelGovernance } from "./validation/panel-governance.mjs";
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

  const performanceSummary = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/summary?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance summary",
    timeoutMs
  );
  if (!performanceSummary?.portfolio_id) {
    throw new Error("Performance summary returned no portfolio payload.");
  }

  const performanceDetails = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/details?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance details",
    timeoutMs
  );
  if (!performanceDetails?.portfolio_id) {
    throw new Error("Performance details returned no portfolio payload.");
  }

  const riskSummary = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/summary?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}`,
    "Risk summary",
    timeoutMs
  );
  if (!riskSummary?.portfolio_id) {
    throw new Error("Risk summary returned no portfolio payload.");
  }

  const riskConcentration = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/concentration?period=YTD&benchmark_code=${benchmarkCode}`,
    "Risk concentration",
    timeoutMs
  );
  const riskDrawdown = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/drawdown?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_underwater_series=true`,
    "Risk drawdown",
    timeoutMs
  );
  const riskRolling = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_time_series=true`,
    "Risk rolling",
    timeoutMs
  );
  const riskAttribution = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/attribution?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&attribution_type=total_risk&grouping_dimension=sector`,
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
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
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
    route: `/api/v1/workbench/${portfolioId}/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
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
  const proofPackIdempotencyKey = `workbench-proof-pack-${rebalanceRunId}`;
  const generatedProofPack = await postJson(
    summary,
    `${gatewayBaseUrl}/api/v1/dpm/command-center/proof-packs`,
    "Generate DPM proof-pack evidence",
    timeoutMs,
    {
      idempotency_key: proofPackIdempotencyKey,
      body: {
        source_type: "REBALANCE_RUN",
        rebalance_run_id: rebalanceRunId,
        mandate_id: readString(proofPackSourceReview?.mandate_id) ?? undefined,
        include_markdown: true,
        include_report_input: true,
        include_ai_evidence_input: true,
        actor_id: "workbench-proof-pack-operator",
        reason: "Workbench PM generated proof pack from Gateway-backed rebalance run.",
      },
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
  panelGovernance.recordPanelClassification("dpm.command_center", "ready", "lotus-manage", {
    route: `/workbench/${portfolioId}`,
    source: "Gateway DPM command-center summary",
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
  panelGovernance.assertNoUnsupportedBlankPanels();
  panelGovernance.assertPanelSupportabilityAlignment();

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
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validatePerformanceAnalysisPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateAdvisorBriefPanel(page, {
      summary,
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      timeoutMs,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
      performAcceptReviewActionProof: true,
    });
    await validateRiskPanel(page, {
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
      timeoutMs,
      assertTableHasRows: browserHelpers.assertTableHasRows,
      screenshotRegisteredPanel: browserHelpers.screenshotRegisteredPanel,
    });
    await validateEvidencePanel(page, {
      summary,
      workbenchBaseUrl,
      portfolioId,
      benchmarkCode,
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
