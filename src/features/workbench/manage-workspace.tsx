import type { ReactNode } from "react";

import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import {
  AppPageShell,
  DefinitionList,
  DegradedStatePanel,
  MainWithSideRailLayout,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchRailCard,
  WorkbenchSectionStack,
} from "@/design-system";
import ConstructionAlternativesPanel from "@/features/workbench/components/construction-alternatives-panel";
import ManageMandateHealth from "@/features/workbench/components/manage-mandate-health";
import DpmWaveCommandCenterPanel from "@/features/workbench/components/dpm-wave-command-center-panel";
import OutcomeReviewPanel from "@/features/workbench/components/outcome-review-panel";
import PortfolioMemoryPanel from "@/features/workbench/components/portfolio-memory-panel";
import PmOperatingQualityPanel from "@/features/workbench/components/pm-operating-quality-panel";
import ProofPackPanel from "@/features/workbench/components/proof-pack-panel";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import { buildPortfolioMemoryPanelModel } from "@/features/workbench/portfolio-memory-view-model";
import {
  businessLastReviewed,
  businessStateLabel,
  buildManageExceptionRows,
  formatBusinessBook,
  formatBusinessExceptionTitle,
  formatBusinessMandateType,
  formatBusinessOwner,
  formatBusinessTrigger,
  firstNonEmpty,
  readStringFromResponse,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";
import {
  buildManageModeHref,
  buildManageModeItems,
  getManageModeDefinition,
  type ManageMode,
} from "@/features/workbench/manage-workspace-navigation";
import {
  readDpmMandateId,
  type ManageWorkspaceData,
} from "@/features/workbench/manage-workspace-data";
import styles from "./manage-workspace.module.css";

export function ManageWorkspace({
  data,
  mode,
}: {
  data: ManageWorkspaceData;
  mode: ManageMode;
}) {
  const portfolio = data.portfolio.portfolio;
  const modeDefinition = getManageModeDefinition(mode);
  const dpmMandateId = readDpmMandateId(data.mandate?.data ?? null);

  return (
    <AppPageShell pageKey="manage" className={`portfolio-page manage-page ${styles.manageScope}`}>
      <WorkbenchPageContainer className="portfolio-page-container manage-page-container">
        <MainWithSideRailLayout
          className="manage-layout portfolio-page"
          railClassName="portfolio-screen-rail-shell manage-rail-shell"
          mainClassName="manage-main"
          sideClassName="manage-side"
          sideDensity="comfortable"
          rail={
            <PortfolioScreenRail
              portfolioId={portfolio.portfolio_id}
              activeScreen="manage"
              modeItems={buildManageModeItems(portfolio.portfolio_id, mode)}
              modeNavigationLabel="Manage workspace navigation"
            />
          }
          main={
            <WorkbenchPageFrame
              className={`manage-page-frame manage-page-frame-${mode}`}
              bodyClassName="manage-page-frame-body"
              title={modeDefinition.title}
              subtitle={modeDefinition.description}
              actions={
                <>
                  <SemanticBadge tone={data.commandCenterError ? "warn" : "success"}>
                    {data.commandCenterError ? "Needs attention" : "Evidence available"}
                  </SemanticBadge>
                  <SemanticBadge>{portfolio.base_currency}</SemanticBadge>
                </>
              }
            >
              <WorkbenchSectionStack className="manage-page-sections">
                {renderManageMode(mode, data, dpmMandateId)}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          }
          side={<ManageContextRail data={data} activeMode={mode} />}
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}

export function ManageWorkspaceUnavailable({
  portfolioId,
  detail,
}: {
  portfolioId: string;
  detail: string;
}) {
  return (
    <main className="page-container">
      <WorkbenchPageFrame
        title="Manage Workspace"
        subtitle={`Manage context is temporarily unavailable for ${portfolioId}.`}
      >
        <DegradedStatePanel
          label="Operational status"
          title={`Unable to load portfolio context for ${portfolioId}.`}
          tone="danger"
          status="Unavailable"
          actions={[
            {
              href: `/performance?portfolioId=${encodeURIComponent(portfolioId)}`,
              label: "Open Performance Workspace",
            },
            { href: "/portfolio", label: "Return To Portfolio" },
          ]}
        >
          {detail}
        </DegradedStatePanel>
      </WorkbenchPageFrame>
    </main>
  );
}

function renderManageMode(
  mode: ManageMode,
  data: ManageWorkspaceData,
  mandateId: string | null
): ReactNode {
  switch (mode) {
    case "mandate":
      return <ManageMandateHealth data={data} />;
    case "waves":
      return (
        <>
          <DpmWaveCommandCenterPanel
            portfolioId={data.portfolio.portfolio.portfolio_id}
            waveList={data.waves}
            campaignDefinitions={data.campaignDefinitions}
            campaignDiscovery={data.campaignDiscovery}
            campaignDefinitionsError={data.campaignDefinitionsError}
            campaignDiscoveryError={data.campaignDiscoveryError}
            errorMessage={data.wavesError}
          />
          <ProofPackPanel
            portfolioId={data.portfolio.portfolio.portfolio_id}
            mandateId={mandateId}
            outcomeReviews={data.outcomeReviews}
            rebalanceSnapshot={data.portfolio.rebalance_snapshot}
            initialProofPack={data.proofPack}
            errorMessage={data.proofPackError}
          />
        </>
      );
    case "construction":
      return <ConstructionAlternativesPanel portfolio={data.portfolio} />;
    case "memory":
      return (
        <PortfolioMemoryPanel
          response={data.portfolioMemory}
          errorMessage={data.portfolioMemoryError}
        />
      );
    case "quality":
      return (
        <PmOperatingQualityPanel
          policies={data.pmOperatingQualityPolicies}
          scoreRuns={data.pmOperatingQualityScoreRuns}
          fairnessAnalyses={data.pmOperatingQualityFairnessAnalyses}
          fairnessAnalysisDetail={data.pmOperatingQualityFairnessAnalysisDetail}
          policiesError={data.pmOperatingQualityPoliciesError}
          scoreRunsError={data.pmOperatingQualityScoreRunsError}
          fairnessAnalysesError={data.pmOperatingQualityFairnessAnalysesError}
          fairnessAnalysisDetailError={data.pmOperatingQualityFairnessAnalysisDetailError}
        />
      );
    case "reviews":
      return (
        <OutcomeReviewPanel
          portfolioId={data.portfolio.portfolio.portfolio_id}
          response={data.outcomeReviews}
          errorMessage={data.outcomeReviewError}
        />
      );
    case "proof":
      return (
        <ProofPackPanel
          portfolioId={data.portfolio.portfolio.portfolio_id}
          mandateId={mandateId}
          outcomeReviews={data.outcomeReviews}
          rebalanceSnapshot={data.portfolio.rebalance_snapshot}
          initialProofPack={data.proofPack}
          errorMessage={data.proofPackError}
        />
      );
    case "overview":
    default:
      return <ManageOverview data={data} />;
  }
}

function ManageOverview({ data }: { data: ManageWorkspaceData }) {
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
  const pmQualityPolicyCount = data.pmOperatingQualityPolicies?.supportability.count ?? 0;
  const pmQualityScoreRunCount = data.pmOperatingQualityScoreRuns?.supportability.count ?? 0;
  const pmQualityFairnessAnalysisCount =
    data.pmOperatingQualityFairnessAnalyses?.supportability.count ?? 0;
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const exceptionRows = buildManageExceptionRows(data.commandCenterExceptions);
  const activeExceptionCount = parseCount(commandModel.activeExceptionCount);
  const selectedWaveIssueCount = parseCount(waveModel.selectedWaveIssueCount);
  const latestActivities = buildManageActivityRows(commandModel, waveModel, reviewModel);
  const latestProofPackId = firstNonEmpty(
    reviewModel.items.find((item) => item.proofPackId !== "N/A")?.proofPackId,
    "N/A"
  );
  const blockedSurfaces = [
    data.commandCenterError ? "Mandate readiness" : null,
    data.wavesError ? "Rebalance waves" : null,
    data.portfolioMemoryError ? "Portfolio memory" : null,
    data.pmOperatingQualityPoliciesError || data.pmOperatingQualityScoreRunsError ? "PM operating quality" : null,
    data.outcomeReviewError ? "Outcome reviews" : null,
  ].filter((surface): surface is string => Boolean(surface));
  const mandateReadiness =
    activeExceptionCount > 0
      ? "Needs Attention"
      : businessStateLabel(
          commandModel.mandateHealthState !== "N/A"
            ? commandModel.mandateHealthState
            : commandModel.supportabilityState
        );
  const dataReadiness = businessStateLabel(commandModel.dataCompletenessState);
  const rebalanceStatus = businessStateLabel(waveModel.selectedWaveState);
  const mandateTone = toneForState(
    commandModel.mandateHealthState !== "N/A"
      ? commandModel.mandateHealthState
      : commandModel.supportabilityState
  );
  const dataTone = toneForState(commandModel.dataCompletenessState);
  const rebalanceTone = toneForState(waveModel.selectedWaveState);
  const approvalReadiness =
    activeExceptionCount > 0 || selectedWaveIssueCount > 0
      ? "Blocked"
      : "Ready";
  const readinessCards = [
    {
      key: "mandate",
      label: "Mandate Readiness",
      value: mandateReadiness,
      icon: activeExceptionCount > 0 ? "warning" : mandateTone === "success" ? "verified" : "pending",
      tone: activeExceptionCount > 0 ? "danger" : mandateTone,
      progress: activeExceptionCount > 0 ? 75 : mandateTone === "success" ? 100 : 50,
    },
    {
      key: "data",
      label: "Data Readiness",
      value: dataReadiness,
      icon: dataTone === "success" ? "check_circle" : "pending",
      tone: dataTone === "danger" ? "danger" : dataTone === "success" ? "success" : "warn",
      progress: dataTone === "success" ? 100 : 50,
    },
    {
      key: "rebalance",
      label: "Rebalance Status",
      value: rebalanceStatus,
      icon: rebalanceTone === "success" ? "check_circle" : "pending",
      tone: rebalanceTone === "danger" ? "danger" : rebalanceTone === "success" ? "success" : "warn",
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
      state: businessStateLabel(commandModel.mandateHealthState !== "N/A" ? commandModel.mandateHealthState : commandModel.supportabilityState),
      tone: toneForState(commandModel.mandateHealthState !== "N/A" ? commandModel.mandateHealthState : commandModel.supportabilityState),
      metric: `${activeExceptionCount} attention items`,
      detail: activeExceptionCount
        ? "Review mandate readiness and resolve open items."
        : "Mandate settings are ready for advisor review.",
      href: buildManageModeHref(portfolioId, "mandate"),
      action: "Open Mandate Health",
    },
    {
      key: "waves",
      title: "Rebalance",
      icon: "refresh",
      state: businessStateLabel(waveModel.supportabilityState),
      tone: toneForState(waveModel.supportabilityState),
      metric: businessStateLabel(waveModel.selectedWaveState),
      detail: `${waveModel.selectedWaveItemCount} proposed changes, ${selectedWaveIssueCount} issues.`,
      href: buildManageModeHref(portfolioId, "waves"),
      action: "Open Rebalance Waves",
    },
    {
      key: "construction",
      title: "Construction",
      icon: "architecture",
      state: "Available",
      tone: "default" as const,
      metric: "Alternatives available",
      detail: "Compare suitable implementation paths for the mandate.",
      href: buildManageModeHref(portfolioId, "construction"),
      action: "Open Construction",
    },
    {
      key: "memory",
      title: "Portfolio Memory",
      icon: "memory",
      state: businessStateLabel(memoryModel.supportabilityState),
      tone: toneForState(memoryModel.supportabilityState),
      metric: `${memoryModel.eventCount} events`,
      detail: "Recent decisions and operating events are captured.",
      href: buildManageModeHref(portfolioId, "memory"),
      action: "Open Portfolio Memory",
    },
    {
      key: "quality",
      title: "PM Operating Quality",
      icon: "manage_accounts",
      state:
        data.pmOperatingQualityPoliciesError ||
        data.pmOperatingQualityScoreRunsError ||
        data.pmOperatingQualityFairnessAnalysesError
          ? "Needs attention"
          : "Available",
      tone:
        data.pmOperatingQualityPoliciesError ||
        data.pmOperatingQualityScoreRunsError ||
        data.pmOperatingQualityFairnessAnalysesError
          ? ("warn" as const)
          : ("success" as const),
      metric: `${
        pmQualityFairnessAnalysisCount || pmQualityScoreRunCount || pmQualityPolicyCount
      } evidence rows`,
      detail: "Review Manage-owned PM quality policy, score-run, and fairness-analysis posture.",
      href: buildManageModeHref(portfolioId, "quality"),
      action: "Open PM Quality",
    },
    {
      key: "reviews",
      title: "Outcome Reviews",
      icon: "rate_review",
      state: businessStateLabel(reviewModel.supportabilityState),
      tone: toneForState(reviewModel.supportabilityState),
      metric: `${reviewModel.items.length} reviews`,
      detail: reviewModel.items[0]?.state ? businessStateLabel(reviewModel.items[0].state) : "No pending review.",
      href: buildManageModeHref(portfolioId, "reviews"),
      action: "Open Outcome Reviews",
    },
    {
      key: "proof",
      title: "Evidence Pack",
      icon: "description",
      state: latestProofPackId !== "N/A" ? "Available" : "Not requested",
      tone: latestProofPackId !== "N/A" ? ("success" as const) : ("default" as const),
      metric: latestProofPackId !== "N/A" ? "Evidence available" : "Not requested",
      detail: "Decision evidence prepared for advisor and audit review.",
      href: buildManageModeHref(portfolioId, "proof"),
      action: "Open Evidence Pack",
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
                    <td><SemanticBadge tone={toneForState(row.severity)}>{businessStateLabel(row.severity)}</SemanticBadge></td>
                    <td>{formatBusinessExceptionTitle(row.title)}</td>
                    <td>{formatBusinessOwner(row.owner, row.source)}</td>
                    <td>{row.age}</td>
                    <td><a href={buildManageModeHref(portfolioId, "mandate")}>{row.nextAction}</a></td>
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
              const isActive = step === "Simulation" || waveModel.selectedWaveState.includes(step.toUpperCase());
              return (
                <span
                  key={step}
                  className={[
                    isComplete ? "manage-wave-step-complete" : "",
                    isActive ? "manage-wave-step-active" : "",
                  ].filter(Boolean).join(" ")}
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

function ManageContextRail({
  data,
  activeMode,
}: {
  data: ManageWorkspaceData;
  activeMode: ManageMode;
}) {
  const portfolio = data.portfolio.portfolio;
  const modeDefinition = getManageModeDefinition(activeMode);
  const commandModel = buildDpmCommandCenterPanelModel({
    commandCenter: data.commandCenter,
    exceptions: data.commandCenterExceptions,
    mandate: data.mandate,
    mandateHealth: data.mandateHealth,
  });
  const attentionRows = buildManageExceptionRows(data.commandCenterExceptions);
  const attentionCount = attentionRows.length || commandModel.activeExceptionCount;
  const waveModel = buildDpmWaveCommandCenterModel({ waveList: data.waves });
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const hasEvidence = reviewModel.items.some((item) => item.proofPackId !== "N/A");
  const nextActions =
    activeMode === "mandate"
      ? [
          ["Review Recommended Actions", "#mandate-recommended-actions"],
          ["Review Attention Items", buildManageModeHref(portfolio.portfolio_id, "mandate")],
          ["Open Rebalance", buildManageModeHref(portfolio.portfolio_id, "waves")],
          ["Return to Manage Overview", buildManageModeHref(portfolio.portfolio_id, "overview")],
        ]
      : [
          ["Open Mandate Health", buildManageModeHref(portfolio.portfolio_id, "mandate")],
          ["Open Rebalance", buildManageModeHref(portfolio.portfolio_id, "waves")],
          ["Open Construction", buildManageModeHref(portfolio.portfolio_id, "construction")],
          ["Open Portfolio Memory", buildManageModeHref(portfolio.portfolio_id, "memory")],
          ["Open PM Quality", buildManageModeHref(portfolio.portfolio_id, "quality")],
          ["Open Outcome Reviews", buildManageModeHref(portfolio.portfolio_id, "reviews")],
          ["Open Evidence Pack", buildManageModeHref(portfolio.portfolio_id, "proof")],
        ];

  return (
    <div className="manage-context-rail">
      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Decision Support</Text>
          <strong>{modeDefinition.title}</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage portfolio context"
          items={[
            { label: "Client", value: portfolio.client_id },
            { label: "Booking Centre", value: portfolio.booking_center_code },
            { label: "Mandate Type", value: formatBusinessMandateType(readStringFromResponse(data.mandate, "mandate_type")) },
            { label: "Portfolio Manager Book", value: formatBusinessBook(readStringFromResponse(data.mandate, "pm_book_id")) },
            { label: "As Of", value: data.portfolio.as_of_date },
          ]}
        />
      </WorkbenchRailCard>

      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Review Posture</Text>
          <strong>{attentionCount ? "Needs advisor attention" : "Ready for review"}</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage review posture"
          items={[
            { label: "Attention Items", value: `${attentionCount} open` },
            { label: "Data Readiness", value: businessStateLabel(commandModel.dataCompletenessState) },
            { label: "Rebalance", value: businessStateLabel(waveModel.selectedWaveState) },
            { label: "Evidence", value: hasEvidence ? "Available" : "Not requested" },
            { label: "Audit Trail", value: "Available" },
            { label: "Last Refreshed", value: businessLastReviewed(commandModel.latestMonitoringRunStatus) },
          ]}
        />
      </WorkbenchRailCard>

      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Next Actions</Text>
          <strong>Advisor workflow</strong>
        </div>
        <div className="manage-rail-actions">
          {nextActions.map(([label, href]) => (
            <a href={href} key={label}>
              {label}
            </a>
          ))}
          <a href={`/portfolio?portfolioId=${encodeURIComponent(portfolio.portfolio_id)}`}>
            Return to Portfolio
          </a>
        </div>
      </WorkbenchRailCard>
    </div>
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
