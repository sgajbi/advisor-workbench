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
      return (
        <>
          <ManageOverview data={data} mandateId={mandateId} />
          <DpmCommandCenterPanel
            commandCenter={data.commandCenter}
            exceptions={data.commandCenterExceptions}
            mandate={data.mandate}
            mandateHealth={data.mandateHealth}
            errorMessage={data.commandCenterError}
          />
        </>
      );
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
  const blockedSurfaces = [
    data.commandCenterError ? "Mandate command center" : null,
    data.wavesError ? "Rebalance waves" : null,
    data.portfolioMemoryError ? "Portfolio memory" : null,
    data.outcomeReviewError ? "Outcome reviews" : null,
  ].filter((surface): surface is string => Boolean(surface));

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
      {blockedSurfaces.length ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Some manage surfaces are degraded"
          body={`Unavailable surfaces: ${blockedSurfaces.join(", ")}.`}
        />
      ) : (
        <Text variant="secondary" className="muted">
          Manage data is rendered from supported Gateway endpoints. Use the left rail to move into
          mandate, waves, construction, memory, outcome review, and proof-pack workspaces.
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
            {
              label: "Memory",
              value: data.portfolioMemoryError ? "Partial" : "Ready",
            },
            {
              label: "Reviews",
              value: data.outcomeReviewError ? "Partial" : "Ready",
            },
          ]}
        />
      </WorkbenchRailCard>
    </div>
  );
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
