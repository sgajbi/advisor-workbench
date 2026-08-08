import type { SemanticBadgeTone } from "@/design-system";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import {
  clampMandateHealthPercent,
  mandateHealthScoreToPercent,
} from "@/features/workbench/manage-mandate-health-helpers";
import { buildManageModeHref } from "@/features/workbench/manage-workspace-navigation";
import {
  businessLastReviewed,
  businessStateLabel,
  buildManageExceptionRows,
  filterManageExceptionRowsForMandate,
  firstNonEmpty,
  readStringFromResponse,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import { buildPortfolioMemoryPanelModel } from "@/features/workbench/portfolio-memory-view-model";

type CommandModel = ReturnType<typeof buildDpmCommandCenterPanelModel>;
type WaveModel = ReturnType<typeof buildDpmWaveCommandCenterModel>;
type ReviewModel = ReturnType<typeof buildOutcomeReviewPanelModel>;
export type ManageOverviewModel = ReturnType<typeof buildManageOverviewModel>;

export function buildManageOverviewModel(data: ManageWorkspaceData) {
  const portfolio = data.portfolio;
  const portfolioId = portfolio.portfolio.portfolio_id;
  const commandModel = buildDpmCommandCenterPanelModel({
    commandCenter: data.commandCenter,
    exceptions: data.commandCenterExceptions,
    mandate: data.mandate,
    mandateHealth: data.mandateHealth,
  });
  const waveModel = buildDpmWaveCommandCenterModel({ waveList: data.waves });
  const memoryModel = buildPortfolioMemoryPanelModel(data.portfolioMemory);
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const exceptionRows = filterManageExceptionRowsForMandate(
    buildManageExceptionRows(data.commandCenterExceptions),
    commandModel.mandateId
  );
  const activeExceptionCount = exceptionRows.length;
  const latestActivities = buildManageActivityRows(
    commandModel,
    waveModel,
    reviewModel,
    activeExceptionCount
  );
  const latestProofPackId = firstNonEmpty(
    reviewModel.items.find((item) => item.proofPackId !== "N/A")?.proofPackId,
    "N/A"
  );
  const pmQualityPolicyCount = data.pmOperatingQualityPolicies?.supportability.count ?? 0;
  const pmQualityScoreRunCount = data.pmOperatingQualityScoreRuns?.supportability.count ?? 0;
  const pmQualityFairnessAnalysisCount =
    data.pmOperatingQualityFairnessAnalyses?.supportability.count ?? 0;
  const blockedSurfaces = [
    data.commandCenterError || data.mandateHealthError || !data.mandateHealth
      ? "Mandate health"
      : null,
    data.wavesError ? "Rebalance waves" : null,
    data.portfolioMemoryError ? "Portfolio memory" : null,
    data.pmOperatingQualityPoliciesError || data.pmOperatingQualityScoreRunsError
      ? "PM operating quality"
      : null,
    data.outcomeReviewError ? "Outcome reviews" : null,
  ].filter((surface): surface is string => Boolean(surface));
  const mandateSourceState =
    commandModel.mandateHealthState !== "N/A"
      ? commandModel.mandateHealthState
      : commandModel.supportabilityState;
  const mandateTone = toneForState(mandateSourceState);
  const dataTone = toneForState(commandModel.dataCompletenessState);
  const rebalanceTone = toneForState(waveModel.selectedWaveState);
  const mandateScore = mandateHealthScoreToPercent(commandModel.mandateHealthScore);

  return {
    portfolioSummary: {
      portfolioId,
      currency: portfolio.portfolio.base_currency,
      marketValue: formatAmount(portfolio.overview.market_value_base),
      cashWeight: formatPct(portfolio.overview.cash_weight_pct),
      positionCount: portfolio.overview.position_count,
      riskProfile: readStringFromResponse(data.mandate, "risk_profile") ?? "Balanced",
    },
    postureCards: [
      {
        key: "mandate",
        label: "Mandate Health",
        value: businessStateLabel(mandateSourceState),
        icon: mandateTone === "success" ? "verified" : "pending",
        tone: mandateTone,
        progress:
          mandateScore === null ? null : clampMandateHealthPercent(mandateScore),
      },
      {
        key: "data",
        label: "Data Readiness",
        value: businessStateLabel(commandModel.dataCompletenessState),
        icon: dataTone === "success" ? "check_circle" : "pending",
        tone: dataTone === "danger" ? "danger" : dataTone === "success" ? "success" : "warn",
        progress: null,
      },
      {
        key: "rebalance",
        label: "Rebalance Status",
        value: businessStateLabel(waveModel.selectedWaveState),
        icon: rebalanceTone === "success" ? "check_circle" : "pending",
        tone:
          rebalanceTone === "danger" ? "danger" : rebalanceTone === "success" ? "success" : "warn",
        progress: null,
      },
      {
        key: "attention",
        label: "Active Attention Items",
        value: String(activeExceptionCount),
        icon: activeExceptionCount > 0 ? "warning" : "check_circle",
        tone: activeExceptionCount > 0 ? "warn" : "success",
        progress: null,
      },
    ] satisfies Array<{
      key: string;
      label: string;
      value: string;
      icon: string;
      tone: SemanticBadgeTone;
      progress: number | null;
    }>,
    exceptionRows,
    activeRebalance: {
      triggerType: waveModel.summaryRows[0]?.triggerType,
      state: waveModel.selectedWaveState,
      supportabilityState: waveModel.supportabilityState,
      issueCount: waveModel.selectedWaveIssueCount,
      supportabilityReason: waveModel.selectedWaveSupportabilityReason,
    },
    moduleItems: [
      {
        key: "mandate",
        title: "Mandate Health",
        icon: "health_and_safety",
        metric: `${activeExceptionCount} attention items`,
        href: buildManageModeHref(portfolioId, "mandate"),
      },
      {
        key: "waves",
        title: "Rebalance",
        icon: "refresh",
        metric: businessStateLabel(waveModel.selectedWaveState),
        href: buildManageModeHref(portfolioId, "waves"),
      },
      {
        key: "construction",
        title: "Construction",
        icon: "architecture",
        metric: "Alternatives available",
        href: buildManageModeHref(portfolioId, "construction"),
      },
      {
        key: "memory",
        title: "Portfolio Memory",
        icon: "memory",
        metric: `${memoryModel.eventCount} events`,
        href: buildManageModeHref(portfolioId, "memory"),
      },
      {
        key: "quality",
        title: "PM Operating Quality",
        icon: "manage_accounts",
        metric: `${
          pmQualityFairnessAnalysisCount || pmQualityScoreRunCount || pmQualityPolicyCount
        } evidence rows`,
        href: buildManageModeHref(portfolioId, "quality"),
      },
      {
        key: "reviews",
        title: "Outcome Reviews",
        icon: "rate_review",
        metric: `${reviewModel.items.length} reviews`,
        href: buildManageModeHref(portfolioId, "reviews"),
      },
      {
        key: "proof",
        title: "Evidence Pack",
        icon: "description",
        metric: latestProofPackId !== "N/A" ? "Evidence available" : "Not requested",
        href: buildManageModeHref(portfolioId, "proof"),
      },
    ],
    latestActivities,
    blockedSurfaces,
    overviewPostureLabel: blockedSurfaces.length ? "Needs attention" : "Evidence Available",
    overviewPostureTone: (blockedSurfaces.length ? "warn" : "success") as SemanticBadgeTone,
  };
}

function buildManageActivityRows(
  commandModel: CommandModel,
  waveModel: WaveModel,
  reviewModel: ReviewModel,
  activeExceptionCount: number
) {
  const rows = [
    commandModel.latestMonitoringRunId !== "N/A"
      ? {
          key: "monitoring",
          time: businessLastReviewed(commandModel.latestMonitoringRunStatus),
          event: `Daily mandate review completed with ${activeExceptionCount} attention items.`,
        }
      : null,
    waveModel.selectedWaveId
      ? {
          key: "wave",
          time: businessStateLabel(waveModel.selectedWaveState),
          event: `${waveModel.selectedWaveItemCount} proposed rebalance changes prepared for review.`,
        }
      : null,
    reviewModel.items[0]
      ? {
          key: "review",
          time: businessStateLabel(reviewModel.items[0].state),
          event: "Outcome review evidence available for advisor review.",
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return rows.length
    ? rows
    : [
        {
          key: "empty",
          time: "N/A",
          event: "No recent operating activity.",
        },
      ];
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}
