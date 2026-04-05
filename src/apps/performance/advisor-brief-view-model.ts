import type {
  ContributionPositionView,
  ContributionRowView,
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import type { PerformanceWorkspaceCapabilities } from "./capabilities";
import {
  formatCurrency,
  formatDate,
  formatPct,
  formatPerformancePositionLabel,
} from "./formatters";
import { buildPerformanceHref } from "./navigation";
import { getPerformanceBenchmarkLabel } from "./components/performance-summary-context-helpers";
import {
  getBottomContributionRows,
  getNegativePositionContributionRows,
  getTopAttributionEffectRows,
  getTopContributionRows,
  getTopPositionContributionRows,
  hasPositionContributionRanking,
} from "./view-model";
import type { PerformanceWorkspaceMode } from "./components/performance-workspace-mode-switch";

export type PerformanceAdvisorBriefStatus =
  | "ready"
  | "loading"
  | "partial"
  | "empty"
  | "unavailable";
export type PerformanceAdvisorBriefTone = "neutral" | "positive" | "warning";

export type PerformanceAdvisorBriefEvidenceRef = {
  metricLabel: string;
  metricValue: string;
  sourceSurface: string;
  route: string;
  targetMode: PerformanceWorkspaceMode;
};

export type PerformanceAdvisorBriefItem = {
  headline: string;
  detail: string;
  tone: PerformanceAdvisorBriefTone;
  evidenceRefs: PerformanceAdvisorBriefEvidenceRef[];
};

export type PerformanceAdvisorBriefAction = {
  label: string;
  route: string;
  targetMode: PerformanceWorkspaceMode;
};

export type PerformanceAdvisorBriefMetric = {
  label: string;
  value: string;
  supportingText: string;
  targetMode: PerformanceWorkspaceMode;
  route: string;
};

export type PerformanceAdvisorBriefSupportabilityItem = {
  label: string;
  value: string;
  tone: "success" | "warn" | "danger";
};

export type PerformanceAdvisorBriefAudit = {
  taskId: string;
  outputLabel: string;
  promptVersion: string;
  providerMode: string;
  providerId: string | null;
  adapterKind: string | null;
  modelId: string | null;
  generatedAt: string;
  stubbed: boolean;
  sourceRefs: string[];
};

export type PerformanceAdvisorBriefViewModel = {
  status: PerformanceAdvisorBriefStatus;
  title: string;
  summary: string;
  talkingPoints: PerformanceAdvisorBriefItem[];
  recommendedActions: PerformanceAdvisorBriefAction[];
  risksAndExceptions: PerformanceAdvisorBriefItem[];
  sourceMetrics: PerformanceAdvisorBriefMetric[];
  supportability: PerformanceAdvisorBriefSupportabilityItem[];
  audit: PerformanceAdvisorBriefAudit;
};

export function buildPerformanceAdvisorBriefViewModel({
  workspace,
  advisorBrief,
  advisorBriefUnavailable,
  capabilities,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  isDetailsPending,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  advisorBrief?: WorkbenchPerformanceAdvisorBrief | null;
  advisorBriefUnavailable?: boolean;
  capabilities: PerformanceWorkspaceCapabilities;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  isDetailsPending: boolean;
}): PerformanceAdvisorBriefViewModel {
  if (advisorBrief) {
    return buildGatewayAdvisorBriefViewModel(advisorBrief, workspace);
  }

  const selectedPerformance =
    detailBasis === "GROSS" ? workspace.gross_performance : workspace.net_performance;
  const benchmarkLabel = getPerformanceBenchmarkLabel(
    workspace.benchmark_code ?? benchmark,
    workspace.benchmark_options ?? []
  );
  const route = buildPerformanceHref({
    portfolioId: workspace.portfolio.portfolio_id,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark: workspace.benchmark_code ?? benchmark,
    reportStartDate: workspace.report_start_date,
    reportEndDate: workspace.report_end_date,
  });
  const topContributor = getPrimaryContributor(workspace);
  const topDetractor = getPrimaryDetractor(workspace);
  const topEffect = getTopAttributionEffectRows(workspace, 1)[0] ?? null;
  const activeReturnValue = formatPct(selectedPerformance.active_return_pct);
  const portfolioReturnValue = formatPct(selectedPerformance.portfolio_return_pct);
  const benchmarkReturnValue = formatPct(selectedPerformance.benchmark_return_pct);
  const currency = workspace.portfolio.base_currency;
  const talkingPoints = buildTalkingPoints({
    route,
    period,
    portfolioReturnValue,
    benchmarkReturnValue,
    activeReturnValue,
    topContributor,
    topDetractor,
    topEffectLabel: topEffect?.key_label,
    topEffectValue: topEffect ? formatPct(topEffect.total_effect_pct) : "N/A",
    hasBenchmark: selectedPerformance.benchmark_return_pct !== null,
    hasContribution:
      capabilities.contributionDetail.state !== "unavailable" && Boolean(topContributor),
    hasAttribution:
      capabilities.attributionDetail.state !== "unavailable" && Boolean(topEffect),
  });
  const status = resolveAdvisorBriefStatus({
    capabilities,
    advisorBriefUnavailable: advisorBriefUnavailable ?? false,
    isDetailsPending,
    hasTalkingPoints: talkingPoints.length > 0,
  });

  const supportability = [
    toSupportabilityItem("Portfolio", capabilities.summaryKpis),
    toSupportabilityItem("Return History", capabilities.returnPath),
    toSupportabilityItem("Contribution", capabilities.contributionDetail),
    toSupportabilityItem("Attribution", capabilities.attributionDetail),
    {
      label: "Advisor Brief",
      value:
        status === "ready"
          ? "Preview Ready"
          : status === "loading"
            ? "Generating"
          : status === "partial"
            ? "Preview Partial"
            : status === "empty"
              ? "No Material Brief"
            : "Unavailable",
      tone:
        status === "ready"
          ? "success"
          : status === "loading" || status === "partial"
            ? "warn"
            : "danger",
    } satisfies PerformanceAdvisorBriefSupportabilityItem,
  ];

  return {
    status,
    title: `Advisor Brief • ${workspace.portfolio.portfolio_id}`,
    summary: buildAdvisorSummaryCopy({
      status,
      period,
      activeReturnValue,
      topContributorLabel: topContributor?.label,
      topDetractorLabel: topDetractor?.label,
      attributionLabel: topEffect?.key_label,
    }),
    talkingPoints: status === "unavailable" ? [] : talkingPoints,
    recommendedActions: [
      {
        label: "Open Return Path",
        route,
        targetMode: "summary",
      },
      {
        label: "Review Contribution",
        route,
        targetMode: "analysis",
      },
      {
        label: "Inspect Attribution",
        route,
        targetMode: "analysis",
      },
    ],
    risksAndExceptions: buildRisksAndExceptions({
      capabilities,
      route,
      advisorBriefUnavailable: advisorBriefUnavailable ?? false,
      isDetailsPending,
    }),
    sourceMetrics: [
      {
        label: "Portfolio Return",
        value: portfolioReturnValue,
        supportingText: `${formatDate(workspace.report_start_date)} - ${formatDate(workspace.report_end_date)}`,
        targetMode: "summary",
        route,
      },
      {
        label: "Benchmark Return",
        value: benchmarkReturnValue,
        supportingText: benchmarkLabel,
        targetMode: "summary",
        route,
      },
      {
        label: "Active Return",
        value: activeReturnValue,
        supportingText: `${detailBasis} basis`,
        targetMode: "summary",
        route,
      },
      {
        label: "Net Flow",
        value: formatCurrency(selectedPerformance.net_cash_flow, currency),
        supportingText: `Closing MV ${formatCurrency(selectedPerformance.end_market_value, currency)}`,
        targetMode: "summary",
        route,
      },
      {
        label: "Ending MV",
        value: formatCurrency(selectedPerformance.end_market_value, currency),
        supportingText: formatDate(workspace.as_of_date),
        targetMode: "summary",
        route,
      },
    ],
    audit: {
      taskId: "explain.v1",
      outputLabel: "EXPLANATION_ONLY",
      promptVersion: "foundation.explain.v1",
      providerMode: "fixture-preview",
      providerId: "text.stub",
      adapterKind: "STUB",
      modelId: null,
      generatedAt: workspace.as_of_date,
      stubbed: true,
      sourceRefs: [
        `lotus-gateway:workbench:${workspace.portfolio.portfolio_id}:performance-summary:${period}`,
        `lotus-workbench:advisor-brief-fixture:${workspace.portfolio.portfolio_id}:${period}`,
      ],
    },
    supportability,
  };
}

function buildGatewayAdvisorBriefViewModel(
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
  return {
    status: advisorBrief.status,
    title: `Advisor Brief • ${advisorBrief.portfolio_id}`,
    summary: advisorBrief.summary,
    talkingPoints: advisorBrief.talking_points.map((item) => ({
      headline: item.headline,
      detail: item.detail,
      tone: item.tone,
      evidenceRefs: item.evidence_refs.map((evidenceRef) => ({
        metricLabel: evidenceRef.metric_label,
        metricValue: evidenceRef.metric_value,
        sourceSurface: evidenceRef.source_surface,
        route: evidenceRef.route,
        targetMode: normalizeAdvisorTargetMode(evidenceRef.target_mode),
      })),
    })),
    recommendedActions: advisorBrief.recommended_actions.map((action) => ({
      label: action.label,
      route: action.route,
      targetMode: normalizeAdvisorTargetMode(action.target_mode),
    })),
    risksAndExceptions: advisorBrief.risks_and_exceptions.map((item) => ({
      headline: item.headline,
      detail: item.detail,
      tone: item.tone,
      evidenceRefs: item.evidence_refs.map((evidenceRef) => ({
        metricLabel: evidenceRef.metric_label,
        metricValue: evidenceRef.metric_value,
        sourceSurface: evidenceRef.source_surface,
        route: evidenceRef.route,
        targetMode: normalizeAdvisorTargetMode(evidenceRef.target_mode),
      })),
    })),
    sourceMetrics: normalizeGatewaySourceMetrics({
      advisorBrief,
      workspace,
      benchmarkLabel,
      endingMarketValue: formatCurrency(
        selectedPerformance.end_market_value,
        workspace.portfolio.base_currency
      ),
    }),
    supportability: advisorBrief.supportability.map((item) => ({
      label: item.label,
      value: item.value,
      tone: normalizeSupportabilityTone(item.tone, item.value),
    })),
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
      sourceRefs:
        advisorBrief.ai_evidence.source_refs ??
        advisorBrief.ai_audit.source_refs ??
        [`lotus-gateway:workbench:${advisorBrief.portfolio_id}:performance-advisor-brief:${advisorBrief.period}`],
    },
  };
}

