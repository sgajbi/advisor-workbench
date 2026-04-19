import type {
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";

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
    audit: {
      taskId: advisorBrief.ai_audit.task_id ?? "explain.v1",
      outputLabel: advisorBrief.ai_audit.output_label ?? "EXPLANATION_ONLY",
      promptVersion: advisorBrief.ai_audit.prompt_version ?? "foundation.explain.v1",
      providerMode: advisorBrief.ai_audit.provider_mode ?? "unknown",
      providerId: advisorBrief.ai_audit.provider_id ?? null,
      adapterKind: advisorBrief.ai_audit.adapter_kind ?? null,
      modelId: advisorBrief.ai_audit.model_id ?? null,
      generatedAt:
        advisorBrief.ai_audit.generated_at ??
        advisorBrief.as_of_date ??
        workspace.as_of_date,
      stubbed: advisorBrief.ai_audit.stubbed ?? true,
      sourceRefs: resolveAdvisorBriefSourceRefs(advisorBrief),
    },
  };
}

function resolveAdvisorBriefSourceRefs(advisorBrief: WorkbenchPerformanceAdvisorBrief) {
  const workflowPackRunRef = advisorBrief.workflow_pack_run
    ? [`lotus-ai:workflow-pack-run:${advisorBrief.workflow_pack_run.run_id}`]
    : [];
  const aiEvidenceRefs = advisorBrief.ai_evidence.source_refs ?? [];
  if (aiEvidenceRefs.length > 0) {
    return Array.from(new Set([...aiEvidenceRefs, ...workflowPackRunRef]));
  }

  const aiAuditRefs = advisorBrief.ai_audit.source_refs ?? [];
  if (aiAuditRefs.length > 0) {
    return Array.from(new Set([...aiAuditRefs, ...workflowPackRunRef]));
  }

  return [
    ...workflowPackRunRef,
    `lotus-gateway:workbench:${advisorBrief.portfolio_id}:performance-advisor-brief:${advisorBrief.period}`,
  ];
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
      label: "AI Run",
      value: normalizeWorkflowPackRuntimeValue(advisorBrief.workflow_pack_run.runtime_state),
      tone: normalizeWorkflowPackRuntimeTone(advisorBrief.workflow_pack_run.runtime_state),
      detail: buildWorkflowPackRunDetail(advisorBrief.workflow_pack_run),
    },
    {
      label: "AI Review",
      value: normalizeWorkflowPackReviewValue(advisorBrief.workflow_pack_run.review_state),
      tone: normalizeWorkflowPackReviewTone(advisorBrief.workflow_pack_run),
      detail: buildWorkflowPackReviewDetail(advisorBrief.workflow_pack_run),
    },
  ];
}

function buildGatewayReviewNotes(advisorBrief: WorkbenchPerformanceAdvisorBrief): string[] {
  const workflowPackRun = advisorBrief.workflow_pack_run;
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

  return Array.from(
    new Set(
      [
        ...advisorBrief.partial_failures.map((failure) => failure.detail),
        ...advisorBrief.warnings,
        ...workflowPackNotes,
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
  const detailParts = [
    `Supportability ${normalizeWorkflowPackReviewValue(workflowPackRun.supportability_status)}`,
  ];
  if (workflowPackRun.superseded && workflowPackRun.replacement_run_id) {
    detailParts.push(`Superseded by ${workflowPackRun.replacement_run_id}`);
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

function normalizeAdvisorTargetMode(targetMode: string): PerformanceWorkspaceMode {
  if (targetMode === "summary" || targetMode === "analysis" || targetMode === "advisor" || targetMode === "risk" || targetMode === "evidence") {
    return targetMode;
  }
  return "summary";
}
