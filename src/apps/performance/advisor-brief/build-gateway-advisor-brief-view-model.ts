import type {
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";
import {
  classifyAiProviderPosture,
  createAiAssistanceDisclosure,
} from "@/design-system";

import { formatCurrency, formatDate } from "../formatters";
import { buildPerformanceHref } from "../navigation";
import type { PerformanceWorkspaceMode } from "../performance-workspace-modes";
import { getPerformanceBenchmarkLabel } from "../components/performance-summary-context-helpers";
import {
  buildAdvisorBriefHumanReview,
  getAdvisorBriefReviewStateLabel,
  isHistoricalAdvisorBriefReviewState,
  isTerminalAdvisorBriefReviewState,
} from "./advisor-brief-review-evidence";
import type {
  PerformanceAdvisorBriefAction,
  PerformanceAdvisorBriefItem,
  PerformanceAdvisorBriefMetric,
  PerformanceAdvisorBriefViewModel,
} from "./advisor-brief-view-model-types";

export function buildGatewayAdvisorBriefViewModel(
  advisorBrief: WorkbenchPerformanceAdvisorBrief,
  workspace: WorkbenchPerformanceWorkspace
): PerformanceAdvisorBriefViewModel {
  const selectedPerformance =
    advisorBrief.detail_basis === "GROSS"
      ? workspace.gross_performance
      : workspace.net_performance;
  const benchmarkLabel = getPerformanceBenchmarkLabel(
    advisorBrief.benchmark_code ?? workspace.benchmark_code ?? undefined,
    workspace.benchmark_options ?? []
  );
  const hasBackedRiskEvidence = hasReadyRiskEvidence(advisorBrief.source_metrics);
  return {
    status: advisorBrief.status,
    title: `Advisor Brief • ${advisorBrief.portfolio_id}`,
    summary: advisorBrief.summary,
    talkingPoints: normalizeGatewayNarrativeItems(advisorBrief.talking_points, hasBackedRiskEvidence),
    recommendedActions: normalizeGatewayActions(
      advisorBrief.recommended_actions,
      hasBackedRiskEvidence
    ),
    risksAndExceptions: normalizeGatewayNarrativeItems(
      advisorBrief.risks_and_exceptions,
      hasBackedRiskEvidence
    ),
    sourceMetrics: normalizeGatewaySourceMetrics({
      advisorBrief,
      workspace,
      benchmarkLabel,
      endingMarketValue: formatCurrency(
        selectedPerformance.end_market_value,
        workspace.portfolio.base_currency
      ),
      hasBackedRiskEvidence,
    }),
    supportability: normalizeGatewaySupportability(advisorBrief),
    supportDetails: buildGatewaySupportDetails(advisorBrief),
    reviewNotes: buildGatewayReviewNotes(advisorBrief),
    aiDisclosure: buildGatewayAiDisclosure(advisorBrief),
  };
}

function resolveAdvisorBriefSourceRefs(advisorBrief: WorkbenchPerformanceAdvisorBrief) {
  const aiEvidenceRefs = normalizeSourceRefs(advisorBrief.ai_evidence.source_refs ?? []);
  if (aiEvidenceRefs.length > 0) {
    return aiEvidenceRefs;
  }

  const aiAuditRefs = normalizeSourceRefs(advisorBrief.ai_audit.source_refs ?? []);
  if (aiAuditRefs.length > 0) {
    return aiAuditRefs;
  }

  return [];
}

function normalizeSourceRefs(sourceRefs: readonly unknown[]): string[] {
  return Array.from(
    new Set(
      sourceRefs
        .filter((sourceRef): sourceRef is string => typeof sourceRef === "string")
        .map((sourceRef) => sourceRef.trim())
        .filter((sourceRef) => sourceRef.length > 0)
    )
  );
}

function buildGatewayAiDisclosure(advisorBrief: WorkbenchPerformanceAdvisorBrief) {
  const sourceRefs = resolveAdvisorBriefSourceRefs(advisorBrief);
  const aiProvenanceSignals = [
    advisorBrief.ai_audit.task_id,
    advisorBrief.ai_audit.provider_id,
    advisorBrief.ai_audit.model_id,
    advisorBrief.workflow_pack_run?.run_id,
  ].filter((value) => typeof value === "string" && value.trim().length > 0);
  const hasPublishedAiProvenance = aiProvenanceSignals.length >= 2;
  const providerPosture = classifyAiProviderPosture(
    advisorBrief.ai_audit.provider_mode,
    advisorBrief.ai_audit.stubbed,
  );
  const isSimulation = providerPosture === "deterministic";
  const isLive = providerPosture === "live" && hasPublishedAiProvenance;
  const isSuperseded =
    advisorBrief.workflow_pack_run?.superseded === true ||
    isHistoricalAdvisorBriefReviewState(advisorBrief.workflow_pack_run?.review_state);
  const replacementRunId = advisorBrief.workflow_pack_run?.replacement_run_id?.trim();
  const workflowReviewState = advisorBrief.workflow_pack_run?.review_state;
  const humanReview = buildAdvisorBriefHumanReview(advisorBrief.workflow_pack_run);
  const terminalReviewWithoutEvidence =
    isTerminalAdvisorBriefReviewState(workflowReviewState) && !humanReview.sourceRecorded;
  const diagnostics = [
    advisorBrief.workflow_pack_run?.run_id
      ? { label: "Workflow run", value: advisorBrief.workflow_pack_run.run_id }
      : null,
    replacementRunId ? { label: "Replacement run", value: replacementRunId } : null,
    advisorBrief.ai_audit.generated_at
      ? { label: "Prepared", value: advisorBrief.ai_audit.generated_at }
      : null,
    advisorBrief.ai_audit.provider_id
      ? { label: "Execution provider", value: advisorBrief.ai_audit.provider_id }
      : null,
    advisorBrief.ai_audit.model_id
      ? { label: "Model", value: advisorBrief.ai_audit.model_id }
      : null,
    sourceRefs.length > 0
      ? { label: "Source references", value: String(sourceRefs.length) }
      : null,
    humanReview.actor ? { label: "Review recorded by", value: humanReview.actor } : null,
    humanReview.occurredAt
      ? { label: "Review recorded", value: humanReview.occurredAt }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const limitations = [
    ...advisorBrief.partial_failures.map((failure) => failure.detail),
    ...advisorBrief.warnings,
    ...(terminalReviewWithoutEvidence
      ? [
          "The source reports a terminal review state but did not publish a complete reviewer, event-time, and history record.",
        ]
      : []),
    ...(providerPosture === "untrusted"
      ? [
          "Generation provenance is missing, unsupported, or contradictory, so this output cannot be classified as live AI assistance.",
        ]
      : providerPosture === "live" && !hasPublishedAiProvenance
        ? [
            "The source did not publish enough provenance to classify this output as live AI assistance.",
          ]
        : []),
    ...(isSuperseded
      ? [
          replacementRunId
            ? `This output is historical. Review replacement run ${replacementRunId} before use.`
            : "This output is historical. The source did not publish a replacement run.",
        ]
      : []),
  ];

  return createAiAssistanceDisclosure({
    scopeLabel: "Performance advisor brief",
    preparation: isSimulation ? "deterministic" : isLive ? "ai-assisted" : "unavailable",
    availability:
      advisorBrief.status === "unavailable"
        ? "unavailable"
        : isSuperseded
          ? "stale"
          : isSimulation
            ? "simulation"
          : advisorBrief.status === "partial" || advisorBrief.partial_failures.length > 0
            ? "partial"
            : isLive
              ? "live"
              : "partial",
    evidence: {
      state: sourceRefs.length > 0 ? "supported" : "missing",
      sourceCount: sourceRefs.length,
    },
    humanReview,
    clientUse: "blocked",
    freshness: { state: "not-reported" },
    limitations,
    diagnostics,
  });
}

function normalizeGatewaySupportability(
  advisorBrief: WorkbenchPerformanceAdvisorBrief
): PerformanceAdvisorBriefViewModel["supportability"] {
  const normalizedItems = advisorBrief.supportability.map((item) => {
    if (item.label.trim().toLowerCase() === "advisor brief") {
      const normalizedValue =
        advisorBrief.status === "ready"
          ? "Ready"
          : advisorBrief.status === "partial"
            ? "Partial"
            : "Unavailable";

      return {
        label: item.label,
        value: normalizedValue,
        tone: normalizeSupportabilityTone(item.tone, normalizedValue),
      };
    }

    return {
      label: item.label,
      value: item.value,
      tone: normalizeSupportabilityTone(item.tone, item.value),
    };
  });

  if (!advisorBrief.workflow_pack_run) {
    return normalizedItems;
  }

  return [
    ...normalizedItems,
    {
      label: "Brief Preparation",
      value: normalizeWorkflowPackRuntimeValue(advisorBrief.workflow_pack_run.runtime_state),
      tone: normalizeWorkflowPackRuntimeTone(advisorBrief.workflow_pack_run.runtime_state),
      detail: buildWorkflowPackRunDetail(advisorBrief.workflow_pack_run),
    },
    {
      label: "Human Review",
      value: normalizeWorkflowPackReviewValue(advisorBrief.workflow_pack_run.review_state),
      tone: normalizeWorkflowPackReviewTone(advisorBrief.workflow_pack_run),
      detail: buildWorkflowPackReviewDetail(advisorBrief.workflow_pack_run),
    },
    ...(advisorBrief.workflow_pack_task_flow
      ? [
          {
            label: "Workflow Progress",
            value: normalizeTaskFlowStatusValue(advisorBrief.workflow_pack_task_flow.flow_status),
            tone: normalizeTaskFlowStatusTone(advisorBrief.workflow_pack_task_flow.flow_status),
            detail: buildTaskFlowDetail(advisorBrief.workflow_pack_task_flow),
          } satisfies PerformanceAdvisorBriefViewModel["supportability"][number],
        ]
      : []),
  ];
}

function buildGatewayReviewNotes(advisorBrief: WorkbenchPerformanceAdvisorBrief): string[] {
  const workflowPackRun = advisorBrief.workflow_pack_run;
  const workflowPackTaskFlow = advisorBrief.workflow_pack_task_flow;
  const workflowPackNotes = workflowPackRun
    ? [
        workflowPackRun.current_summary_note,
        ...workflowPackRun.findings.map((finding) => {
          const severityPrefix = finding.severity.replaceAll("_", " ");
          return `${severityPrefix}: ${finding.summary}`;
        }),
        workflowPackRun.replacement_run_id
          ? "A replacement brief is linked to this historical review record."
          : null,
      ]
    : [];
  const taskFlowNotes = workflowPackTaskFlow
    ? [
        `Workflow progress is ${normalizeTaskFlowStatusValue(
          workflowPackTaskFlow.flow_status
        ).toLowerCase()}.`,
        workflowPackTaskFlow.replacement_lineage.length > 0
          ? "Replacement lineage is available in support details."
          : null,
        workflowPackTaskFlow.handoff_refs.length > 0
          ? `${workflowPackTaskFlow.handoff_refs.length} downstream workflow handoff record(s) are available.`
          : null,
      ]
    : [];

  return Array.from(
    new Set(
      [
        ...advisorBrief.partial_failures.map((failure) => failure.detail),
        ...advisorBrief.warnings,
        ...workflowPackNotes,
        ...taskFlowNotes,
      ].filter((note): note is string => Boolean(note))
    )
  );
}

function buildGatewaySupportDetails(
  advisorBrief: WorkbenchPerformanceAdvisorBrief
): PerformanceAdvisorBriefViewModel["supportDetails"] {
  const workflowPackRun = advisorBrief.workflow_pack_run;
  const taskFlow = advisorBrief.workflow_pack_task_flow;

  return [
    workflowPackRun ? { label: "Brief run reference", value: workflowPackRun.run_id } : null,
    workflowPackRun
      ? { label: "Workflow authority", value: workflowPackRun.workflow_authority_owner }
      : null,
    workflowPackRun?.replacement_run_id
      ? { label: "Replacement brief reference", value: workflowPackRun.replacement_run_id }
      : null,
    taskFlow ? { label: "Task flow reference", value: taskFlow.task_flow_id } : null,
    taskFlow
      ? {
          label: "Workflow pack",
          value: `${taskFlow.workflow_pack_id}@${taskFlow.version}`,
        }
      : null,
    taskFlow?.current_step_id
      ? { label: "Current technical step", value: taskFlow.current_step_id }
      : null,
    ...(taskFlow?.replacement_lineage ?? []).map((lineage, index) => ({
      label: `Replacement lineage ${index + 1}`,
      value: `${lineage.superseded_run_id} → ${lineage.replacement_run_id}`,
    })),
    ...(taskFlow?.handoff_refs ?? []).map((handoff, index) => ({
      label: `Handoff ${index + 1}`,
      value: `${handoff.handoff_id} • ${handoff.owner_service} • ${handoff.status}`,
    })),
  ].filter((detail): detail is { label: string; value: string } => detail !== null);
}

function normalizeGatewaySourceMetrics({
  advisorBrief,
  workspace,
  benchmarkLabel,
  endingMarketValue,
  hasBackedRiskEvidence,
}: {
  advisorBrief: WorkbenchPerformanceAdvisorBrief;
  workspace: WorkbenchPerformanceWorkspace;
  benchmarkLabel: string;
  endingMarketValue: string;
  hasBackedRiskEvidence: boolean;
}): PerformanceAdvisorBriefMetric[] {
  const route = buildPerformanceHref({
    portfolioId: workspace.portfolio.portfolio_id,
    period: advisorBrief.period,
    detailBasis: advisorBrief.detail_basis,
    contributionDimension: advisorBrief.contribution_dimension,
    attributionDimension: advisorBrief.attribution_dimension,
    chartFrequency: advisorBrief.chart_frequency,
    benchmark: advisorBrief.benchmark_code ?? workspace.benchmark_code ?? undefined,
    reportStartDate: advisorBrief.report_start_date,
    reportEndDate: advisorBrief.report_end_date,
  });

  const normalizedMetrics = advisorBrief.source_metrics
    .filter((metric) => shouldIncludeAdvisorRiskTarget(metric.target_mode, hasBackedRiskEvidence))
    .map((metric) => {
      const isBenchmarkMetric = metric.label.toLowerCase() === "benchmark return";
      return {
        label: metric.label,
        value: metric.value,
        supportingText: isBenchmarkMetric ? benchmarkLabel : metric.support_label,
        route: metric.route,
        targetMode: normalizeAdvisorTargetMode(metric.target_mode),
      } satisfies PerformanceAdvisorBriefMetric;
    });

  if (normalizedMetrics.some((metric) => metric.label === "Ending MV")) {
    return normalizedMetrics;
  }

  return [
    ...normalizedMetrics,
    {
      label: "Ending MV",
      value: endingMarketValue,
      supportingText: formatDate(advisorBrief.as_of_date ?? workspace.as_of_date),
      route,
      targetMode: "summary",
    },
  ];
}

function normalizeGatewayNarrativeItems(
  items: WorkbenchPerformanceAdvisorBrief["talking_points"],
  hasBackedRiskEvidence: boolean
): PerformanceAdvisorBriefItem[] {
  return items.flatMap((item) => {
    const evidenceRefs = item.evidence_refs
      .filter((evidenceRef) =>
        shouldIncludeAdvisorRiskTarget(evidenceRef.target_mode, hasBackedRiskEvidence)
      )
      .map((evidenceRef) => ({
        metricLabel: evidenceRef.metric_label,
        metricValue: evidenceRef.metric_value,
        sourceSurface: evidenceRef.source_surface,
        route: evidenceRef.route,
        targetMode: normalizeAdvisorTargetMode(evidenceRef.target_mode),
      }));

    if (item.evidence_refs.length > 0 && evidenceRefs.length === 0) {
      return [];
    }

    return [
      {
        headline: item.headline,
        detail: item.detail,
        tone: item.tone,
        evidenceRefs,
      },
    ];
  });
}

function normalizeGatewayActions(
  actions: WorkbenchPerformanceAdvisorBrief["recommended_actions"],
  hasBackedRiskEvidence: boolean
): PerformanceAdvisorBriefAction[] {
  return actions
    .filter((action) => shouldIncludeAdvisorRiskTarget(action.target_mode, hasBackedRiskEvidence))
    .map((action) => ({
      label: action.label,
      route: action.route,
      targetMode: normalizeAdvisorTargetMode(action.target_mode),
    }));
}

function hasReadyRiskEvidence(
  sourceMetrics: WorkbenchPerformanceAdvisorBrief["source_metrics"]
): boolean {
  return sourceMetrics.some(
    (metric) =>
      normalizeAdvisorTargetMode(metric.target_mode) === "risk" &&
      (metric.state?.toLowerCase() ?? "") === "ready"
  );
}

function shouldIncludeAdvisorRiskTarget(
  targetMode: string,
  hasBackedRiskEvidence: boolean
): boolean {
  return normalizeAdvisorTargetMode(targetMode) !== "risk" || hasBackedRiskEvidence;
}

function normalizeSupportabilityTone(
  tone: string | null | undefined,
  value: string
): "success" | "warn" | "danger" {
  if (tone === "success" || tone === "warn" || tone === "danger") {
    return tone;
  }
  const loweredValue = value.trim().toLowerCase();
  if (loweredValue.includes("ready") || loweredValue.includes("live")) {
    return "success";
  }
  if (loweredValue.includes("partial") || loweredValue.includes("review")) {
    return "warn";
  }
  return "danger";
}

function normalizeWorkflowPackRuntimeValue(runtimeState: string): string {
  return runtimeState.replaceAll("_", " ");
}

function normalizeWorkflowPackReviewValue(reviewState: string): string {
  return getAdvisorBriefReviewStateLabel(reviewState);
}

function buildWorkflowPackRunDetail(
  workflowPackRun: NonNullable<WorkbenchPerformanceAdvisorBrief["workflow_pack_run"]>
): string {
  return workflowPackRun.review_pending
    ? "Preparation complete; human review remains required"
    : "Preparation record is available";
}

function buildWorkflowPackReviewDetail(
  workflowPackRun: NonNullable<WorkbenchPerformanceAdvisorBrief["workflow_pack_run"]>
): string {
  const detailParts = [
    `Supportability ${workflowPackRun.supportability_status.replaceAll("_", " ")}`,
  ];
  const reviewEvidence = buildAdvisorBriefHumanReview(workflowPackRun);
  if (reviewEvidence.sourceRecorded) {
    detailParts.push(`Recorded by ${reviewEvidence.actor}`, `Recorded ${reviewEvidence.occurredAt}`);
  } else if (isTerminalAdvisorBriefReviewState(workflowPackRun.review_state)) {
    detailParts.push("Review audit details not published");
  }
  if (workflowPackRun.superseded) {
    detailParts.push(
      workflowPackRun.replacement_run_id
        ? `Superseded by ${workflowPackRun.replacement_run_id}`
        : "Superseded"
    );
  }
  return detailParts.join(" • ");
}

function normalizeWorkflowPackRuntimeTone(
  runtimeState: string
): "success" | "warn" | "danger" {
  switch (runtimeState) {
    case "COMPLETED":
      return "success";
    case "FAILED":
    case "ABANDONED":
      return "danger";
    default:
      return "warn";
  }
}

function normalizeWorkflowPackReviewTone(
  workflowPackRun: NonNullable<WorkbenchPerformanceAdvisorBrief["workflow_pack_run"]>
): "success" | "warn" | "danger" {
  if (workflowPackRun.superseded) {
    return "warn";
  }
  if (
    workflowPackRun.review_state === "REJECTED" ||
    workflowPackRun.review_state === "ABANDONED" ||
    workflowPackRun.supportability_status === "FAILED"
  ) {
    return "danger";
  }
  if (
    workflowPackRun.review_state === "ACCEPTED" &&
    buildAdvisorBriefHumanReview(workflowPackRun).sourceRecorded
  ) {
    return "success";
  }
  return "warn";
}

function normalizeTaskFlowStatusValue(flowStatus: string): string {
  return flowStatus.replaceAll("_", " ");
}

function normalizeTaskFlowStatusTone(flowStatus: string): "success" | "warn" | "danger" {
  switch (flowStatus) {
    case "COMPLETED":
      return "success";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return "danger";
    default:
      return "warn";
  }
}

function buildTaskFlowDetail(
  taskFlow: NonNullable<WorkbenchPerformanceAdvisorBrief["workflow_pack_task_flow"]>
): string {
  const detailParts = [
    `Supportability ${normalizeTaskFlowStatusValue(taskFlow.supportability_status)}`,
  ];
  if (taskFlow.replacement_lineage.length > 0) {
    detailParts.push(`${taskFlow.replacement_lineage.length} replacement record(s)`);
  }
  if (taskFlow.handoff_refs.length > 0) {
    detailParts.push(`${taskFlow.handoff_refs.length} downstream handoff(s)`);
  }
  return detailParts.join(" • ");
}

function normalizeAdvisorTargetMode(targetMode: string): PerformanceWorkspaceMode {
  if (targetMode === "summary" || targetMode === "analysis" || targetMode === "advisor" || targetMode === "risk" || targetMode === "evidence") {
    return targetMode;
  }
  return "summary";
}
