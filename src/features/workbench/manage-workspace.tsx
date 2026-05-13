import type { ReactNode } from "react";

import PortfolioScreenRail, {
  type PortfolioScreenRailModeItem,
} from "@/apps/portfolio/components/portfolio-screen-rail";
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
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import ConstructionAlternativesPanel from "@/features/workbench/components/construction-alternatives-panel";
import DpmCommandCenterPanel from "@/features/workbench/components/dpm-command-center-panel";
import DpmWaveCommandCenterPanel from "@/features/workbench/components/dpm-wave-command-center-panel";
import OutcomeReviewPanel from "@/features/workbench/components/outcome-review-panel";
import PortfolioMemoryPanel from "@/features/workbench/components/portfolio-memory-panel";
import ProofPackPanel from "@/features/workbench/components/proof-pack-panel";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import { buildPortfolioMemoryPanelModel } from "@/features/workbench/portfolio-memory-view-model";
import {
  getDpmCommandCenter,
  getDpmCommandCenterExceptions,
  getDpmMandateByPortfolio,
  getDpmMandateHealth,
  getDpmOutcomeReviews,
  getDpmPortfolioMemory,
  getPortfolio360,
  listDpmWaves,
} from "@/features/workbench/api";

type BadgeTone = "default" | "success" | "warn" | "danger";

export type ManageMode =
  | "overview"
  | "mandate"
  | "waves"
  | "construction"
  | "memory"
  | "reviews"
  | "proof";

export type ManageWorkspaceData = {
  portfolio: Awaited<ReturnType<typeof getPortfolio360>>;
  commandCenter: Awaited<ReturnType<typeof getDpmCommandCenter>> | null;
  commandCenterExceptions: Awaited<ReturnType<typeof getDpmCommandCenterExceptions>> | null;
  mandate: Awaited<ReturnType<typeof getDpmMandateByPortfolio>> | null;
  mandateHealth: Awaited<ReturnType<typeof getDpmMandateHealth>> | null;
  commandCenterError: string | null;
  portfolioMemory: Awaited<ReturnType<typeof getDpmPortfolioMemory>> | null;
  portfolioMemoryError: string | null;
  waves: Awaited<ReturnType<typeof listDpmWaves>> | null;
  wavesError: string | null;
  outcomeReviews: Awaited<ReturnType<typeof getDpmOutcomeReviews>> | null;
  outcomeReviewError: string | null;
};

export const MANAGE_MODE_DEFINITIONS: Array<{
  key: ManageMode;
  label: string;
  detail: string;
  title: string;
  description: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    detail: "Mandate posture",
    title: "Manage Overview",
    description: "DPM mandate state, operating readiness, and current portfolio context.",
  },
  {
    key: "mandate",
    label: "Mandate",
    detail: "Health and exceptions",
    title: "Mandate Health",
    description: "Manage-owned mandate health, source readiness, exceptions, and recommended actions.",
  },
  {
    key: "waves",
    label: "Waves",
    detail: "Rebalance lifecycle",
    title: "Rebalance Waves",
    description: "Explicit portfolio-list wave state, source checks, simulation, approval, staging, and handoff.",
  },
  {
    key: "construction",
    label: "Construction",
    detail: "Alternatives",
    title: "Construction Alternatives",
    description: "Supported construction alternatives for advisor and PM review.",
  },
  {
    key: "memory",
    label: "Memory",
    detail: "Portfolio memory",
    title: "Portfolio Memory",
    description: "Manage-published portfolio memory and institutional context.",
  },
  {
    key: "reviews",
    label: "Reviews",
    detail: "Outcome review",
    title: "Outcome Reviews",
    description: "Post-trade outcome review evidence and realized-versus-expected variance.",
  },
  {
    key: "proof",
    label: "Proof Packs",
    detail: "Evidence handoff",
    title: "Proof Packs",
    description: "Proof-pack generation, report inputs, and evidence handoff state.",
  },
];

