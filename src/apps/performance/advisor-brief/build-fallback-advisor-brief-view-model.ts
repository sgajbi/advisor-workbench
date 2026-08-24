import type {
  ContributionPositionView,
  ContributionRowView,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { createAiAssistanceDisclosure } from "@/design-system";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import {
  formatCurrency,
  formatDate,
  formatPct,
  formatPerformancePositionLabel,
} from "../formatters";
import { buildPerformanceHref } from "../navigation";
import {
  getPerformanceFeeBasisLabel,
  PERFORMANCE_ACTION_LABELS,
  PERFORMANCE_ECONOMICS_LABELS,
  PERFORMANCE_RETURN_LABELS,
  PERFORMANCE_WORKFLOW_LABELS,
} from "../performance-terminology";
import type { PerformanceWorkspaceMode } from "../performance-workspace-modes";
import { getPerformanceBenchmarkLabel } from "../components/performance-summary-context-helpers";
import {
  getBottomContributionRows,
  getNegativePositionContributionRows,
  getTopAttributionEffectRows,
  getTopContributionRows,
  getTopPositionContributionRows,
  hasPositionContributionRanking,
} from "../view-model";
import type {
  PerformanceAdvisorBriefItem,
  PerformanceAdvisorBriefMetric,
  PerformanceAdvisorBriefStatus,
  PerformanceAdvisorBriefSupportabilityItem,
  PerformanceAdvisorBriefViewModel,
} from "./advisor-brief-view-model-types";

export function buildFallbackAdvisorBriefViewModel({
  workspace,
  advisorBriefUnavailable,
  advisorBriefPermissionBlocked,
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
  advisorBriefUnavailable: boolean;
  advisorBriefPermissionBlocked?: boolean;
  capabilities: PerformanceWorkspaceCapabilities;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  isDetailsPending: boolean;
}): PerformanceAdvisorBriefViewModel {
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
    advisorBriefUnavailable,
    advisorBriefPermissionBlocked: advisorBriefPermissionBlocked ?? false,
    isDetailsPending,
    hasTalkingPoints: talkingPoints.length > 0,
  });
  const supportability = [
    toSupportabilityItem("Portfolio", capabilities.summaryKpis),
    toSupportabilityItem("Return History", capabilities.returnPath),
    toSupportabilityItem("Contribution", capabilities.contributionDetail),
    toSupportabilityItem("Attribution", capabilities.attributionDetail),
    {
      label: PERFORMANCE_WORKFLOW_LABELS.adviserBrief,
      value:
        status === "ready"
          ? "Preview ready"
          : status === "loading"
            ? "Generating"
            : status === "partial"
              ? "Preview partial"
              : status === "empty"
                ? "No material brief"
                : status === "permission_blocked"
                  ? "Access restricted"
                : "Unavailable",
      tone:
        status === "ready"
          ? "success"
          : status === "loading" || status === "partial"
            ? "warn"
            : "danger",
      ...(advisorBriefPermissionBlocked
        ? {
            detail:
              "The Gateway advisor brief contract returned a caller-context permission block.",
          }
        : {}),
    } satisfies PerformanceAdvisorBriefSupportabilityItem,
  ];
  const sourceMetrics: PerformanceAdvisorBriefMetric[] = [
    {
      label: PERFORMANCE_RETURN_LABELS.portfolioTwr,
      value: portfolioReturnValue,
      supportingText: `${formatDate(workspace.report_start_date)} - ${formatDate(workspace.report_end_date)}`,
      targetMode: "summary",
      route,
    },
    {
      label: PERFORMANCE_RETURN_LABELS.benchmarkTwr,
      value: benchmarkReturnValue,
      supportingText: benchmarkLabel,
      targetMode: "summary",
      route,
    },
    {
      label: PERFORMANCE_RETURN_LABELS.activeReturn,
      value: activeReturnValue,
      supportingText: getPerformanceFeeBasisLabel(detailBasis),
      targetMode: "summary",
      route,
    },
    {
      label: PERFORMANCE_ECONOMICS_LABELS.netCashFlow,
      value: formatCurrency(selectedPerformance.net_cash_flow, currency),
      supportingText: `${PERFORMANCE_ECONOMICS_LABELS.endingMarketValue} ${formatCurrency(
        selectedPerformance.end_market_value,
        currency
      )}`,
      targetMode: "summary",
      route,
    },
    {
      label: PERFORMANCE_ECONOMICS_LABELS.endingMarketValue,
      value: formatCurrency(selectedPerformance.end_market_value, currency),
      supportingText: formatDate(workspace.as_of_date),
      targetMode: "summary",
      route,
    },
  ];
  const usableSourceCount =
    status === "empty" || status === "unavailable" || status === "permission_blocked"
      ? 0
      : sourceMetrics.filter(hasUsableMetricValue).length;
  const evidenceState =
    usableSourceCount === 0
      ? "missing"
      : usableSourceCount === sourceMetrics.length
        ? "supported"
        : "limited";

  return {
    status,
    title: `${PERFORMANCE_WORKFLOW_LABELS.adviserBrief} • ${workspace.portfolio.portfolio_id}`,
    summary: buildAdvisorSummaryCopy({
      status,
      period,
      activeReturnValue,
      topContributorLabel: topContributor?.label,
      topDetractorLabel: topDetractor?.label,
      attributionLabel: topEffect?.key_label,
    }),
    talkingPoints:
      status === "unavailable" || status === "permission_blocked" ? [] : talkingPoints,
    recommendedActions: [
      {
        label: PERFORMANCE_ACTION_LABELS.openReturnPath,
        route,
        targetMode: "summary",
      },
      {
        label: PERFORMANCE_ACTION_LABELS.reviewContribution,
        route,
        targetMode: "analysis",
      },
      {
        label: PERFORMANCE_ACTION_LABELS.inspectAttribution,
        route,
        targetMode: "analysis",
      },
    ],
    risksAndExceptions: buildRisksAndExceptions({
      capabilities,
      route,
      advisorBriefUnavailable,
      advisorBriefPermissionBlocked: advisorBriefPermissionBlocked ?? false,
      isDetailsPending,
    }),
    sourceMetrics,
    supportDetails: [],
    reviewNotes: buildReviewNotes({
      capabilities,
      advisorBriefUnavailable,
      advisorBriefPermissionBlocked: advisorBriefPermissionBlocked ?? false,
      isDetailsPending,
    }),
    aiDisclosure: createAiAssistanceDisclosure({
      scopeLabel: "Performance working narrative",
      preparation:
        status === "unavailable" || status === "permission_blocked"
          ? "unavailable"
          : "deterministic",
      availability:
        status === "ready"
          ? "live"
          : status === "partial" || status === "loading"
            ? "partial"
            : "unavailable",
      evidence: {
        state: evidenceState,
        sourceCount: usableSourceCount,
      },
      humanReview: {
        state:
          status === "unavailable" || status === "permission_blocked"
            ? "unavailable"
            : "review-required",
        sourceRecorded: false,
      },
      clientUse: status === "unavailable" ? "blocked" : "internal-only",
      freshness: { state: "not-reported" },
      limitations: [
        "This working narrative is assembled from defined Workbench rules, not a source-published AI run.",
        "Review the cited performance evidence before using the narrative in client communication.",
      ],
      diagnostics: [
        { label: "Data as of", value: workspace.as_of_date },
        { label: "Reporting period", value: period },
      ],
    }),
    supportability,
  };
}

