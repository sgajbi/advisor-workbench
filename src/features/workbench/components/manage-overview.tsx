import {
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { buildManageModeHref } from "@/features/workbench/manage-workspace-navigation";
import {
  businessLastReviewed,
  businessStateLabel,
  buildManageExceptionRows,
  formatBusinessExceptionTitle,
  formatBusinessOwner,
  formatBusinessTrigger,
  firstNonEmpty,
  readStringFromResponse,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import { buildPortfolioMemoryPanelModel } from "@/features/workbench/portfolio-memory-view-model";

export default function ManageOverview({ data }: { data: ManageWorkspaceData }) {
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
  const exceptionRows = buildManageExceptionRows(data.commandCenterExceptions);
  const activeExceptionCount = parseCount(commandModel.activeExceptionCount);
  const selectedWaveIssueCount = parseCount(waveModel.selectedWaveIssueCount);
  const latestActivities = buildManageActivityRows(commandModel, waveModel, reviewModel);
  const latestProofPackId = firstNonEmpty(
    reviewModel.items.find((item) => item.proofPackId !== "N/A")?.proofPackId,
    "N/A"
  );
  const pmQualityPolicyCount = data.pmOperatingQualityPolicies?.supportability.count ?? 0;
  const pmQualityScoreRunCount = data.pmOperatingQualityScoreRuns?.supportability.count ?? 0;
  const pmQualityFairnessAnalysisCount =
    data.pmOperatingQualityFairnessAnalyses?.supportability.count ?? 0;
  const blockedSurfaces = [
    data.commandCenterError ? "Mandate readiness" : null,
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
  const approvalReadiness =
    activeExceptionCount > 0 || selectedWaveIssueCount > 0 ? "Blocked" : "Ready";
  const readinessCards = [
    {
      key: "mandate",
      label: "Mandate Readiness",
      value: activeExceptionCount > 0 ? "Needs Attention" : businessStateLabel(mandateSourceState),
      icon: activeExceptionCount > 0 ? "warning" : mandateTone === "success" ? "verified" : "pending",
      tone: activeExceptionCount > 0 ? "danger" : mandateTone,
      progress: activeExceptionCount > 0 ? 75 : mandateTone === "success" ? 100 : 50,
    },
    {
      key: "data",
      label: "Data Readiness",
      value: businessStateLabel(commandModel.dataCompletenessState),
      icon: dataTone === "success" ? "check_circle" : "pending",
      tone: dataTone === "danger" ? "danger" : dataTone === "success" ? "success" : "warn",
      progress: dataTone === "success" ? 100 : 50,
    },
    {
      key: "rebalance",
      label: "Rebalance Status",
      value: businessStateLabel(waveModel.selectedWaveState),
      icon: rebalanceTone === "success" ? "check_circle" : "pending",
      tone:
        rebalanceTone === "danger" ? "danger" : rebalanceTone === "success" ? "success" : "warn",
      progress: rebalanceTone === "success" ? 100 : 50,
    },
    {
      key: "approval",
      label: "Approval Readiness",
      value: approvalReadiness,
      icon: approvalReadiness === "Ready" ? "check_circle" : "block",
      tone: approvalReadiness === "Ready" ? "success" : "danger",
      progress: approvalReadiness === "Ready" ? 100 : 25,
    },
  ];
  const moduleItems = [
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
  ];

  return (
    <SectionBlock
      title="Mandate Operating Posture"
      subtitle="Advisor-facing view of mandate readiness, rebalance status, and items needing attention."
      className="manage-overview-panel"
      actions={
        <SemanticBadge tone={blockedSurfaces.length ? "warn" : "success"}>
          {blockedSurfaces.length ? "Needs attention" : "Evidence Available"}
        </SemanticBadge>
      }
    >
      <div className="manage-decision-readiness-grid" aria-label="Decision readiness">
        {readinessCards.map((item) => (
          <div className={`manage-decision-readiness-card is-${item.tone}`} key={item.key}>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <span className="manage-status-icon" data-icon={item.icon} aria-hidden="true" />
            <div className="manage-readiness-meter" aria-hidden="true">
              <i style={{ width: `${item.progress}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="manage-portfolio-value-band" aria-label="Portfolio operating summary">
        <div>
          <span>Portfolio Value ({portfolio.portfolio.base_currency})</span>
          <strong>{formatAmount(portfolio.overview.market_value_base)}</strong>
        </div>
        <dl>
          <div>
            <dt>Positions</dt>
            <dd>{portfolio.overview.position_count}</dd>
          </div>
          <div>
            <dt>Cash Weight</dt>
            <dd>{formatPct(portfolio.overview.cash_weight_pct)}</dd>
          </div>
          <div>
            <dt>Risk Profile</dt>
            <dd>{readStringFromResponse(data.mandate, "risk_profile") ?? "Balanced"}</dd>
          </div>
        </dl>
      </div>

      <div className="manage-overview-focus-grid">
        <div className="manage-overview-table-card manage-attention-card">
          <div className="manage-overview-card-header">
            <h3>Attention Required</h3>
            <span>{exceptionRows.length} items pending</span>
          </div>
          <table className="manage-overview-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Observation</th>
                <th>Source</th>
                <th>Age</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {exceptionRows.length ? (
                exceptionRows.slice(0, 4).map((row) => (
                  <tr key={row.key}>
                    <td>
                      <SemanticBadge tone={toneForState(row.severity)}>
                        {businessStateLabel(row.severity)}
                      </SemanticBadge>
                    </td>
                    <td>{formatBusinessExceptionTitle(row.title)}</td>
                    <td>{formatBusinessOwner(row.owner, row.source)}</td>
                    <td>{row.age}</td>
                    <td>
                      <a href={buildManageModeHref(portfolioId, "mandate")}>{row.nextAction}</a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No active attention items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="manage-overview-card manage-active-rebalance-card">
          <div className="manage-overview-card-header">
            <div>
              <h3>Active Rebalance</h3>
              <span>Wave: {formatBusinessTrigger(waveModel.summaryRows[0]?.triggerType)}</span>
            </div>
            <SemanticBadge tone={toneForState(waveModel.selectedWaveState)}>
              Stage: {businessStateLabel(waveModel.selectedWaveState)}
            </SemanticBadge>
          </div>
          <div className="manage-wave-stepper" aria-label="Rebalance wave lifecycle">
            {["Preview", "Source", "Simulation", "Approval", "Staging"].map((step, index) => {
              const isComplete = index < 2;
              const isActive =
                step === "Simulation" || waveModel.selectedWaveState.includes(step.toUpperCase());
              return (
                <span
                  key={step}
                  className={[
                    isComplete ? "manage-wave-step-complete" : "",
                    isActive ? "manage-wave-step-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {step}
                </span>
              );
            })}
          </div>
          <div className="manage-rebalance-blocker">
            <span className="manage-status-icon" data-icon="info" aria-hidden="true" />
            <p>
              {approvalReadiness === "Blocked"
                ? "Blocker: approval pending exception resolution."
                : "Ready for approval review."}
            </p>
          </div>
        </div>
      </div>

      <div className="manage-module-grid" aria-label="Manage work areas">
        {moduleItems.map((item) => (
          <a className="manage-module-card" href={item.href} key={item.key}>
            <span className="manage-module-icon" data-icon={item.icon} aria-hidden="true" />
            <strong>{item.title}</strong>
            <span className="manage-module-metric">{item.metric}</span>
          </a>
        ))}
      </div>

      <div className="manage-overview-activity">
        <div className="manage-overview-card-header">
          <h3>Audit Log &amp; Timeline</h3>
        </div>
        <div className="manage-activity-timeline" role="list">
          {latestActivities.map((activity) => (
            <div className="manage-activity-row" role="listitem" key={activity.key}>
              <i aria-hidden="true" />
              <div>
                <strong>{activity.event}</strong>
                <span>{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {blockedSurfaces.length ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Some manage views need attention"
          body={`Areas to review: ${blockedSurfaces.join(", ")}.`}
        />
      ) : (
        <Text variant="secondary" className="muted">
          Detailed mandate, rebalance, construction, memory, review, and evidence views are
          available from the Manage navigation.
        </Text>
      )}
    </SectionBlock>
  );
}

function buildManageActivityRows(
  commandModel: ReturnType<typeof buildDpmCommandCenterPanelModel>,
  waveModel: ReturnType<typeof buildDpmWaveCommandCenterModel>,
  reviewModel: ReturnType<typeof buildOutcomeReviewPanelModel>
) {
  const rows = [
    commandModel.latestMonitoringRunId !== "N/A"
      ? {
          key: "monitoring",
          time: businessLastReviewed(commandModel.latestMonitoringRunStatus),
          event: `Daily mandate review completed with ${commandModel.activeExceptionCount} attention items.`,
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

function parseCount(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
