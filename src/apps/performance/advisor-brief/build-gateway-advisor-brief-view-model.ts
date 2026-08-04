import type {
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";
import { createAiAssistanceDisclosure } from "@/design-system";

import { formatCurrency, formatDate } from "../formatters";
import { buildPerformanceHref } from "../navigation";
import type { PerformanceWorkspaceMode } from "../performance-workspace-modes";
import { getPerformanceBenchmarkLabel } from "../components/performance-summary-context-helpers";
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
    reviewNotes: buildGatewayReviewNotes(advisorBrief),
    aiDisclosure: buildGatewayAiDisclosure(advisorBrief),
  };
}

function resolveAdvisorBriefSourceRefs(advisorBrief: WorkbenchPerformanceAdvisorBrief) {
  const aiEvidenceRefs = advisorBrief.ai_evidence.source_refs ?? [];
  if (aiEvidenceRefs.length > 0) {
    return Array.from(new Set(aiEvidenceRefs));
  }

  const aiAuditRefs = advisorBrief.ai_audit.source_refs ?? [];
  if (aiAuditRefs.length > 0) {
    return Array.from(new Set(aiAuditRefs));
  }

  return [];
}

function buildGatewayAiDisclosure(advisorBrief: WorkbenchPerformanceAdvisorBrief) {
  const sourceRefs = resolveAdvisorBriefSourceRefs(advisorBrief);
  const hasPublishedAiProvenance = Boolean(
    advisorBrief.ai_audit.task_id ||
      advisorBrief.ai_audit.provider_id ||
      advisorBrief.ai_audit.model_id ||
      advisorBrief.ai_audit.generated_at,
  );
  const isSimulation = advisorBrief.ai_audit.stubbed === true;
  const isLive = advisorBrief.ai_audit.stubbed === false && hasPublishedAiProvenance;
  const workflowReviewState = advisorBrief.workflow_pack_run?.review_state;
  const humanReview = mapWorkflowReviewState(workflowReviewState);
  const diagnostics = [
    advisorBrief.workflow_pack_run?.run_id
      ? { label: "Workflow run", value: advisorBrief.workflow_pack_run.run_id }
      : null,
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
  ].filter((item): item is { label: string; value: string } => item !== null);
  const limitations = [
    ...advisorBrief.partial_failures.map((failure) => failure.detail),
    ...advisorBrief.warnings,
    ...(humanReview.state === "reviewed"
      ? ["Reviewer identity and review time were not published with this response."]
      : []),
    ...(!hasPublishedAiProvenance
      ? ["The source did not publish enough provenance to classify this output as live AI assistance."]
      : []),
  ];

  return createAiAssistanceDisclosure({
    scopeLabel: "Performance advisor brief",
    preparation: hasPublishedAiProvenance || isSimulation ? "ai-assisted" : "unavailable",
    availability:
      advisorBrief.status === "unavailable"
        ? "unavailable"
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

function mapWorkflowReviewState(reviewState: string | undefined) {
  switch (reviewState) {
    case "ACCEPTED":
      return { state: "reviewed" as const, sourceRecorded: true };
    case "REJECTED":
    case "ABANDONED":
      return { state: "rejected" as const, sourceRecorded: true };
    case "AWAITING_REVIEW":
    case "REVIEW_REQUIRED":
    case "PENDING":
      return { state: "review-required" as const, sourceRecorded: false };
    default:
      return { state: "unavailable" as const, sourceRecorded: false };
  }
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
      label: "Generation Run",
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
          ? `Superseded by workflow-pack run ${workflowPackRun.replacement_run_id}.`
          : null,
      ]
    : [];
  const taskFlowNotes = workflowPackTaskFlow
    ? [
        `Task flow ${workflowPackTaskFlow.task_flow_id} is ${normalizeTaskFlowStatusValue(
          workflowPackTaskFlow.flow_status
        ).toLowerCase()}.`,
        workflowPackTaskFlow.current_step_id
          ? `Current task-flow step: ${workflowPackTaskFlow.current_step_id}.`
          : null,
        ...workflowPackTaskFlow.replacement_lineage.map(
          (lineage) =>
            `${lineage.review_action_ref}: task flow links ${lineage.superseded_run_id} to replacement run ${lineage.replacement_run_id}.`
        ),
        ...workflowPackTaskFlow.handoff_refs.map(
          (handoff) =>
            `Handoff ${handoff.handoff_id} is ${handoff.status.replaceAll("_", " ").toLowerCase()} for ${handoff.owner_service}.`
        ),
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
  return reviewState.replaceAll("_", " ");
}

function buildWorkflowPackRunDetail(
  workflowPackRun: NonNullable<WorkbenchPerformanceAdvisorBrief["workflow_pack_run"]>
): string {
  return [workflowPackRun.run_id, `Authority ${workflowPackRun.workflow_authority_owner}`].join(
    " • "
  );
}

function buildWorkflowPackReviewDetail(
  workflowPackRun: NonNullable<WorkbenchPerformanceAdvisorBrief["workflow_pack_run"]>
): string {
  const detailParts = [`Supportability ${normalizeWorkflowPackReviewValue(workflowPackRun.supportability_status)}`];
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
    workflowPackRun.review_state === "ACCEPTED" ||
    workflowPackRun.supportability_status === "READY"
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
    taskFlow.task_flow_id,
    `${taskFlow.workflow_pack_id}@${taskFlow.version}`,
    `Supportability ${normalizeTaskFlowStatusValue(taskFlow.supportability_status)}`,
  ];
  if (taskFlow.replacement_lineage.length > 0) {
    detailParts.push(`${taskFlow.replacement_lineage.length} lineage edge(s)`);
  }
  return detailParts.join(" • ");
}

function normalizeAdvisorTargetMode(targetMode: string): PerformanceWorkspaceMode {
  if (targetMode === "summary" || targetMode === "analysis" || targetMode === "advisor" || targetMode === "risk" || targetMode === "evidence") {
    return targetMode;
  }
  return "summary";
}
