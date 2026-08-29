import { businessStateLabel } from "@/copy/business-state-copy";
import type { SemanticBadgeTone } from "@/design-system";
import type { PortfolioReviewContext } from "@/apps/portfolio/portfolio-screen-navigation";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import {
  clampMandateHealthPercent,
  mandateHealthScoreToPercent,
} from "@/features/workbench/manage-mandate-health-helpers";
import { buildManageModeHref } from "@/features/workbench/manage-workspace-navigation";
import { MANAGE_WORKFLOW_LABELS } from "@/features/workbench/manage-terminology";
import { formatBusinessOwner } from "@/features/workbench/manage-actor-presentation";
import {
  buildManageExceptionRows,
  filterManageExceptionRowsForMandate,
  firstNonEmpty,
  formatBusinessExceptionTitle,
  formatBusinessSource,
  formatBusinessTrigger,
  getManageExceptionEvidencePosture,
  isBusinessValueAvailable,
  readStringFromResponse,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

export type ManageOverviewPostureItem = {
  key: string;
  label: string;
  value: string;
  support?: string;
  tone: SemanticBadgeTone;
};

export type ManageOverviewDecision = {
  key: string;
  kind: "attention" | "rebalance" | "evidence-gap";
  title: string;
  subtitle: string;
  status: string;
  tone: SemanticBadgeTone;
  facts: Array<{ label: string; value: string }>;
  nextAction: string;
  evidence: Array<{ label: string; value: string }>;
  actionHref: string;
  actionLabel: string;
};

export type ManageOverviewModel = ReturnType<typeof buildManageOverviewModel>;

export function buildManageOverviewModel(
  data: ManageWorkspaceData,
  reviewContext?: PortfolioReviewContext,
) {
  const portfolio = data.portfolio;
  const portfolioId = portfolio.portfolio.portfolio_id;
  const navigationContext = reviewContext ?? { portfolioId };
  const commandModel = buildDpmCommandCenterPanelModel({
    commandCenter: data.commandCenter,
    exceptions: data.commandCenterExceptions,
    mandate: data.mandate,
    mandateHealth: data.mandateHealth,
  });
  const portfolioWave = buildPortfolioWaveOverview(data.waves, portfolioId);
  const exceptionRows = filterManageExceptionRowsForMandate(
    buildManageExceptionRows(data.commandCenterExceptions),
    commandModel.mandateId
  );
  const exceptionEvidencePosture = getManageExceptionEvidencePosture(
    data.commandCenterExceptions,
    data.commandCenterExceptionsError
  );
  const hasAvailableExceptionEvidence = exceptionEvidencePosture !== "unavailable";
  const hasCompleteExceptionEvidence = exceptionEvidencePosture === "complete";
  const activeExceptionCount = hasCompleteExceptionEvidence ? exceptionRows.length : null;
  const riskProfile = readStringFromResponse(data.mandate, "risk_profile");
  const hasRiskProfile = isBusinessValueAvailable(riskProfile);
  const blockedSurfaces = [
    data.commandCenterError ||
    data.mandateHealthError ||
    !data.mandateHealth
      ? "Mandate health"
      : null,
    hasRiskProfile ? null : "Mandate risk profile",
    !hasAvailableExceptionEvidence ? "Mandate attention items" : null,
    data.wavesError ? "Rebalance waves" : null,
  ].filter((surface): surface is string => Boolean(surface));
  const mandateHealthState = commandModel.mandateHealthState;
  const mandateTone = toneForState(mandateHealthState);
  const dataTone = toneForState(commandModel.dataCompletenessState);
  const rebalanceTone = toneForState(portfolioWave.state);
  const mandateScore = mandateHealthScoreToPercent(commandModel.mandateHealthScore);
  const hasActiveAttention = hasAvailableExceptionEvidence && exceptionRows.length > 0;
  const mandateHref = buildManageModeHref(navigationContext, "mandate");
  const rebalanceHref = buildManageModeHref(navigationContext, "waves");
  const decisionItems = buildManageOverviewDecisions({
    exceptionRows,
    exceptionEvidencePosture,
    portfolioWave,
    mandateHref,
    rebalanceHref,
  });

  return {
    portfolioSummary: {
      portfolioId,
      currency: portfolio.portfolio.base_currency,
      marketValue: formatAmount(portfolio.overview.market_value_base),
      cashWeight: formatPct(portfolio.overview.cash_weight_pct),
      positionCount: portfolio.overview.position_count,
      riskProfile: hasRiskProfile ? businessStateLabel(riskProfile) : "Not reported",
    },
    postureItems: [
      {
        key: "mandate",
        label: "Mandate health",
        value: businessStateLabel(mandateHealthState),
        tone: mandateTone,
        support:
          mandateScore === null
            ? "Source score not reported"
            : `${clampMandateHealthPercent(mandateScore)}% source health score`,
      },
      {
        key: "data",
        label: MANAGE_WORKFLOW_LABELS.dataAvailability,
        value: businessStateLabel(commandModel.dataCompletenessState),
        tone: dataTone === "danger" ? "danger" : dataTone === "success" ? "success" : "warn",
        support: "Mandate source availability",
      },
      {
        key: "rebalance",
        label: "Rebalance status",
        value: businessStateLabel(portfolioWave.state),
        tone:
          rebalanceTone === "danger" ? "danger" : rebalanceTone === "success" ? "success" : "warn",
        support: portfolioWave.waveId
          ? "Selected-portfolio wave"
          : "Selected-portfolio wave not confirmed",
      },
      {
        key: "attention",
        label: MANAGE_WORKFLOW_LABELS.openAttentionItems,
        value:
          exceptionEvidencePosture === "unavailable"
            ? "Not available"
            : exceptionEvidencePosture === "partial"
              ? `${exceptionRows.length} shown`
              : String(exceptionRows.length),
        tone: activeExceptionCount === 0 ? "success" : "warn",
        support:
          exceptionEvidencePosture === "partial"
            ? "Bounded source view; total not confirmed"
            : exceptionEvidencePosture === "unavailable"
              ? "No zero-attention conclusion inferred"
              : "Selected mandate",
      },
    ] satisfies ManageOverviewPostureItem[],
    decisionItems,
    exceptionEvidencePosture,
    hasAvailableExceptionEvidence,
    hasCompleteExceptionEvidence,
    activeRebalance: {
      waveId: portfolioWave.waveId,
      triggerType: portfolioWave.triggerType,
      state: portfolioWave.state,
      supportabilityState: portfolioWave.supportabilityState,
      itemCount: portfolioWave.itemCount,
      issueCount: portfolioWave.issueCount,
      supportabilityReason: portfolioWave.supportabilityReason,
    },
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

function buildManageOverviewDecisions({
  exceptionRows,
  exceptionEvidencePosture,
  portfolioWave,
  mandateHref,
  rebalanceHref,
}: {
  exceptionRows: ReturnType<typeof buildManageExceptionRows>;
  exceptionEvidencePosture: "complete" | "partial" | "unavailable";
  portfolioWave: ReturnType<typeof buildPortfolioWaveOverview>;
  mandateHref: string;
  rebalanceHref: string;
}): ManageOverviewDecision[] {
  const attentionDecisions = exceptionRows.map((row) => ({
    key: `attention:${row.key}`,
    kind: "attention" as const,
    title: formatBusinessExceptionTitle(row.title),
    subtitle: "Mandate attention item",
    status: businessStateLabel(row.severity),
    tone: toneForState(row.severity),
    facts: [
      { label: "Owner", value: formatBusinessOwner(row.owner) },
      { label: "Age", value: row.age },
    ],
    nextAction:
      row.nextAction === "N/A"
        ? "Review mandate evidence and agree the owning next step"
        : row.nextAction,
    evidence: [
      { label: "Workflow state", value: businessStateLabel(row.state) },
      { label: "Evidence source", value: formatBusinessSource(row.source) },
      { label: "Monitoring run", value: row.monitoringRunId },
      { label: "Evidence authority", value: formatBusinessSource(row.authority) },
    ],
    actionHref: mandateHref,
    actionLabel: "Open mandate health",
  }));

  const sourceWindowDecision: ManageOverviewDecision[] =
    exceptionEvidencePosture === "unavailable"
      ? [
          {
            key: "attention:evidence-unavailable",
            kind: "evidence-gap",
            title: "Mandate attention evidence is unavailable",
            subtitle: "Evidence boundary",
            status: "Not available",
            tone: "warn",
            facts: [
              { label: "Scope", value: "Selected mandate" },
              { label: "Conclusion", value: "Not confirmed" },
            ],
            nextAction: "Open mandate health when source evidence is available",
            evidence: [
              { label: "Evidence state", value: "Unavailable" },
              {
                label: "Decision boundary",
                value: "No zero-attention conclusion has been inferred",
              },
            ],
            actionHref: mandateHref,
            actionLabel: "Open mandate health",
          },
        ]
      : exceptionEvidencePosture === "partial"
        ? [
            {
              key: "attention:more-available",
              kind: "evidence-gap",
              title: "Continue the mandate attention review",
              subtitle: "Complete source coverage is not confirmed",
              status: "Partial",
              tone: "warn",
              facts: [
                { label: "Visible now", value: String(exceptionRows.length) },
                { label: "Coverage", value: "Bounded source view" },
              ],
              nextAction: "Open mandate health to review the available source evidence",
              evidence: [
                { label: "Evidence state", value: "Partial" },
                {
                  label: "Decision boundary",
                  value: "The total active-attention count is not yet confirmed",
                },
              ],
              actionHref: mandateHref,
              actionLabel: "Continue mandate review",
            },
          ]
        : [];

  const rebalanceDecision: ManageOverviewDecision = {
    key: `rebalance:${portfolioWave.waveId ?? "unconfirmed"}`,
    kind: "rebalance",
    title: portfolioWave.waveId
      ? "Review the active rebalance"
      : "Confirm selected-portfolio rebalance evidence",
    subtitle: "Rebalance decision",
    status: businessStateLabel(portfolioWave.supportabilityState),
    tone: toneForState(portfolioWave.supportabilityState),
    facts: [
      {
        label: "Trigger",
        value: portfolioWave.triggerType
          ? formatBusinessTrigger(portfolioWave.triggerType)
          : "Not reported",
      },
      { label: "Proposed changes", value: portfolioWave.itemCount },
    ],
    nextAction: portfolioWave.waveId
      ? "Review proposed changes and source supportability"
      : "Open rebalance waves to confirm the current portfolio posture",
    evidence: [
      { label: "Rebalance wave", value: portfolioWave.waveId ?? "Not confirmed" },
      { label: "Source-reported issues", value: portfolioWave.issueCount },
      {
        label: "Support note",
        value: businessStateLabel(portfolioWave.supportabilityReason),
      },
    ],
    actionHref: rebalanceHref,
    actionLabel: "Open rebalance waves",
  };

  return [...attentionDecisions, ...sourceWindowDecision, rebalanceDecision];
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
