import type { SemanticBadgeTone } from "@/design-system";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
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
  isBusinessValueAvailable,
  isManageExceptionEvidenceComplete,
  readStringFromResponse,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import { buildPortfolioMemoryPanelModel } from "@/features/workbench/portfolio-memory-view-model";

type CommandModel = ReturnType<typeof buildDpmCommandCenterPanelModel>;
type ReviewModel = ReturnType<typeof buildOutcomeReviewPanelModel>;
type PortfolioWaveOverview = ReturnType<typeof buildPortfolioWaveOverview>;
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
  const portfolioWave = buildPortfolioWaveOverview(data.waves, portfolioId);
  const memoryModel = buildPortfolioMemoryPanelModel(data.portfolioMemory);
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const exceptionRows = filterManageExceptionRowsForMandate(
    buildManageExceptionRows(data.commandCenterExceptions),
    commandModel.mandateId
  );
  const hasCompleteExceptionEvidence = isManageExceptionEvidenceComplete(data);
  const activeExceptionCount = hasCompleteExceptionEvidence ? exceptionRows.length : null;
  const latestActivities = buildManageActivityRows(
    commandModel,
    portfolioWave,
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
  const riskProfile = readStringFromResponse(data.mandate, "risk_profile");
  const hasRiskProfile = isBusinessValueAvailable(riskProfile);
  const blockedSurfaces = [
    data.commandCenterError ||
    data.mandateHealthError ||
    !data.mandateHealth
      ? "Mandate health"
      : null,
    hasRiskProfile ? null : "Mandate risk profile",
    !hasCompleteExceptionEvidence ? "Mandate attention items" : null,
    data.wavesError ? "Rebalance waves" : null,
    data.portfolioMemoryError ? "Portfolio memory" : null,
    data.pmOperatingQualityPoliciesError || data.pmOperatingQualityScoreRunsError
      ? "PM operating quality"
      : null,
    data.outcomeReviewError ? "Outcome reviews" : null,
  ].filter((surface): surface is string => Boolean(surface));
  const mandateHealthState = commandModel.mandateHealthState;
  const mandateTone = toneForState(mandateHealthState);
  const dataTone = toneForState(commandModel.dataCompletenessState);
  const rebalanceTone = toneForState(portfolioWave.state);
  const mandateScore = mandateHealthScoreToPercent(commandModel.mandateHealthScore);
  const hasActiveAttention = activeExceptionCount !== null && activeExceptionCount > 0;

  return {
    portfolioSummary: {
      portfolioId,
      currency: portfolio.portfolio.base_currency,
      marketValue: formatAmount(portfolio.overview.market_value_base),
      cashWeight: formatPct(portfolio.overview.cash_weight_pct),
      positionCount: portfolio.overview.position_count,
      riskProfile: hasRiskProfile ? businessStateLabel(riskProfile) : "Not reported",
    },
    postureCards: [
      {
        key: "mandate",
        label: "Mandate Health",
        value: businessStateLabel(mandateHealthState),
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
        value: businessStateLabel(portfolioWave.state),
        icon: rebalanceTone === "success" ? "check_circle" : "pending",
        tone:
          rebalanceTone === "danger" ? "danger" : rebalanceTone === "success" ? "success" : "warn",
        progress: null,
      },
      {
        key: "attention",
        label: "Active Attention Items",
        value: activeExceptionCount === null ? "Not available" : String(activeExceptionCount),
        icon: activeExceptionCount === 0 ? "check_circle" : "warning",
        tone: activeExceptionCount === 0 ? "success" : "warn",
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
    hasCompleteExceptionEvidence,
    activeRebalance: {
      triggerType: portfolioWave.triggerType,
      state: portfolioWave.state,
      supportabilityState: portfolioWave.supportabilityState,
      issueCount: portfolioWave.issueCount,
      supportabilityReason: portfolioWave.supportabilityReason,
    },
    moduleItems: [
      {
        key: "mandate",
        title: "Mandate Health",
        description: "Review mandate evidence and resolve open attention items.",
        metric:
          activeExceptionCount === null
            ? "Attention evidence unavailable"
            : `${activeExceptionCount} attention items`,
        href: buildManageModeHref(portfolioId, "mandate"),
        actionLabel: "Open mandate health",
      },
      {
        key: "waves",
        title: "Rebalance Waves",
        description: "Review proposed changes, readiness, and source-reported issues.",
        metric: businessStateLabel(portfolioWave.state),
        href: buildManageModeHref(portfolioId, "waves"),
        actionLabel: "Open rebalance waves",
      },
      {
        key: "construction",
        title: "Construction Alternatives",
        description: "Generate and compare supported portfolio alternatives on demand.",
        metric: "Generated on request",
        href: buildManageModeHref(portfolioId, "construction"),
        actionLabel: "Open construction",
      },
      {
        key: "memory",
        title: "Portfolio Memory",
        description: "Review source-owned decisions and portfolio operating events.",
        metric: `${memoryModel.eventCount} events`,
        href: buildManageModeHref(portfolioId, "memory"),
        actionLabel: "Open portfolio memory",
      },
      {
        key: "quality",
        title: "PM Operating Quality",
        description: "Review governance, score-run, and fairness-analysis evidence.",
        metric: formatEvidenceRecordCount(
          pmQualityFairnessAnalysisCount || pmQualityScoreRunCount || pmQualityPolicyCount
        ),
        href: buildManageModeHref(portfolioId, "quality"),
        actionLabel: "Open operating quality",
      },
      {
        key: "reviews",
        title: "Outcome Reviews",
        description: "Assess post-decision outcomes and required follow-up.",
        metric: formatRecordCount(reviewModel.items.length, "review", "reviews"),
        href: buildManageModeHref(portfolioId, "reviews"),
        actionLabel: "Open outcome reviews",
      },
      {
        key: "proof",
        title: "Evidence Pack",
        description: "Inspect governed evidence and downstream handoff posture.",
        metric: latestProofPackId !== "N/A" ? "Evidence available" : "Not requested",
        href: buildManageModeHref(portfolioId, "proof"),
        actionLabel: "Open evidence pack",
      },
    ],
    latestActivities,
    blockedSurfaces,
    overviewPostureLabel: blockedSurfaces.length
      ? "Evidence incomplete"
      : hasActiveAttention
        ? "Action required"
        : "Ready for review",
    overviewPostureTone: (blockedSurfaces.length || hasActiveAttention
      ? "warn"
      : "success") as SemanticBadgeTone,
  };
}

function buildManageActivityRows(
  commandModel: CommandModel,
  portfolioWave: PortfolioWaveOverview,
  reviewModel: ReviewModel,
  activeExceptionCount: number | null
) {
  const rows = [
    commandModel.latestMonitoringRunId !== "N/A"
      ? {
          key: "monitoring",
          time: businessLastReviewed(commandModel.latestMonitoringRunStatus),
          event:
            activeExceptionCount === null
              ? "Daily mandate review completed; attention-item evidence is unavailable."
              : `Daily mandate review completed with ${activeExceptionCount} attention items.`,
        }
      : null,
    portfolioWave.waveId
      ? {
          key: "wave",
          time: businessStateLabel(portfolioWave.state),
          event: `${portfolioWave.itemCount} proposed rebalance changes prepared for review.`,
        }
      : null,
    reviewModel.items[0]
      ? {
          key: "review",
          time: businessStateLabel(reviewModel.items[0].state),
          event: "Outcome review evidence available for portfolio-manager review.",
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

function formatEvidenceRecordCount(count: number): string {
  return `${count} evidence ${count === 1 ? "record" : "records"}`;
}

function buildPortfolioWaveOverview(response: unknown, portfolioId: string) {
  const responseRecord = asRecord(response);
  const data = asRecord(responseRecord?.data);
  const responseSupportability = asRecord(responseRecord?.supportability);
  const items = readRecordArray(data?.items);
  const wave = items.find((item) => waveIncludesPortfolio(item, portfolioId));

  if (!wave) {
    return {
      waveId: null,
      state: "N/A",
      triggerType: null,
      itemCount: "N/A",
      issueCount: "N/A",
      supportabilityState: "N/A",
      supportabilityReason: "SELECTED_PORTFOLIO_WAVE_NOT_CONFIRMED",
    };
  }

  const aggregateMetrics = asRecord(wave.aggregate_metrics);
  const waveId = readRecordString(wave, "wave_id");
  const matchedResponseSupportability =
    waveId !== null &&
    readRecordString(responseSupportability ?? {}, "wave_id") === waveId
      ? responseSupportability
      : null;
  return {
    waveId,
    state:
      readRecordString(wave, "wave_state") ??
      readRecordString(wave, "state") ??
      readRecordString(matchedResponseSupportability ?? {}, "wave_state") ??
      "N/A",
    triggerType: readRecordString(wave, "trigger_type"),
    itemCount: formatRecordValue(
      wave.item_count ??
        aggregateMetrics?.item_count ??
        matchedResponseSupportability?.item_count,
    ),
    issueCount: formatRecordValue(
      wave.issue_count ??
        aggregateMetrics?.issue_count ??
        matchedResponseSupportability?.issue_count,
    ),
    supportabilityState:
      readRecordString(wave, "supportability_state") ??
      readRecordString(matchedResponseSupportability ?? {}, "state") ??
      "N/A",
    supportabilityReason:
      readRecordString(wave, "supportability_reason") ??
      firstNonEmpty(...readStringArray(matchedResponseSupportability?.reason_codes)),
  };
}

function waveIncludesPortfolio(
  wave: Record<string, unknown>,
  portfolioId: string,
): boolean {
  if (readRecordString(wave, "portfolio_id") === portfolioId) {
    return true;
  }

  const portfolioIds = [
    ...readStringArray(wave.portfolio_ids),
    ...readStringArray(asRecord(wave.portfolio_scope)?.portfolio_ids),
  ];
  return portfolioIds.includes(portfolioId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => item !== null)
    : [];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      )
    : [];
}

function readRecordString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function formatRecordValue(value: unknown): string {
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : "N/A";
}

function formatRecordCount(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