export async function loadManageWorkspaceData(
  portfolio: Awaited<ReturnType<typeof getPortfolio360>>
): Promise<ManageWorkspaceData> {
  const portfolioId = portfolio.portfolio.portfolio_id;
  const [
    commandCenterResult,
    exceptionsResult,
    mandateResult,
    memoryResult,
    wavesResult,
    reviewsResult,
  ] = await Promise.allSettled([
    getDpmCommandCenter({ limit: 25 }),
    getDpmCommandCenterExceptions({ state: "ACTIVE", limit: 25 }),
    getDpmMandateByPortfolio(portfolioId),
    getDpmPortfolioMemory({ portfolioId, limit: 100 }),
    listDpmWaves({ triggerType: "EXPLICIT_PORTFOLIO_LIST", limit: 10 }),
    getDpmOutcomeReviews({ portfolioId, limit: 10 }),
  ]);

  const mandate = readSettledValue(mandateResult);
  const mandateId = readDpmMandateId(mandate?.data ?? null);
  let mandateHealth: Awaited<ReturnType<typeof getDpmMandateHealth>> | null = null;
  if (mandateId) {
    try {
      mandateHealth = await getDpmMandateHealth(mandateId);
    } catch {
      mandateHealth = null;
    }
  }

  return {
    portfolio,
    commandCenter: readSettledValue(commandCenterResult),
    commandCenterExceptions: readSettledValue(exceptionsResult),
    mandate,
    mandateHealth,
    commandCenterError: readSettledError(
      commandCenterResult,
      "DPM command-center endpoint unavailable."
    ),
    portfolioMemory: readSettledValue(memoryResult),
    portfolioMemoryError: readSettledError(
      memoryResult,
      "Portfolio-memory endpoint unavailable."
    ),
    waves: readSettledValue(wavesResult),
    wavesError: readSettledError(wavesResult, "DPM wave endpoint unavailable."),
    outcomeReviews: readSettledValue(reviewsResult),
    outcomeReviewError: readSettledError(
      reviewsResult,
      "Outcome review endpoint unavailable."
    ),
  };
}

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
    <AppPageShell pageKey="manage" className="portfolio-page manage-page">
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
              subtitle={`${portfolio.portfolio_id} | ${modeDefinition.description}`}
              actions={
                <>
                  <SemanticBadge tone={data.commandCenterError ? "warn" : "success"}>
                    {data.commandCenterError ? "Partial" : "Gateway backed"}
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
      return (
        <DpmCommandCenterPanel
          commandCenter={data.commandCenter}
          exceptions={data.commandCenterExceptions}
          mandate={data.mandate}
          mandateHealth={data.mandateHealth}
          errorMessage={data.commandCenterError}
        />
      );
    case "waves":
      return (
        <>
          <DpmWaveCommandCenterPanel
            portfolioId={data.portfolio.portfolio.portfolio_id}
            waveList={data.waves}
            errorMessage={data.wavesError}
          />
          <ProofPackPanel
            portfolioId={data.portfolio.portfolio.portfolio_id}
            mandateId={mandateId}
            outcomeReviews={data.outcomeReviews}
            rebalanceSnapshot={data.portfolio.rebalance_snapshot}
            initialProofPack={null}
            errorMessage={null}
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
          initialProofPack={null}
          errorMessage={null}
        />
      );
    case "overview":
    default:
      return <ManageOverview data={data} mandateId={mandateId} />;
  }
}