function hasUsableMetricValue(metric: PerformanceAdvisorBriefMetric): boolean {
  const normalizedValue = metric.value.trim().toLowerCase();
  return normalizedValue.length > 0 && normalizedValue !== "n/a";
}

function buildReviewNotes({
  capabilities,
  advisorBriefUnavailable,
  advisorBriefPermissionBlocked,
  isDetailsPending,
}: {
  capabilities: PerformanceWorkspaceCapabilities;
  advisorBriefUnavailable: boolean;
  advisorBriefPermissionBlocked: boolean;
  isDetailsPending: boolean;
}) {
  const notes: string[] = [];

  if (advisorBriefPermissionBlocked) {
    notes.push(
      "Gateway advisor brief contract is permission-blocked for this caller context; restricted entitlement details are not shown."
    );
  }

  if (advisorBriefUnavailable) {
    notes.push("Gateway advisor brief contract unavailable; review summary and analysis directly.");
  }

  if (isDetailsPending) {
    notes.push("Deferred analytics are still loading; contribution and attribution evidence may update.");
  }

  const capabilityNotes = [
    capabilities.benchmarkComparison.reason,
    capabilities.contributionDetail.reason,
    capabilities.attributionDetail.reason,
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set([...notes, ...capabilityNotes]));
}

function resolveAdvisorBriefStatus({
  capabilities,
  advisorBriefUnavailable,
  advisorBriefPermissionBlocked,
  isDetailsPending,
  hasTalkingPoints,
}: {
  capabilities: PerformanceWorkspaceCapabilities;
  advisorBriefUnavailable: boolean;
  advisorBriefPermissionBlocked: boolean;
  isDetailsPending: boolean;
  hasTalkingPoints: boolean;
}): PerformanceAdvisorBriefStatus {
  if (advisorBriefPermissionBlocked) {
    return "permission_blocked";
  }
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
    return { label, value: "Ready", tone: "success" };
  }
  if (capability.state === "partial") {
    return { label, value: "Partial", tone: "warn" };
  }
  return { label, value: "Unavailable", tone: "danger" };
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
    return "Adviser brief preview is unavailable because the portfolio summary contract is not available.";
  }
  if (status === "permission_blocked") {
    return "Adviser brief access is restricted for this caller context. Summary and analysis remain available when their source contracts are entitled.";
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
        ? `Active return is ${activeReturnValue}; use the return path to inspect the benchmark-relative gap.`
        : "Benchmark context is not assigned for this mandate; the brief stays portfolio-only until benchmark data is available.",
      tone:
        hasBenchmark && activeReturnValue.startsWith("-")
          ? "warning"
          : hasBenchmark
            ? "positive"
            : "neutral",
      evidenceRefs: [
        {
          metricLabel: PERFORMANCE_RETURN_LABELS.activeReturn,
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
  advisorBriefPermissionBlocked,
  isDetailsPending,
}: {
  capabilities: PerformanceWorkspaceCapabilities;
  route: string;
  advisorBriefUnavailable: boolean;
  advisorBriefPermissionBlocked: boolean;
  isDetailsPending: boolean;
}): PerformanceAdvisorBriefItem[] {
  const risks: PerformanceAdvisorBriefItem[] = [];
  if (advisorBriefPermissionBlocked) {
    return [
      {
        headline: "Adviser brief access is restricted.",
        detail:
          "The Gateway advisor brief contract returned a permission block for this caller context. Use an entitled front-office role or contact platform support.",
        tone: "warning",
        evidenceRefs: [
          {
            metricLabel: PERFORMANCE_WORKFLOW_LABELS.adviserBrief,
            metricValue: "Permission Blocked",
            sourceSurface: "performance.advisor_brief",
            route,
            targetMode: "summary",
          },
        ],
      },
    ];
  }
  if (advisorBriefUnavailable) {
    return [
      {
        headline: "Adviser brief generation is unavailable.",
        detail:
          "Source metrics remain available in Summary and Analysis, but the Gateway advisor brief contract could not be loaded.",
        tone: "warning",
        evidenceRefs: [
          {
            metricLabel: PERFORMANCE_WORKFLOW_LABELS.adviserBrief,
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
          metricValue: item.capability.state === "partial" ? "Partial" : "Unavailable",
          sourceSurface: item.sourceSurface,
          route,
          targetMode: item.targetMode,
        },
      ],
    });
  }

  return risks;
}

function getPrimaryContributor(
  workspace: WorkbenchPerformanceWorkspace
): { label: string; value: string } | null {
  if (hasPositionContributionRanking(workspace)) {
    const topPosition = getTopPositionContributionRows(workspace, 1)[0] as
      | ContributionPositionView
      | undefined;
    if (topPosition) {
      return {
        label: formatPerformancePositionLabel(topPosition.position_id),
        value: formatPct(topPosition.contribution_pct),
      };
    }
  }

  const topContribution = getTopContributionRows(workspace, 1)[0] as ContributionRowView | undefined;
  if (!topContribution) {
    return null;
  }

  return {
    label: topContribution.key_label,
    value: formatPct(topContribution.contribution_pct),
  };
}

function getPrimaryDetractor(
  workspace: WorkbenchPerformanceWorkspace
): { label: string; value: string } | null {
  if (hasPositionContributionRanking(workspace)) {
    const negativePositions = getNegativePositionContributionRows(workspace, 1);
    const bottomPosition = negativePositions[0] as ContributionPositionView | undefined;
    if (bottomPosition) {
      return {
        label: formatPerformancePositionLabel(bottomPosition.position_id),
        value: formatPct(bottomPosition.contribution_pct),
      };
    }
  }

  const bottomContribution = getBottomContributionRows(workspace, 1)[0] as ContributionRowView | undefined;
  if (!bottomContribution) {
    return null;
  }

  return {
    label: bottomContribution.key_label,
    value: formatPct(bottomContribution.contribution_pct),
  };
}