function normalizeGatewaySourceMetrics({
  advisorBrief,
  workspace,
  benchmarkLabel,
  endingMarketValue,
}: {
  advisorBrief: WorkbenchPerformanceAdvisorBrief;
  workspace: WorkbenchPerformanceWorkspace;
  benchmarkLabel: string;
  endingMarketValue: string;
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

  const normalizedMetrics = advisorBrief.source_metrics.map((metric) => {
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

function resolveAdvisorBriefStatus({
  capabilities,
  advisorBriefUnavailable,
  isDetailsPending,
  hasTalkingPoints,
}: {
  capabilities: PerformanceWorkspaceCapabilities;
  advisorBriefUnavailable: boolean;
  isDetailsPending: boolean;
  hasTalkingPoints: boolean;
}): PerformanceAdvisorBriefStatus {
  if (advisorBriefUnavailable || capabilities.summaryKpis.state === "unavailable") {
    return "unavailable";
  }
  if (isDetailsPending) {
    return "loading";
  }
  if (!hasTalkingPoints) {
    return "empty";
  }
  if (
    capabilities.returnPath.state === "partial" ||
    capabilities.benchmarkComparison.state === "partial" ||
    capabilities.contributionDetail.state === "partial" ||
    capabilities.attributionDetail.state === "partial" ||
    capabilities.contributionDetail.state === "unavailable" ||
    capabilities.attributionDetail.state === "unavailable"
  ) {
    return "partial";
  }
  return "ready";
}

function toSupportabilityItem(
  label: string,
  capability: WorkspaceCapability
): PerformanceAdvisorBriefSupportabilityItem {
  if (capability.state === "supported") {
    return {
      label,
      value: "Ready",
      tone: "success",
    };
  }
  if (capability.state === "partial") {
    return {
      label,
      value: "Partial",
      tone: "warn",
    };
  }
  return {
    label,
    value: "Unavailable",
    tone: "danger",
  };
}

function buildAdvisorSummaryCopy({
  status,
  period,
  activeReturnValue,
  topContributorLabel,
  topDetractorLabel,
  attributionLabel,
}: {
  status: PerformanceAdvisorBriefStatus;
  period: string;
  activeReturnValue: string;
  topContributorLabel?: string;
  topDetractorLabel?: string;
  attributionLabel?: string;
}) {
  if (status === "loading") {
    return `${period} source metrics are available and the detailed advisor narrative is being prepared from contribution and attribution evidence.`;
  }
  if (status === "empty") {
    return "No material talking points are available for the current selection. Review source metrics or switch benchmark and period controls.";
  }
  if (status === "unavailable") {
    return "Advisor brief preview is unavailable because the portfolio summary contract is not available.";
  }

  const driverCopy =
    topContributorLabel && topDetractorLabel
      ? `Top contribution came from ${topContributorLabel}; main drag came from ${topDetractorLabel}.`
      : topContributorLabel
        ? `Top contribution came from ${topContributorLabel}.`
        : "Contribution detail is still partial for this portfolio.";
  const attributionCopy = attributionLabel
    ? `Benchmark-relative attribution is led by ${attributionLabel}.`
    : "Attribution commentary is limited for this selection.";

  return `${period} active return is ${activeReturnValue}. ${driverCopy} ${attributionCopy}`;
}

function buildTalkingPoints({
  route,
  period,
  portfolioReturnValue,
  benchmarkReturnValue,
  activeReturnValue,
  topContributor,
  topDetractor,
  topEffectLabel,
  topEffectValue,
  hasBenchmark,
  hasContribution,
  hasAttribution,
}: {
  route: string;
  period: string;
  portfolioReturnValue: string;
  benchmarkReturnValue: string;
  activeReturnValue: string;
  topContributor: { label: string; value: string } | null;
  topDetractor: { label: string; value: string } | null;
  topEffectLabel?: string;
  topEffectValue: string;
  hasBenchmark: boolean;
  hasContribution: boolean;
  hasAttribution: boolean;
}): PerformanceAdvisorBriefItem[] {
  const points: PerformanceAdvisorBriefItem[] = [];

  if (portfolioReturnValue !== "N/A" || benchmarkReturnValue !== "N/A") {
    points.push({
      headline: hasBenchmark && benchmarkReturnValue !== "N/A"
        ? `Portfolio delivered ${portfolioReturnValue} versus benchmark ${benchmarkReturnValue}.`
        : `Portfolio delivered ${portfolioReturnValue} for ${period}.`,
      detail: hasBenchmark && activeReturnValue !== "N/A"
        ? `Active Return is ${activeReturnValue}; use Return Path to inspect the benchmark-relative gap.`
        : "Benchmark context is not assigned for this mandate; the brief stays portfolio-only until benchmark data is available.",
      tone:
        hasBenchmark && activeReturnValue.startsWith("-")
          ? "warning"
          : hasBenchmark
            ? "positive"
            : "neutral",
      evidenceRefs: [
        {
          metricLabel: "Active Return",
          metricValue: activeReturnValue,
          sourceSurface: "performance.return_path",
          route,
          targetMode: "summary",
        },
      ],
    });
  }

  if (hasContribution && topContributor) {
    points.push({
      headline: `Top contributor is ${topContributor.label}.`,
      detail: topDetractor
        ? `${topContributor.label} contributed ${topContributor.value}; ${topDetractor.label} was the main detractor at ${topDetractor.value}.`
        : `${topContributor.label} contributed ${topContributor.value}.`,
      tone: "neutral",
      evidenceRefs: [
        {
          metricLabel: "Top Contributor",
          metricValue: topContributor.value,
          sourceSurface: "performance.contribution",
          route,
          targetMode: "analysis",
        },
      ],
    });
  }

  if (hasAttribution && topEffectLabel) {
    points.push({
      headline: `Largest attribution effect is ${topEffectLabel}.`,
      detail: `${topEffectLabel} total effect is ${topEffectValue}; inspect Allocation, Selection, and Interaction in Attribution Detail.`,
      tone: "neutral",
      evidenceRefs: [
        {
          metricLabel: "Top Effect",
          metricValue: topEffectValue,
          sourceSurface: "performance.attribution",
          route,
          targetMode: "analysis",
        },
      ],
    });
  }

  return points;
}

function buildRisksAndExceptions({
  capabilities,
  route,
  advisorBriefUnavailable,
  isDetailsPending,
}: {
  capabilities: PerformanceWorkspaceCapabilities;
  route: string;
  advisorBriefUnavailable: boolean;
  isDetailsPending: boolean;
}): PerformanceAdvisorBriefItem[] {
  const risks: PerformanceAdvisorBriefItem[] = [];
  if (advisorBriefUnavailable) {
    return [
      {
        headline: "Advisor brief generation is unavailable.",
        detail:
          "Source metrics remain available in Summary and Analysis, but the Gateway advisor brief contract could not be loaded.",
        tone: "warning",
        evidenceRefs: [
          {
            metricLabel: "Advisor Brief",
            metricValue: "Unavailable",
            sourceSurface: "performance.advisor_brief",
            route,
            targetMode: "summary",
          },
        ],
      },
    ];
  }

  if (isDetailsPending) {
    risks.push({
      headline: "Analysis details are still loading.",
      detail: "Summary metrics are available, but contribution and attribution evidence may update once deferred analytics finish loading.",
      tone: "warning",
      evidenceRefs: [
        {
          metricLabel: "Analysis Status",
          metricValue: "Loading",
          sourceSurface: "performance.workspace",
          route,
          targetMode: "analysis",
        },
      ],
    });
  }

  const capabilityRisks: Array<{
    capability: WorkspaceCapability;
    headline: string;
    metricLabel: string;
    targetMode: PerformanceWorkspaceMode;
    sourceSurface: string;
  }> = [
    {
      capability: capabilities.benchmarkComparison,
      headline: "Benchmark comparison is incomplete.",
      metricLabel: "Benchmark",
      targetMode: "summary",
      sourceSurface: "performance.return_path",
    },
    {
      capability: capabilities.contributionDetail,
      headline: "Contribution detail is partial.",
      metricLabel: "Contribution",
      targetMode: "analysis",
      sourceSurface: "performance.contribution",
    },
    {
      capability: capabilities.attributionDetail,
      headline: "Attribution detail is partial.",
      metricLabel: "Attribution",
      targetMode: "analysis",
      sourceSurface: "performance.attribution",
    },
  ];

  for (const item of capabilityRisks) {
    if (item.capability.state === "supported") {
      continue;
    }
    risks.push({
      headline: item.capability.state === "unavailable"
        ? item.headline.replace("partial", "unavailable")
        : item.headline,
      detail: item.capability.reason ?? "Source coverage is limited for this selection.",
      tone: "warning",
      evidenceRefs: [
        {
          metricLabel: item.metricLabel,
          metricValue:
            item.capability.state === "partial" ? "Partial" : "Unavailable",
          sourceSurface: item.sourceSurface,
          route,
          targetMode: item.targetMode,
        },
      ],
    });
  }

  return risks;
}

function normalizeAdvisorTargetMode(targetMode: string): PerformanceWorkspaceMode {
  return targetMode === "analysis"
    ? "analysis"
    : targetMode === "advisor"
      ? "advisor"
      : targetMode === "evidence"
        ? "evidence"
        : "summary";
}

function normalizeSupportabilityTone(
  tone: string | undefined,
  value: string
): PerformanceAdvisorBriefSupportabilityItem["tone"] {
  if (tone === "success" || tone === "warn" || tone === "danger") {
    return tone;
  }
  const normalizedValue = value.toLowerCase();
  if (normalizedValue.includes("ready")) {
    return "success";
  }
  if (normalizedValue.includes("partial") || normalizedValue.includes("loading")) {
    return "warn";
  }
  return "danger";
}

function getPrimaryContributor(workspace: WorkbenchPerformanceWorkspace) {
  const row = hasPositionContributionRanking(workspace)
    ? getTopPositionContributionRows(workspace, 1)[0]
    : getTopContributionRows(workspace, 1)[0];

  return toContributionSummary(row);
}

function getPrimaryDetractor(workspace: WorkbenchPerformanceWorkspace) {
  const row = hasPositionContributionRanking(workspace)
    ? getNegativePositionContributionRows(workspace, 1)[0]
    : getBottomContributionRows(workspace)
        .filter((contributionRow) => contributionRow.contribution_pct < 0)
        .slice(0, 1)[0];

  return toContributionSummary(row);
}

function toContributionSummary(
  row: ContributionPositionView | ContributionRowView | undefined
) {
  if (!row) {
    return null;
  }

  return {
    label:
      "position_id" in row
        ? formatPerformancePositionLabel(row.position_id)
        : row.key_label,
    value: formatPct(row.contribution_pct),
  };
}