function ManageOverview({
  data,
  mandateId,
}: {
  data: ManageWorkspaceData;
  mandateId: string | null;
}) {
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
  const exceptionRows = buildOverviewExceptionRows(data.commandCenterExceptions);
  const latestActivities = buildManageActivityRows(commandModel, waveModel, reviewModel);
  const latestProofPackId = firstNonEmpty(
    reviewModel.items.find((item) => item.proofPackId !== "N/A")?.proofPackId,
    "N/A"
  );
  const blockedSurfaces = [
    data.commandCenterError ? "Mandate command center" : null,
    data.wavesError ? "Rebalance waves" : null,
    data.portfolioMemoryError ? "Portfolio memory" : null,
    data.outcomeReviewError ? "Outcome reviews" : null,
  ].filter((surface): surface is string => Boolean(surface));
  const moduleItems = [
    {
      key: "mandate",
      title: "Mandate Health",
      state: commandModel.mandateHealthState !== "N/A" ? commandModel.mandateHealthState : commandModel.supportabilityState,
      tone: toneForState(commandModel.mandateHealthState !== "N/A" ? commandModel.mandateHealthState : commandModel.supportabilityState),
      metric: `${commandModel.activeExceptionCount} active exceptions`,
      detail: commandModel.latestMonitoringRunId !== "N/A"
        ? `Last run ${commandModel.latestMonitoringRunId}`
        : "Monitoring posture from Gateway",
      href: buildManageModeHref(portfolioId, "mandate"),
      action: "Open Mandate Health",
    },
    {
      key: "waves",
      title: "Rebalance Waves",
      state: waveModel.supportabilityState,
      tone: toneForState(waveModel.supportabilityState),
      metric: waveModel.selectedWaveId ?? "No active wave",
      detail: `${waveModel.selectedWaveState} | ${waveModel.selectedWaveItemCount} items`,
      href: buildManageModeHref(portfolioId, "waves"),
      action: "Open Rebalance Waves",
    },
    {
      key: "construction",
      title: "Construction",
      state: "AVAILABLE",
      tone: "default" as const,
      metric: "Gateway action available",
      detail: "Generate and compare alternatives in the construction workspace",
      href: buildManageModeHref(portfolioId, "construction"),
      action: "Open Construction",
    },
    {
      key: "memory",
      title: "Portfolio Memory",
      state: memoryModel.supportabilityState,
      tone: toneForState(memoryModel.supportabilityState),
      metric: `${memoryModel.eventCount} events`,
      detail: memoryModel.contentHash !== "N/A" ? memoryModel.contentHash : "Manage timeline posture",
      href: buildManageModeHref(portfolioId, "memory"),
      action: "Open Portfolio Memory",
    },
    {
      key: "reviews",
      title: "Outcome Reviews",
      state: reviewModel.supportabilityState,
      tone: toneForState(reviewModel.supportabilityState),
      metric: `${reviewModel.items.length} reviews`,
      detail: reviewModel.items[0]?.state ?? "Review posture from Gateway",
      href: buildManageModeHref(portfolioId, "reviews"),
      action: "Open Outcome Reviews",
    },
    {
      key: "proof",
      title: "Proof Packs",
      state: latestProofPackId !== "N/A" ? "AVAILABLE" : "NOT_REQUESTED",
      tone: latestProofPackId !== "N/A" ? ("success" as const) : ("default" as const),
      metric: latestProofPackId,
      detail: "Evidence handoff for latest rebalance context",
      href: buildManageModeHref(portfolioId, "proof"),
      action: "Open Proof Packs",
    },
  ];

  return (
    <SectionBlock
      title="Manage Operating Posture"
      subtitle="Focused DPM control surface backed by lotus-manage through Gateway."
      className="manage-overview-panel"
      actions={
        <SemanticBadge tone={blockedSurfaces.length ? "warn" : "success"}>
          {blockedSurfaces.length ? "Partial" : "Ready"}
        </SemanticBadge>
      }
      >
      <WorkbenchSummaryMetricStrip
        ariaLabel="Manage operating summary"
        items={[
          {
            key: "market-value",
            label: "Total Assets",
            value: formatCurrency(
              portfolio.overview.market_value_base,
              portfolio.portfolio.base_currency
            ),
          },
          {
            key: "positions",
            label: "Positions",
            value: portfolio.overview.position_count,
          },
          {
            key: "cash-weight",
            label: "Cash Weight",
            value: formatPct(portfolio.overview.cash_weight_pct),
          },
          {
            key: "mandate",
            label: "Mandate",
            value: mandateId ?? "N/A",
          },
          {
            key: "waves",
            label: "Wave Surface",
            value: data.wavesError ? "Partial" : "Ready",
          },
          {
            key: "reviews",
            label: "Outcome Reviews",
            value: data.outcomeReviewError ? "Partial" : "Ready",
          },
        ]}
      />
      <div className="manage-readiness-strip" aria-label="Manage operating readiness">
        {[
          {
            label: "Mandate Health",
            value: commandModel.mandateHealthState !== "N/A" ? commandModel.mandateHealthState : commandModel.supportabilityState,
          },
          {
            label: "Source Readiness",
            value: commandModel.dataCompletenessState,
          },
          {
            label: "Active Exceptions",
            value: `${commandModel.activeExceptionCount} Open`,
          },
          {
            label: "Wave",
            value: waveModel.supportabilityState,
          },
          {
            label: "Construction",
            value: "AVAILABLE",
          },
          {
            label: "Memory",
            value: memoryModel.supportabilityState,
          },
          {
            label: "Proof Pack",
            value: latestProofPackId !== "N/A" ? "AVAILABLE" : "NOT_REQUESTED",
          },
        ].map((item) => (
          <div className="manage-readiness-item" key={item.label}>
            <span>{item.label}</span>
            <SemanticBadge tone={toneForState(item.value)}>{item.value}</SemanticBadge>
          </div>
        ))}
      </div>
      <div className="manage-overview-focus-grid">
        <div className="manage-overview-card">
          <div className="manage-overview-card-header">
            <div>
              <Text variant="label">Mandate Health Snapshot</Text>
              <strong>{mandateId ?? commandModel.mandateId}</strong>
            </div>
            <SemanticBadge tone={toneForState(commandModel.mandateHealthState)}>
              {commandModel.mandateHealthState}
            </SemanticBadge>
          </div>
          <DefinitionList
            ariaLabel="Manage mandate health snapshot"
            items={[
              { label: "Type", value: readStringFromResponse(data.mandate, "mandate_type") ?? "Discretionary Balanced" },
              { label: "Risk Profile", value: readStringFromResponse(data.mandate, "risk_profile") ?? "Balanced" },
              { label: "PM Book", value: readStringFromResponse(data.mandate, "pm_book_id") ?? "N/A" },
              { label: "Benchmark", value: readStringFromResponse(data.mandate, "benchmark_id") ?? "N/A" },
              { label: "Last Run", value: commandModel.latestMonitoringRunId },
              { label: "Source State", value: commandModel.dataCompletenessState },
            ]}
          />
        </div>
        <div className="manage-overview-card">
          <div className="manage-overview-card-header">
            <div>
              <Text variant="label">Active Rebalance Wave</Text>
              <strong>{waveModel.selectedWaveId ?? "No active wave"}</strong>
            </div>
            <SemanticBadge tone={toneForState(waveModel.selectedWaveState)}>
              {waveModel.selectedWaveState}
            </SemanticBadge>
          </div>
          <DefinitionList
            ariaLabel="Manage rebalance wave snapshot"
            items={[
              { label: "Trigger", value: waveModel.summaryRows[0]?.triggerType ?? "N/A" },
              { label: "Items", value: waveModel.selectedWaveItemCount },
              { label: "Issues", value: waveModel.selectedWaveIssueCount },
              { label: "Proof Packs", value: waveModel.proofPackRows.length.toString() },
            ]}
          />
          <div className="manage-wave-stepper" aria-label="Rebalance wave lifecycle">
            {["Preview", "Source Check", "Simulation", "Approval", "Staging", "Handoff"].map((step) => (
              <span
                key={step}
                className={step.toUpperCase().includes("SIMULATION") || waveModel.selectedWaveState.includes(step.toUpperCase().replace(" ", "_"))
                  ? "manage-wave-step-active"
                  : ""}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="manage-module-grid" aria-label="Manage module readiness">
        <div className="manage-overview-grid-label">
          <Text variant="label">Manage module readiness</Text>
        </div>
        {moduleItems.map((item) => (
          <a className="manage-module-card" href={item.href} key={item.key}>
            <div className="manage-module-card-header">
              <strong>{item.title}</strong>
              <SemanticBadge tone={item.tone}>{item.state}</SemanticBadge>
            </div>
            <span className="manage-module-metric">{item.metric}</span>
            <span className="manage-module-detail">{item.detail}</span>
            <span className="manage-module-action">{item.action}</span>
          </a>
        ))}
      </div>
      <div className="manage-overview-table-card">
        <div className="manage-overview-card-header">
          <div>
            <Text variant="label">Active Exceptions</Text>
            <strong>{exceptionRows.length} requiring attention</strong>
          </div>
          <a href={buildManageModeHref(portfolioId, "mandate")}>Open exceptions</a>
        </div>
        <table className="manage-overview-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Exception</th>
              <th>Source</th>
              <th>Owner</th>
              <th>Age</th>
              <th>State</th>
              <th>Next Action</th>
            </tr>
          </thead>
          <tbody>
            {exceptionRows.length ? (
              exceptionRows.slice(0, 4).map((row) => (
                <tr key={row.key}>
                  <td><SemanticBadge tone={toneForState(row.severity)}>{row.severity}</SemanticBadge></td>
                  <td>{row.title}</td>
                  <td>{row.source}</td>
                  <td>{row.owner}</td>
                  <td>{row.age}</td>
                  <td>{row.state}</td>
                  <td><a href={buildManageModeHref(portfolioId, "mandate")}>{row.nextAction}</a></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No active exceptions returned by Gateway.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="manage-overview-activity">
        <div className="manage-overview-card-header">
          <div>
            <Text variant="label">Recent Operating Activity</Text>
            <strong>Gateway-backed operating trail</strong>
          </div>
        </div>
        <div className="manage-activity-list" role="list">
          {latestActivities.map((activity) => (
            <div className="manage-activity-row" role="listitem" key={activity.key}>
              <span>{activity.time}</span>
              <strong>{activity.event}</strong>
              <span>{activity.source}</span>
              <span>{activity.evidenceRef}</span>
            </div>
          ))}
        </div>
      </div>
      {blockedSurfaces.length ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Some manage surfaces are degraded"
          body={`Unavailable surfaces: ${blockedSurfaces.join(", ")}.`}
        />
      ) : (
        <Text variant="secondary" className="muted">
          Manage overview is a routing surface. Detailed mandate, wave, construction, memory,
          outcome review, and proof-pack operations remain in their dedicated Manage modes.
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
  const mandateId = readDpmMandateId(data.mandate?.data ?? null);
  const commandModel = buildDpmCommandCenterPanelModel({
    commandCenter: data.commandCenter,
    exceptions: data.commandCenterExceptions,
    mandate: data.mandate,
    mandateHealth: data.mandateHealth,
  });
  const waveModel = buildDpmWaveCommandCenterModel({ waveList: data.waves });
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const sourceServices = Array.from(
    new Set(
      [
        "lotus-gateway",
        data.commandCenter?.source_service,
        data.waves?.source_service,
        data.portfolioMemory?.source_service,
        data.outcomeReviews?.source_service,
      ].filter((service): service is string => Boolean(service))
    )
  ).join(", ");

  return (
    <div className="manage-context-rail">
      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Active Surface</Text>
          <strong>{modeDefinition.title}</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage portfolio context"
          items={[
            { label: "Portfolio", value: portfolio.portfolio_id },
            { label: "Client", value: portfolio.client_id },
            { label: "Booking", value: portfolio.booking_center_code },
            { label: "Base", value: portfolio.base_currency },
            { label: "As Of", value: data.portfolio.as_of_date },
            { label: "Mandate", value: mandateId ?? "N/A" },
            { label: "PM Book", value: readStringFromResponse(data.mandate, "pm_book_id") ?? "N/A" },
          ]}
        />
      </WorkbenchRailCard>

      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Supportability</Text>
          <strong>Gateway Evidence</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage supportability context"
          items={[
            {
              label: "Command Center",
              value: data.commandCenterError ? "Partial" : "Ready",
            },
            { label: "Waves", value: data.wavesError ? "Partial" : "Ready" },
            { label: "Construction", value: "Available" },
            {
              label: "Memory",
              value: data.portfolioMemoryError ? "Partial" : "Ready",
            },
            {
              label: "Reviews",
              value: data.outcomeReviewError ? "Partial" : "Ready",
            },
            { label: "Proof Packs", value: reviewModel.items.some((item) => item.proofPackId !== "N/A") ? "Available" : "Not requested" },
          ]}
        />
      </WorkbenchRailCard>

      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Lineage</Text>
          <strong>Gateway Contract</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage lineage context"
          items={[
            { label: "Correlation", value: commandModel.correlationId },
            { label: "Contract", value: data.commandCenter?.contract_version ?? "manage-workspace.v1" },
            { label: "Last Refresh", value: commandModel.latestMonitoringRunStatus },
            { label: "Wave Ref", value: waveModel.selectedWaveId ?? "N/A" },
            { label: "Sources", value: sourceServices },
          ]}
        />
      </WorkbenchRailCard>

      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Next Actions</Text>
          <strong>Supported Navigation</strong>
        </div>
        <div className="manage-rail-actions">
          {[
            ["Open Mandate Health", "mandate"],
            ["Open Rebalance Waves", "waves"],
            ["Open Construction", "construction"],
            ["Open Portfolio Memory", "memory"],
            ["Open Outcome Reviews", "reviews"],
            ["Open Proof Packs", "proof"],
          ].map(([label, mode]) => (
            <a href={buildManageModeHref(portfolio.portfolio_id, mode as ManageMode)} key={mode}>
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

type OverviewExceptionRow = {
  key: string;
  severity: string;
  title: string;
  source: string;
  owner: string;
  age: string;
  state: string;
  nextAction: string;
};

function buildOverviewExceptionRows(
  exceptions: ManageWorkspaceData["commandCenterExceptions"]
): OverviewExceptionRow[] {
  const records = extractRecords(asRecord(exceptions?.data).items ?? asRecord(exceptions?.data).exceptions);
  return records.map((record, index) => {
    const exceptionId =
      readString(record, "exception_id") ||
      readString(record, "monitoring_exception_id") ||
      `exception-${index + 1}`;
    return {
      key: exceptionId,
      severity: readString(record, "severity") || "UNKNOWN",
      title:
        readString(record, "title") ||
        readString(record, "description") ||
        readString(record, "reason_code") ||
        "Manage exception",
      source:
        readString(record, "source_system") ||
        readString(record, "source_service") ||
        exceptions?.source_service ||
        "lotus-manage",
      owner:
        readString(record, "owner") ||
        readString(record, "remediation_owner") ||
        "PM Ops",
      age: formatAge(record.age_hours ?? record.age_days),
      state: readString(record, "state") || readString(record, "status") || "ACTIVE",
      nextAction:
        readString(record, "next_action") ||
        readString(record, "recommended_action") ||
        "Review",
    };
  });
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
          time: commandModel.latestMonitoringRunStatus,
          event: "Monitoring Run",
          source: commandModel.sourceService,
          evidenceRef: commandModel.latestMonitoringRunId,
        }
      : null,
    waveModel.selectedWaveId
      ? {
          key: "wave",
          time: waveModel.selectedWaveState,
          event: "Wave Posture",
          source: waveModel.sourceService,
          evidenceRef: waveModel.selectedWaveId,
        }
      : null,
    reviewModel.items[0]
      ? {
          key: "review",
          time: reviewModel.items[0].state,
          event: "Outcome Review",
          source: reviewModel.sourceService,
          evidenceRef: reviewModel.items[0].outcomeReviewId,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return rows.length
    ? rows
    : [
        {
          key: "empty",
          time: "N/A",
          event: "No recent operating activity",
          source: "lotus-gateway",
          evidenceRef: "N/A",
        },
      ];
}

function readStringFromResponse(
  response: ManageWorkspaceData["mandate"],
  key: string
): string | null {
  const data = asRecord(response?.data);
  const nestedMandate = asRecord(data.mandate);
  return readString(data, key) || readString(nestedMandate, key);
}

function toneForState(value: string): BadgeTone {
  const normalized = value.toUpperCase();
  if (
    normalized.includes("READY") ||
    normalized.includes("SUPPORTED") ||
    normalized === "AVAILABLE" ||
    normalized === "COMPLETE" ||
    normalized === "SUCCEEDED"
  ) {
    return "success";
  }
  if (
    normalized.includes("PARTIAL") ||
    normalized.includes("DEGRADED") ||
    normalized.includes("REVIEW") ||
    normalized.includes("PENDING") ||
    normalized.includes("MEDIUM")
  ) {
    return "warn";
  }
  if (
    normalized.includes("ERROR") ||
    normalized.includes("FAILED") ||
    normalized.includes("BLOCKED") ||
    normalized.includes("HIGH") ||
    normalized.includes("UNSUPPORTED")
  ) {
    return "danger";
  }
  return "default";
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((value) => value && value.trim().length > 0) ?? "N/A";
}

function formatAge(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 24) {
      return `${Math.round(value / 24)}d`;
    }
    return `${Math.round(value)}h`;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "N/A";
}

function extractRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function buildManageModeItems(portfolioId: string, activeMode: ManageMode): PortfolioScreenRailModeItem[] {
  return MANAGE_MODE_DEFINITIONS.map((mode) => ({
    key: mode.key,
    label: mode.label,
    detail: mode.detail,
    active: activeMode === mode.key,
    href: buildManageModeHref(portfolioId, mode.key),
    title: mode.description,
  }));
}

function buildManageModeHref(portfolioId: string, mode: ManageMode) {
  const encoded = encodeURIComponent(portfolioId);
  return mode === "overview" ? `/workbench/${encoded}` : `/workbench/${encoded}?mode=${mode}`;
}

export function normalizeManageMode(value: string | undefined): ManageMode {
  const requested = value?.trim().toLowerCase();
  return MANAGE_MODE_DEFINITIONS.some((mode) => mode.key === requested)
    ? (requested as ManageMode)
    : "overview";
}

function getManageModeDefinition(mode: ManageMode) {
  return MANAGE_MODE_DEFINITIONS.find((definition) => definition.key === mode) ?? MANAGE_MODE_DEFINITIONS[0];
}

function readSettledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function readSettledError<T>(result: PromiseSettledResult<T>, fallback: string): string | null {
  if (result.status === "fulfilled") {
    return null;
  }
  return result.reason instanceof Error ? result.reason.message : fallback;
}

function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

export function readDpmMandateId(data: Record<string, unknown> | null): string | null {
  if (!data) {
    return null;
  }
  if (typeof data.mandate_id === "string" && data.mandate_id.trim().length > 0) {
    return data.mandate_id;
  }
  const mandate = data.mandate;
  if (mandate && typeof mandate === "object" && !Array.isArray(mandate)) {
    const mandateId = (mandate as Record<string, unknown>).mandate_id;
    return typeof mandateId === "string" && mandateId.trim().length > 0 ? mandateId : null;
  }
  return null;
}
