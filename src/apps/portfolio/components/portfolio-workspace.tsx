"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  ActionLink,
  AnalyticsModule,
  DataGridCard,
  DeferredModulePlaceholder,
  DegradedStatePanel,
  MainWithSideRailLayout,
  MetricRow,
  Panel,
  SectionHeader,
  SectionLabel,
  SemanticBadge,
  Text,
  WorkbenchLoadingState,
  WorkbenchPageFrame,
  WorkbenchRailCard,
  WorkbenchSectionStack,
  WorkspaceGrid,
} from "@/design-system";

import {
  formatBookingCenter,
  formatBooleanFlag,
  formatCount,
  formatCurrency,
  formatDate,
  formatPct,
  formatQuantity,
  formatStatus,
} from "../formatters";
import type {
  PortfolioAllocationSelection,
  PortfolioHoldingsDrilldownFilter,
  PortfolioPositionView,
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import {
  getCoverageWarningLabel,
  getEvidenceServiceLabel,
} from "../workspace-config";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  buildPortfolioExceptionSummaries,
  buildPortfolioInsights,
  buildPortfolioReadinessIndicators,
  buildPortfolioWorkflowActions,
  buildActivityDrilldownLabel,
  buildAllocationDrilldownLabel,
  buildHoldingsStatusDrilldownLabel,
  buildSecurityDrilldownLabel,
  filterPositionsByDrilldown,
  filterTransactionsByDrilldown,
  getPositionsNeedingPricing,
  getRelatedTransactionsForSecurity,
  getActivityDisplayCurrency,
  getBookReadinessStatus,
  getBookReadinessSupport,
  getBookReadinessTone,
  getIncomeDisplayCurrency,
  getInvestedAssetWeight,
  getNetFlowTone,
  getOrderedWorkflowCues,
  getRequestedWindowActivityAmount,
  getRequestedWindowActivityCount,
  getYearToDateActivityAmount,
} from "../view-model";
import PortfolioCollapsibleModule from "./portfolio-collapsible-module";
import PortfolioPairedAnalyticsSection from "./portfolio-paired-analytics-section";
import type { HoldingsRow } from "./portfolio-holdings-grid";
import PortfolioPerformanceSnapshotModule from "./portfolio-performance-snapshot-module";
import PortfolioDrilldownDisclosure from "./portfolio-drilldown-disclosure";
import PortfolioLiquiditySummaryModule from "./portfolio-liquidity-summary-module";
import PortfolioModuleState from "./portfolio-module-state";
import PortfolioPageHeaderStatus from "./portfolio-page-header-status";
import PortfolioRail from "./portfolio-rail";
import type { TransactionRow } from "./portfolio-transactions-grid";
import PortfolioActionsModule from "../modules/portfolio-actions/portfolio-actions-module";
import PortfolioContextModule from "../modules/portfolio-context/portfolio-context-module";
import PortfolioHealthStrip from "../modules/portfolio-health/portfolio-health-strip";
import PortfolioInsightsStrip from "../modules/portfolio-insights/portfolio-insights-strip";
import PortfolioReadinessModule from "../modules/portfolio-readiness/portfolio-readiness-module";
import {
  getPortfolioWorkspaceCapabilities,
  type PortfolioWorkspaceCapabilities,
} from "../capabilities";
import { isRenderableCapability } from "@/shell/workspace-capabilities";

// Workbench discipline:
// first paint stays limited to framing, hero, KPI, exceptions, and side-rail summary cards.
// Heavy analytical modules and drill-down surfaces load after first paint or when the user opens them.
const DeferredPortfolioAllocationPanel = dynamic(() => import("./portfolio-allocation-panel"), {
  ssr: false,
  loading: () => (
    <DeferredModulePlaceholder
      title="Loading allocation"
      message="Allocation analytics are loading after first paint."
    />
  ),
});

const DeferredPortfolioTopHoldingsPanel = dynamic(
  () => import("./portfolio-chart-panels").then((module) => module.PortfolioTopHoldingsPanel),
  {
    ssr: false,
    loading: () => (
      <DeferredModulePlaceholder
        title="Loading top holdings"
        message="Holdings concentration is loading after first paint."
      />
    ),
  }
);

const DeferredPortfolioHoldingsGrid = dynamic(() => import("./portfolio-holdings-grid"), {
  ssr: false,
  loading: () => (
    <DeferredModulePlaceholder
      title="Loading holdings"
      message="Holdings drill-down loads when the section is opened."
    />
  ),
});

const DeferredPortfolioTransactionsGrid = dynamic(() => import("./portfolio-transactions-grid"), {
  ssr: false,
  loading: () => (
    <DeferredModulePlaceholder
      title="Loading transactions"
      message="Transaction drill-down loads when the section is opened."
    />
  ),
});

const DeferredPortfolioProjectedCashflowModule = dynamic(
  () => import("./portfolio-projected-cashflow-module"),
  {
    ssr: false,
    loading: () => (
      <DeferredModulePlaceholder
        title="Loading projected cashflow"
        message="Projected liquidity is loading when the section is opened."
      />
    ),
  }
);

const DeferredPortfolioDetailDrawer = dynamic(() => import("./portfolio-detail-drawer"), {
  ssr: false,
});

type PortfolioDetailDrawerState = {
  kicker: string;
  title: string;
  subtitle?: string;
  summaryItems: Array<{
    label: string;
    value: string;
  }>;
  tabs: Array<{
    key: string;
    label: string;
    content: ReactNode;
  }>;
  fullPageHref: string;
  fullPageLabel: string;
};

export default function PortfolioWorkspaceView({
  portfolios,
  selectedPortfolioId,
  workspace,
  context,
  detailsLoading,
  toolbar,
}: {
  portfolios: Array<{
    portfolio_id: string;
    display_name: string;
    base_currency: string;
    client_id: string | null;
    booking_center_code: string | null;
  }>;
  selectedPortfolioId: string | null;
  workspace: PortfolioWorkspace | null;
  context: PortfolioWorkspaceContext;
  detailsLoading: boolean;
  toolbar?: ReactNode;
}) {
  const [holdingsDrilldown, setHoldingsDrilldown] =
    useState<PortfolioHoldingsDrilldownFilter | null>(null);
  const [transactionDrilldown, setTransactionDrilldown] =
    useState<PortfolioTransactionDrilldownFilter | null>(null);
  const [copiedContextField, setCopiedContextField] = useState<string | null>(null);
  const [detailDrawer, setDetailDrawer] = useState<PortfolioDetailDrawerState | null>(null);
  const orderedWorkflowCues = workspace ? getOrderedWorkflowCues(workspace) : [];
  const setupActions = workspace?.workflow_actions ?? (workspace ? buildPortfolioWorkflowActions(workspace) : []);
  const primaryWorkflowCue = orderedWorkflowCues.find((cue) => cue.key === "performance") ?? orderedWorkflowCues[0];
  const readinessIndicators = workspace
    ? workspace.readiness_indicators ?? buildPortfolioReadinessIndicators(workspace, context.viewMode)
    : [];
  const exceptionSummaries = workspace
    ? workspace.exception_summaries ?? buildPortfolioExceptionSummaries(workspace)
    : [];
  const insights = workspace ? workspace.insights ?? buildPortfolioInsights(workspace) : [];
  const [dismissedInsightKeys, setDismissedInsightKeys] = useState<string[]>([]);
  const [sectionPreferences, setSectionPreferences] = useState<Record<string, boolean>>({});
  const isSummaryView = context.viewMode === "summary";
  const isDetailedView = context.viewMode === "detailed";
  const showAttentionOnly = context.focusExceptions && Boolean(workspace?.partial_failures.length);
  const showInsights = !showAttentionOnly;
  const showChanges = isDetailedView && !showAttentionOnly;
  const showDrilldown = isDetailedView && !showAttentionOnly;
  const showReadinessDetailGroup = isDetailedView;
  const showLiquidityModule = isDetailedView;
  const capabilities = workspace
    ? getPortfolioWorkspaceCapabilities(workspace, {
        viewMode: context.viewMode,
        hideEmptyModules: context.hideEmptyModules,
      })
    : null;
  const showChangeHighlights =
    isSummaryView &&
    !showAttentionOnly &&
    (detailsLoading ||
      Boolean(
        capabilities &&
          (isRenderableCapability(capabilities.income) ||
            isRenderableCapability(capabilities.activity))
      ));
  const incomeDisplayCurrency = getIncomeDisplayCurrency(
    workspace?.income_summary,
    context.selectedReportingCurrency,
    workspace?.portfolio.base_currency ?? "USD"
  );
  const activityDisplayCurrency = getActivityDisplayCurrency(
    workspace?.activity_summary,
    context.selectedReportingCurrency,
    workspace?.portfolio.base_currency ?? "USD"
  );
  const filteredPositions = useMemo(
    () => (workspace ? filterPositionsByDrilldown(workspace.positions, holdingsDrilldown) : []),
    [holdingsDrilldown, workspace]
  );
  const holdingsFilterCopy = holdingsDrilldown?.label ?? null;
  const visibleInsights = insights.filter((insight) => !dismissedInsightKeys.includes(insight.key));
  const priorityReadinessIndicators = readinessIndicators.filter(
    (indicator) => indicator.status !== "Ready"
  );
  const showHealthSection = isDetailedView;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextPreferences = PORTFOLIO_COLLAPSIBLE_SECTION_KEYS.reduce<Record<string, boolean>>(
      (accumulator, key) => {
        const storedValue = window.localStorage.getItem(getPortfolioSectionStorageKey(key));
        if (storedValue === "true" || storedValue === "false") {
          accumulator[key] = storedValue === "true";
        }
        return accumulator;
      },
      {}
    );

    setSectionPreferences(nextPreferences);
  }, []);

  const copyContextValue = async (key: string, value: string | null | undefined) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedContextField(key);
      window.setTimeout(() => {
        setCopiedContextField((current) => (current === key ? null : current));
      }, 1600);
    } catch {
      setCopiedContextField(null);
    }
  };

  const getSectionExpanded = (sectionKey: PortfolioCollapsibleSectionKey) =>
    sectionPreferences[sectionKey] ?? getDefaultSectionExpanded(sectionKey, context.viewMode);

  const toggleSection = (sectionKey: PortfolioCollapsibleSectionKey) => {
    setSectionPreferences((current) => {
      const nextExpanded = !(current[sectionKey] ?? getDefaultSectionExpanded(sectionKey, context.viewMode));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(getPortfolioSectionStorageKey(sectionKey), String(nextExpanded));
      }
      return {
        ...current,
        [sectionKey]: nextExpanded,
      };
    });
  };

  const clearHoldingsDrilldown = () => setHoldingsDrilldown(null);
  const clearTransactionDrilldown = () => setTransactionDrilldown(null);

  const scrollToSection = (sectionId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      const element = document.getElementById(sectionId);
      if (element && typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const openTransactionDrilldown = (filter: PortfolioTransactionDrilldownFilter) => {
    setTransactionDrilldown(filter);
    if (context.viewMode === "detailed") {
      setSectionPreferences((current) => {
        const next = { ...current, transactions: true };
        window.localStorage.setItem(getPortfolioSectionStorageKey("transactions"), "true");
        return next;
      });
      scrollToSection("portfolio-drilldown");
      return;
    }

    if (!workspace) {
      return;
    }

    setDetailDrawer(
      buildTransactionDrilldownDrawer(
        filter,
        workspace,
        filterTransactionsByDrilldown(workspace.recent_transactions, filter),
        workspace.portfolio.base_currency
      )
    );
  };

  const handlePricingExceptionDrilldown = () => {
    if (!workspace) {
      return;
    }

    const affectedPositions = getPositionsNeedingPricing(workspace);
    if (!affectedPositions.length) {
      return;
    }

    setHoldingsDrilldown({
      kind: "status",
      status: "Unpriced",
      label: buildHoldingsStatusDrilldownLabel("Unpriced"),
    });

    if (context.viewMode === "detailed") {
      setSectionPreferences((current) => {
        const next = { ...current, holdings: true };
        window.localStorage.setItem(getPortfolioSectionStorageKey("holdings"), "true");
        return next;
      });
      scrollToSection("portfolio-drilldown");
      return;
    }

    const pricingException = exceptionSummaries.find((item) => item.key === "pricing");
    if (pricingException) {
      setDetailDrawer(buildExceptionDrawer(pricingException, workspace, context, affectedPositions));
    }
  };

  const handleOpenException = (exception: {
    key: string;
    title: string;
    detail: string;
    tone: "neutral" | "success" | "warn" | "danger";
    href: string;
  }) => {
    if (exception.key === "pricing") {
      handlePricingExceptionDrilldown();
      return;
    }

    if (workspace) {
      setDetailDrawer(buildExceptionDrawer(exception, workspace, context));
    }
  };

  return (
    <>
      <MainWithSideRailLayout
        sideDensity="comfortable"
        className="portfolio-layout"
        railClassName="portfolio-rail-shell"
        mainClassName="portfolio-main"
        sideClassName="portfolio-side portfolio-side-wide"
        rail={<PortfolioRail portfolios={portfolios} selectedPortfolioId={selectedPortfolioId} />}
        main={
          <>
            <WorkbenchPageFrame
              className="portfolio-page-frame"
              bodyClassName="portfolio-page-frame-body"
              title="Portfolio"
              subtitle="Front-office portfolio context, readiness, and decision support"
              actions={
                <PortfolioPageHeaderStatus
                  label={portfolios.length ? "Catalog live" : "Catalog unavailable"}
                  tone={portfolios.length ? "success" : "warn"}
                />
              }
            >
              <WorkbenchSectionStack className="portfolio-page-sections">
                {toolbar}
                {!workspace ? (
                    <DegradedStatePanel
                    title="Portfolio context unavailable"
                    status="Workspace unavailable"
                    actions={[
                      { href: "/performance", label: "Performance" },
                      { href: "/workbench", label: "Open Operations" },
                    ]}
                  >
                    <p className="error-text">We could not load the selected portfolio briefing.</p>
                  </DegradedStatePanel>
                ) : (
                  <>
                    <div className="portfolio-summary-cluster">
                      <PortfolioSummaryHeaderSection
                        workspace={workspace}
                        context={context}
                        activityDisplayCurrency={activityDisplayCurrency}
                        orderedWorkflowCues={orderedWorkflowCues}
                        primaryWorkflowCueKey={primaryWorkflowCue?.key ?? null}
                        readinessIndicators={priorityReadinessIndicators}
                        onOpenMetricDrawer={(metric) =>
                          setDetailDrawer(buildMetricDrawer(metric, workspace, context, activityDisplayCurrency))
                        }
                      />

                      <PortfolioExceptionsSection workspace={workspace} />

                      <PortfolioInsightsSection
                        workspace={workspace}
                        context={context}
                        capabilities={capabilities!}
                        detailsLoading={detailsLoading}
                        showInsights={showInsights}
                        showLiquidityModule={showLiquidityModule}
                        showChangeHighlights={showChangeHighlights}
                        incomeDisplayCurrency={incomeDisplayCurrency}
                        activityDisplayCurrency={activityDisplayCurrency}
                        visibleInsights={visibleInsights}
                        holdingsDrilldown={holdingsDrilldown}
                        filteredPositions={filteredPositions}
                        transactionDrilldown={transactionDrilldown}
                        onDismissInsight={(key) =>
                          setDismissedInsightKeys((current) => [...current, key])
                        }
                        onSelectAllocation={(selection) => {
                          setTransactionDrilldown(null);
                          setHoldingsDrilldown(
                            selection
                              ? {
                                  kind: "allocation",
                                  selection,
                                  label: `Filtered by ${buildAllocationDrilldownLabel(
                                    selection.dimension,
                                    selection.bucket
                                  )}`,
                                }
                              : null
                          );
                        }}
                        onSelectTopHolding={(securityId) => {
                          setTransactionDrilldown(null);
                          setHoldingsDrilldown(
                            securityId
                              ? {
                                  kind: "security",
                                  security_id: securityId,
                                  label: buildSecurityDrilldownLabel(
                                    workspace.top_positions.find((position) => position.security_id === securityId)
                                      ?.instrument_name ?? "Selected holding",
                                    "holdings"
                                  ),
                                }
                              : null
                          );
                        }}
                        onSelectActivityBucket={(bucket) => {
                          if (!bucket) {
                            clearTransactionDrilldown();
                            return;
                          }
                          openTransactionDrilldown({
                            kind: "activity",
                            bucket,
                            label: buildActivityDrilldownLabel(bucket),
                          });
                        }}
                        getSectionExpanded={getSectionExpanded}
                        toggleSection={toggleSection}
                      />
                    </div>

                    <div className="portfolio-detailed-cluster">
                      <PortfolioHealthSection
                        workspace={workspace}
                        context={context}
                        showHealthSection={showHealthSection}
                      />

                      <PortfolioChangesSection
                        workspace={workspace}
                        context={context}
                        capabilities={capabilities!}
                        showChanges={showChanges}
                        incomeDisplayCurrency={incomeDisplayCurrency}
                        activityDisplayCurrency={activityDisplayCurrency}
                        transactionDrilldown={transactionDrilldown}
                        isDetailedView={isDetailedView}
                        onSelectActivityBucket={(bucket) => {
                          if (!bucket) {
                            clearTransactionDrilldown();
                            return;
                          }
                          openTransactionDrilldown({
                            kind: "activity",
                            bucket,
                            label: buildActivityDrilldownLabel(bucket),
                          });
                        }}
                        getSectionExpanded={getSectionExpanded}
                        toggleSection={toggleSection}
                      />

                      <PortfolioDrilldownSection
                        workspace={workspace}
                        context={context}
                        capabilities={capabilities!}
                        detailsLoading={detailsLoading}
                        showDrilldown={showDrilldown}
                        isDetailedView={isDetailedView}
                        filteredPositions={filteredPositions}
                        holdingsFilterCopy={holdingsFilterCopy}
                        transactionDrilldown={transactionDrilldown}
                        onClearHoldingsDrilldown={clearHoldingsDrilldown}
                        onClearTransactionDrilldown={clearTransactionDrilldown}
                        onSelectHoldingRow={(row) =>
                          setDetailDrawer(
                            buildHoldingDrawer(
                              row,
                              workspace.portfolio.portfolio_id,
                              workspace.portfolio.base_currency,
                              getRelatedTransactionsForSecurity(workspace, row.securityId)
                            )
                          )
                        }
                        onSelectTransactionRow={(row) =>
                          setDetailDrawer(
                            buildTransactionDrawer(
                              row,
                              workspace.portfolio.portfolio_id,
                              workspace.portfolio.base_currency
                            )
                          )
                        }
                        getSectionExpanded={getSectionExpanded}
                        setSectionPreferences={setSectionPreferences}
                      />
                    </div>
                  </>
                )}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          </>
        }
        side={
          workspace ? (
            <>
              <PortfolioContextModule
                workspace={workspace}
                context={context}
                copiedField={copiedContextField}
                onCopy={copyContextValue}
              />

              <PortfolioReadinessModule
                exceptions={exceptionSummaries}
                workspace={workspace}
                showDetailFootnote={showReadinessDetailGroup}
                onOpenException={handleOpenException}
              />

              <PortfolioActionsModule actions={setupActions} />
            </>
          ) : (
            <WorkbenchRailCard className="portfolio-side-card">
              <div className="portfolio-card-header">
                <Text variant="cardTitle">Available Work Areas</Text>
                <Text variant="secondary">
                  Open adjacent portfolio workflows while the main briefing is unavailable.
                </Text>
              </div>
              <div className="toolbar">
                <ActionLink href="/performance">Performance</ActionLink>
                <ActionLink href="/workbench">Open Operations</ActionLink>
              </div>
            </WorkbenchRailCard>
          )
        }
      />

      <PortfolioDetailDrawerController
        detailDrawer={detailDrawer}
        onClose={() => setDetailDrawer(null)}
      />
    </>
  );
}

function PortfolioSummaryHeaderSection({
  workspace,
  context,
  activityDisplayCurrency,
  orderedWorkflowCues,
  primaryWorkflowCueKey,
  readinessIndicators,
  onOpenMetricDrawer,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  activityDisplayCurrency: string;
  orderedWorkflowCues: Array<{ key: string; label: string; href: string }>;
  primaryWorkflowCueKey: string | null;
  readinessIndicators: ReturnType<typeof buildPortfolioReadinessIndicators>;
  onOpenMetricDrawer: (metric: PortfolioMetricDrawerKey) => void;
}) {
  return (
    <section
      id="portfolio-summary"
      className="portfolio-workspace-section portfolio-summary-cluster-section portfolio-summary-cluster-hero"
    >
      <Panel className="portfolio-hero portfolio-book-hero">
        <div className="portfolio-hero-content">
          <SectionLabel>Portfolio Book</SectionLabel>
          <h2>{workspace.portfolio.display_name}</h2>
          <div className="portfolio-hero-meta">
            <span>{workspace.portfolio.base_currency}</span>
            {workspace.portfolio.client_id ? <span>{workspace.portfolio.client_id}</span> : null}
            {workspace.portfolio.booking_center_code ? (
              <span>{formatBookingCenter(workspace.portfolio.booking_center_code)}</span>
            ) : null}
            {workspace.profile.status ? (
              <SemanticBadge className="portfolio-hero-status">
                {formatStatus(workspace.profile.status)}
              </SemanticBadge>
            ) : null}
          </div>
        </div>
        <div className="portfolio-hero-actions portfolio-hero-toolbar">
          {orderedWorkflowCues.map((cue) => (
            <ActionLink
              key={cue.key}
              href={cue.href}
              className={
                cue.key === primaryWorkflowCueKey
                  ? "portfolio-action-link portfolio-action-link-primary"
                  : "portfolio-action-link portfolio-action-link-secondary"
              }
            >
              {cue.label}
            </ActionLink>
          ))}
        </div>
      </Panel>

      <PortfolioHealthStrip
        tiles={[
          {
            key: "aum",
            label: "AUM",
            value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency),
            definition:
              "Total portfolio market value in the portfolio base currency as of the selected date.",
            support: `As of ${formatDate(context.selectedAsOfDate)}`,
            onClick: () => onOpenMetricDrawer("aum"),
          },
          {
            key: "invested_assets",
            label: "Invested Assets",
            value: formatCurrency(
              workspace.summary.invested_market_value_base,
              workspace.portfolio.base_currency
            ),
            definition:
              "Market value currently invested in funded holdings, excluding operational cash inventory.",
            support: `${formatPct(getInvestedAssetWeight(workspace))} of AUM`,
            onClick: () => onOpenMetricDrawer("invested_assets"),
          },
          {
            key: "available_cash",
            label: "Available Cash",
            value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency),
            definition:
              "Available cash inventory in the portfolio base currency across published cash balances.",
            support: `${formatPct(workspace.summary.cash_weight_pct)} cash allocation`,
            onClick: () => onOpenMetricDrawer("available_cash"),
          },
          {
            key: "holdings",
            label: "Holdings",
            value: workspace.summary.position_count,
            definition: "Number of currently valued holdings in the portfolio book.",
            support: formatCount(workspace.summary.position_count, "holding"),
            onClick: () => onOpenMetricDrawer("holdings"),
          },
          {
            key: "net_flow_30d",
            label: "30D Net Flow",
            value: formatCurrency(getRequestedWindowActivityAmount(workspace), activityDisplayCurrency),
            definition:
              "Net booked portfolio activity across the requested 30-day reporting window, including funding, fees, and other ledger movements.",
            support: `${getRequestedWindowActivityCount(workspace)} booked events`,
            tone: getNetFlowTone(workspace),
            onClick: () => onOpenMetricDrawer("net_flow_30d"),
          },
          {
            key: "book_readiness",
            label: "Book Readiness",
            value: getBookReadinessStatus(workspace),
            definition:
              "Operational readiness based on holdings coverage, reporting status, publish eligibility, and active blocking exceptions.",
            support: getBookReadinessSupport(workspace),
            tone: getBookReadinessTone(workspace),
            onClick: () => onOpenMetricDrawer("book_readiness"),
          },
        ]}
      />

      <PortfolioInsightsStrip
        insights={[]}
        readinessIndicators={readinessIndicators}
        onDismissInsight={() => undefined}
      />
    </section>
  );
}

function PortfolioExceptionsSection({ workspace }: { workspace: PortfolioWorkspace }) {
  return (
    <section
      id="portfolio-attention"
      className="portfolio-workspace-section portfolio-summary-cluster-section"
    >
      <SectionHeader
        title={workspace.partial_failures.length ? "Critical Exceptions and Blockers" : "Exceptions"}
        subtitle={
          workspace.partial_failures.length
            ? "Unresolved issues affecting reporting, valuation, or operations."
            : "Current reporting and operational exception status."
        }
      />
      {workspace.partial_failures.length ? (
        <AnalyticsModule
          title="Data Coverage"
          subtitle="Source exceptions affecting operational completeness."
        >
          <MetricRow label="Active exceptions" value={workspace.partial_failures.length} />
          <div className="portfolio-guidance-list">
            {workspace.partial_failures.map((failure) => (
              <div
                key={`${failure.source_service}-${failure.error_code}`}
                className="portfolio-guidance-item"
              >
                <strong>{getEvidenceServiceLabel(failure.source_service)}</strong>
                <span className="portfolio-evidence-meta">{failure.error_code}</span>
                <p className="portfolio-evidence-copy">{failure.detail}</p>
              </div>
            ))}
          </div>
        </AnalyticsModule>
      ) : (
        <Panel>
          <div className="portfolio-empty-state">
            <strong>No active exceptions</strong>
            <p className="muted">Reporting and operational checks are currently clear.</p>
          </div>
        </Panel>
      )}
    </section>
  );
}

function PortfolioHealthSection({
  workspace,
  context,
  showHealthSection,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  showHealthSection: boolean;
}) {
  if (!showHealthSection) {
    return null;
  }

  return (
    <section
      id="portfolio-health"
      className="portfolio-workspace-section portfolio-detailed-cluster-section"
    >
      <SectionHeader
        title="Portfolio Health Snapshot"
        subtitle={`Readiness and coverage as of ${formatDate(context.selectedAsOfDate)}.`}
      />
      <WorkspaceGrid className="portfolio-primary-grid">
        <AnalyticsModule
          title="Mandate Overview"
          subtitle="Mandate fit, risk posture, and operating parameters."
        >
          <div className="portfolio-mandate-grid">
            <MetricRow label="Status" value={formatStatus(workspace.profile.status)} />
            <MetricRow
              label="Portfolio type"
              value={formatStatus(workspace.profile.portfolio_type)}
            />
            <MetricRow
              label="Risk profile"
              value={formatStatus(workspace.profile.risk_exposure)}
            />
            <MetricRow
              label="Investment horizon"
              value={formatStatus(workspace.profile.investment_time_horizon)}
            />
            <MetricRow
              label="Objective"
              value={workspace.profile.objective ?? "N/A"}
              className="portfolio-objective-row"
            />
            <MetricRow
              label="Leverage allowed"
              value={formatBooleanFlag(workspace.profile.is_leverage_allowed)}
            />
          </div>
        </AnalyticsModule>

        <AnalyticsModule
          title="Health and Coverage"
          subtitle="Readiness indicators, source coverage, and active exceptions."
        >
          <div className="portfolio-mandate-grid">
            <MetricRow
              label="Holdings Coverage"
              value={workspace.readiness.has_positions ? "Ready" : "Pending"}
            />
            <MetricRow
              label="Reporting Status"
              value={formatStatus(workspace.readiness.reporting.status)}
            />
            <MetricRow
              label="Publishing Allowed"
              value={formatBooleanFlag(workspace.operations?.publish_allowed)}
            />
            <MetricRow label="Exceptions" value={workspace.partial_failures.length} />
          </div>
          {workspace.warnings.length ? (
            <div className="portfolio-warning-list">
              {workspace.warnings.map((warning) => (
                <SemanticBadge key={warning} tone="warn">
                  {getCoverageWarningLabel(warning)}
                </SemanticBadge>
              ))}
            </div>
          ) : null}
        </AnalyticsModule>
      </WorkspaceGrid>
    </section>
  );
}

function PortfolioInsightsSection({
  workspace,
  context,
  capabilities,
  detailsLoading,
  showInsights,
  showLiquidityModule,
  showChangeHighlights,
  incomeDisplayCurrency,
  activityDisplayCurrency,
  visibleInsights,
  holdingsDrilldown,
  filteredPositions,
  transactionDrilldown,
  onDismissInsight,
  onSelectAllocation,
  onSelectTopHolding,
  onSelectActivityBucket,
  getSectionExpanded,
  toggleSection,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  showInsights: boolean;
  showLiquidityModule: boolean;
  showChangeHighlights: boolean;
  incomeDisplayCurrency: string;
  activityDisplayCurrency: string;
  visibleInsights: ReturnType<typeof buildPortfolioInsights>;
  holdingsDrilldown: PortfolioHoldingsDrilldownFilter | null;
  filteredPositions: PortfolioWorkspace["positions"];
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onDismissInsight: (key: string) => void;
  onSelectAllocation: (selection: PortfolioAllocationSelection | null) => void;
  onSelectTopHolding: (securityId: string | null) => void;
  onSelectActivityBucket: (bucket: string | null) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  toggleSection: (sectionKey: PortfolioCollapsibleSectionKey) => void;
}) {
  if (!showInsights) {
    return null;
  }

  const isSummaryView = context.viewMode === "summary";
  const showPerformanceSnapshot = isRenderableCapability(capabilities.performanceSnapshot);
  const showAllocationModule = isRenderableCapability(capabilities.allocation);
  const showTopHoldingsModule = isRenderableCapability(capabilities.topHoldings);
  const showInsightsSummaryBand =
    visibleInsights.length > 0 || showLiquidityModule || showPerformanceSnapshot;
  return (
    <section className="portfolio-workspace-section portfolio-summary-cluster-section">
      <SectionHeader
        title="Portfolio Insights"
        subtitle="Allocation, concentration, liquidity, and recent activity."
      />
      {showInsightsSummaryBand ? (
        <div className="portfolio-insights-summary-band workbench-summary-region">
          <PortfolioInsightsStrip
            insights={visibleInsights}
            readinessIndicators={[]}
            onDismissInsight={onDismissInsight}
          />
          {showLiquidityModule || showPerformanceSnapshot ? (
            <WorkspaceGrid className="portfolio-primary-grid portfolio-insights-summary-grid">
              {showLiquidityModule ? (
                <PortfolioLiquiditySummaryModule
                  capability={capabilities.projectedCashflow}
                  cashflowOutlook={workspace.cashflow_outlook}
                  totalCashBase={workspace.summary.total_cash_base}
                  cashWeightPct={workspace.summary.cash_weight_pct}
                  baseCurrency={workspace.portfolio.base_currency}
                  asOfDate={context.selectedAsOfDate}
                />
              ) : null}
              {showPerformanceSnapshot ? (
                <PortfolioPerformanceSnapshotModule
                  capability={capabilities.performanceSnapshot}
                  performance={workspace.performance}
                  rebalance={workspace.rebalance}
                  reportingRowCount={workspace.readiness.reporting.row_count}
                  context={context}
                  portfolioId={workspace.portfolio.portfolio_id}
                  selectedPeriod={context.timeWindow}
                  expanded={getSectionExpanded("performance-snapshot")}
                  onToggle={() => toggleSection("performance-snapshot")}
                />
              ) : null}
            </WorkspaceGrid>
          ) : null}
        </div>
      ) : null}
      <WorkspaceGrid className="portfolio-primary-grid">
          {showAllocationModule ? (
            <PortfolioCollapsibleModule
              className="portfolio-summary-module-card"
              compact={isSummaryView}
            title="Portfolio Allocation"
            subtitle={`Composition overview as of ${formatDate(context.selectedAsOfDate)}.`}
            expanded={getSectionExpanded("allocation")}
            onToggle={() => toggleSection("allocation")}
          >
            {detailsLoading ? (
              <WorkbenchLoadingState
                title="Loading allocation"
                message="Allocation analytics are loading for the selected portfolio context."
                chart
                rows={4}
              />
            ) : workspace.allocation_views?.length ? (
              <DeferredPortfolioAllocationPanel
                allocationViews={workspace.allocation_views}
                baseCurrency={workspace.portfolio.base_currency}
                compact={isSummaryView}
                selectedAllocation={
                  holdingsDrilldown?.kind === "allocation" ? holdingsDrilldown.selection : null
                }
                onSelectionChange={onSelectAllocation}
              />
            ) : (
              <PortfolioModuleState
                variant="capability"
                capability={capabilities.allocation}
                partialTitle="Allocation is partially available"
                unavailableTitle="No allocation data yet"
                body={
                  capabilities.allocation.reason ??
                  "Allocation becomes available once funded holdings are valued."
                }
                partialHint="Publish current prices and valuation outputs to complete the composition view."
                unavailableHint="Book positions and publish prices to generate allocation views."
                why={{
                  body:
                    capabilities.allocation.state === "partial"
                      ? "Allocation requires valued holdings. Until positions have current prices and market values, composition buckets cannot be calculated reliably."
                      : "Allocation requires funded holdings with current valuations. Empty or unvalued books cannot produce allocation views.",
                  label:
                    capabilities.allocation.state === "partial"
                      ? "Why allocation is partially available"
                      : "Why allocation data is unavailable",
                }}
                illustration
              />
            )}
          </PortfolioCollapsibleModule>
        ) : null}

        {showTopHoldingsModule ? (
          <PortfolioCollapsibleModule
            className="portfolio-summary-module-card"
            compact={isSummaryView}
            title="Top Holdings"
            subtitle={`Largest holdings by market value or weight as of ${formatDate(context.selectedAsOfDate)}.`}
            expanded={getSectionExpanded("top-holdings")}
            onToggle={() => toggleSection("top-holdings")}
          >
            {detailsLoading ? (
              <WorkbenchLoadingState
                title="Loading top holdings"
                message="Holdings concentration is loading for the selected portfolio context."
                chart
                rows={4}
              />
            ) : workspace.top_positions.length ? (
              <DeferredPortfolioTopHoldingsPanel
                positions={
                  holdingsDrilldown?.kind === "allocation"
                    ? filteredPositions
                        .slice()
                        .sort((left, right) => (right.market_value_base ?? 0) - (left.market_value_base ?? 0))
                        .slice(0, 10)
                        .map((position) => ({
                          security_id: position.security_id,
                          instrument_name: position.instrument_name,
                          asset_class: position.asset_class,
                          quantity: position.quantity,
                          market_value_base: position.market_value_base,
                          weight_pct: position.weight_pct,
                        }))
                    : workspace.top_positions
                }
                baseCurrency={workspace.portfolio.base_currency}
                selectedSecurityId={
                  holdingsDrilldown?.kind === "security" ? holdingsDrilldown.security_id : null
                }
                onSelectionChange={onSelectTopHolding}
              />
            ) : (
              <PortfolioModuleState
                variant="capability"
                capability={capabilities.topHoldings}
                partialTitle="Top holdings are not ranked yet"
                unavailableTitle="No holdings yet"
                body={
                  capabilities.topHoldings.reason ??
                  "Holdings will appear once positions are funded and priced."
                }
                partialHint="Complete valuation and concentration calculations to populate the ranked view."
                unavailableHint="Add funding, book a trade, and publish pricing."
                why={
                  capabilities.topHoldings.state === "partial"
                    ? undefined
                    : {
                        body:
                          "Holdings require booked positions or funded balances. Until the book contains invested or funded inventory, there is nothing to rank.",
                        label: "Why holdings are unavailable",
                      }
                }
                illustration
                centered
              />
            )}
          </PortfolioCollapsibleModule>
        ) : null}
      </WorkspaceGrid>
      {showChangeHighlights ? (
        <PortfolioPairedAnalyticsSection
          workspace={workspace}
          context={context}
          capabilities={capabilities!}
          detailsLoading={detailsLoading}
          isDetailedView={false}
          incomeDisplayCurrency={incomeDisplayCurrency}
          activityDisplayCurrency={activityDisplayCurrency}
          transactionDrilldown={transactionDrilldown}
          onSelectActivityBucket={onSelectActivityBucket}
          getSectionExpanded={getSectionExpanded}
          toggleSection={toggleSection}
        />
      ) : null}
    </section>
  );
}

function PortfolioChangesSection({
  workspace,
  context,
  capabilities,
  showChanges,
  incomeDisplayCurrency,
  activityDisplayCurrency,
  transactionDrilldown,
  isDetailedView,
  onSelectActivityBucket,
  getSectionExpanded,
  toggleSection,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  showChanges: boolean;
  incomeDisplayCurrency: string;
  activityDisplayCurrency: string;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  isDetailedView: boolean;
  onSelectActivityBucket: (bucket: string | null) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  toggleSection: (sectionKey: PortfolioCollapsibleSectionKey) => void;
}) {
  if (!showChanges) {
    return null;
  }

  return (
    <PortfolioPairedAnalyticsSection
      workspace={workspace}
      context={context}
      capabilities={capabilities}
      detailsLoading={false}
      isDetailedView={isDetailedView}
      incomeDisplayCurrency={incomeDisplayCurrency}
      activityDisplayCurrency={activityDisplayCurrency}
      transactionDrilldown={transactionDrilldown}
      onSelectActivityBucket={onSelectActivityBucket}
      getSectionExpanded={getSectionExpanded}
      toggleSection={toggleSection}
      sectionId="portfolio-changes"
      title="Recent Flows"
      subtitle={`Income and client activity for ${formatPeriodContext(context)}.`}
      sectionClassName="portfolio-detailed-cluster-section"
    />
  );
}

function PortfolioDrilldownSection({
  workspace,
  context,
  capabilities,
  detailsLoading,
  showDrilldown,
  isDetailedView,
  filteredPositions,
  holdingsFilterCopy,
  transactionDrilldown,
  onClearHoldingsDrilldown,
  onClearTransactionDrilldown,
  onSelectHoldingRow,
  onSelectTransactionRow,
  getSectionExpanded,
  setSectionPreferences,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  showDrilldown: boolean;
  isDetailedView: boolean;
  filteredPositions: PortfolioWorkspace["positions"];
  holdingsFilterCopy: string | null;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onClearHoldingsDrilldown: () => void;
  onClearTransactionDrilldown: () => void;
  onSelectHoldingRow: (row: HoldingsRow) => void;
  onSelectTransactionRow: (row: TransactionRow) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  setSectionPreferences: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  if (!showDrilldown) {
    return null;
  }

  const holdingsExpanded = getSectionExpanded("holdings");
  const transactionsExpanded = getSectionExpanded("transactions");
  const projectedCashflowExpanded = getSectionExpanded("projected-cashflow");

  const persistOpenState = (sectionKey: PortfolioCollapsibleSectionKey, nextOpen: boolean) => {
    setSectionPreferences((current) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(getPortfolioSectionStorageKey(sectionKey), String(nextOpen));
      }
      return { ...current, [sectionKey]: nextOpen };
    });
  };

  return (
    <section
      id="portfolio-drilldown"
      className="portfolio-workspace-section portfolio-detailed-cluster-section"
    >
      <SectionHeader
        title="Where can I drill down?"
        subtitle="Holdings, transactions, and projected liquidity on demand."
      />
      <div className="portfolio-disclosure-stack">
        <PortfolioDrilldownDisclosure
          title="Holdings"
          summary={
            capabilities.holdingsDrilldown.state === "supported"
              ? filteredPositions.length
                ? `${formatCount(filteredPositions.length, "holding")} with valuation context`
                : "No holdings have been booked yet"
              : capabilities.holdingsDrilldown.reason ?? "Holdings drill-down is unavailable."
          }
          expanded={holdingsExpanded}
          onToggle={(nextOpen) => persistOpenState("holdings", nextOpen)}
          capability={capabilities.holdingsDrilldown}
          partialTitle="Holdings drill-down is partially available"
          unavailableTitle="Holdings drill-down unavailable"
          body={
            capabilities.holdingsDrilldown.reason ??
            "Detailed holdings rows are not available in the current portfolio contract."
          }
          hint="Publish detailed position rows to support holdings drill-down."
          why={{
            body:
              "Holdings drill-down requires detailed position rows with identifiers, valuation context, and filters. Summary counts alone are not enough for a usable grid.",
            label: "Why holdings drill-down is unavailable",
          }}
        >
          <DataGridCard>
            <DeferredPortfolioHoldingsGrid
              portfolioId={workspace.portfolio.portfolio_id}
              positions={filteredPositions}
              baseCurrency={workspace.portfolio.base_currency}
              asOfDate={context.selectedAsOfDate}
              columnMode={context.columnMode}
              filterLabel={holdingsFilterCopy}
              onClearFilter={onClearHoldingsDrilldown}
              onRowSelect={onSelectHoldingRow}
            />
          </DataGridCard>
        </PortfolioDrilldownDisclosure>

        <PortfolioDrilldownDisclosure
          title="Transactions"
          summary={
            capabilities.transactionsDrilldown.state === "supported"
              ? workspace.recent_transactions.length
                ? `${workspace.recent_transactions.length} booked events in ${context.periodLabel}`
                : "No transactions have been booked yet"
              : capabilities.transactionsDrilldown.reason ?? "Transactions drill-down is unavailable."
          }
          expanded={transactionsExpanded}
          onToggle={(nextOpen) => persistOpenState("transactions", nextOpen)}
          capability={capabilities.transactionsDrilldown}
          partialTitle="Transactions drill-down is partially available"
          unavailableTitle="Transactions drill-down unavailable"
          body={
            capabilities.transactionsDrilldown.reason ??
            "Detailed transaction rows are not available in the current portfolio contract."
          }
          hint="Use the current reporting window or publish detailed ledger rows to support transaction drill-down."
        >
          <DataGridCard>
            <DeferredPortfolioTransactionsGrid
              portfolioId={workspace.portfolio.portfolio_id}
              baseCurrency={workspace.portfolio.base_currency}
              asOfDate={context.selectedAsOfDate}
              defaultStartDate={context.effectivePeriodStartDate}
              defaultEndDate={context.effectivePeriodEndDate}
              initialTransactions={workspace.recent_transactions}
              suspendInitialFetch={detailsLoading}
              externalFilter={transactionDrilldown}
              onClearExternalFilter={onClearTransactionDrilldown}
              onRowSelect={onSelectTransactionRow}
            />
          </DataGridCard>
        </PortfolioDrilldownDisclosure>

        <PortfolioDrilldownDisclosure
          title="Projected Cashflow"
          summary={
            capabilities.projectedCashflow.state === "supported" && workspace.cashflow_outlook
              ? `${workspace.cashflow_outlook.projection_days} day forward liquidity path`
              : capabilities.projectedCashflow.reason ?? "Projected cashflow is unavailable."
          }
          expanded={projectedCashflowExpanded}
          onToggle={(nextOpen) => persistOpenState("projected-cashflow", nextOpen)}
          capability={capabilities.projectedCashflow}
          partialTitle="Projected cashflow is partially available"
          unavailableTitle="Projected cashflow unavailable"
          body={
            capabilities.projectedCashflow.reason ??
            "A projected liquidity path is not available in the current portfolio contract."
          }
          hint="Publish forward cashflow projections to support projected liquidity review."
          why={{
            body:
              "Projected cashflow requires forward-looking cashflow points from the liquidity contract. Without those points, the UI should not imply a reliable liquidity forecast.",
            label: "Why projected cashflow is unavailable",
          }}
        >
          <DeferredPortfolioProjectedCashflowModule
            portfolioId={workspace.portfolio.portfolio_id}
            baseCurrency={workspace.portfolio.base_currency}
            asOfDate={context.selectedAsOfDate}
            initialCashflowOutlook={workspace.cashflow_outlook}
            defaultExpanded={isDetailedView}
            suspendInitialFetch={detailsLoading}
          />
        </PortfolioDrilldownDisclosure>
      </div>
    </section>
  );
}

function PortfolioDetailDrawerController({
  detailDrawer,
  onClose,
}: {
  detailDrawer: PortfolioDetailDrawerState | null;
  onClose: () => void;
}) {
  if (!detailDrawer) {
    return null;
  }

  return (
    <DeferredPortfolioDetailDrawer
      open
      kicker={detailDrawer.kicker}
      title={detailDrawer.title}
      subtitle={detailDrawer.subtitle}
      summaryItems={detailDrawer.summaryItems}
      tabs={detailDrawer.tabs}
      fullPageHref={detailDrawer.fullPageHref}
      fullPageLabel={detailDrawer.fullPageLabel}
      onClose={onClose}
    />
  );
}

type PortfolioCollapsibleSectionKey =
  | "allocation"
  | "top-holdings"
  | "performance-snapshot"
  | "income"
  | "activity"
  | "holdings"
  | "transactions"
  | "projected-cashflow";

const PORTFOLIO_COLLAPSIBLE_SECTION_KEYS: PortfolioCollapsibleSectionKey[] = [
  "allocation",
  "top-holdings",
  "performance-snapshot",
  "income",
  "activity",
  "holdings",
  "transactions",
  "projected-cashflow",
];

function getPortfolioSectionStorageKey(sectionKey: PortfolioCollapsibleSectionKey): string {
  return `lotus:portfolio:section:${sectionKey}`;
}

function getDefaultSectionExpanded(
  sectionKey: PortfolioCollapsibleSectionKey,
  viewMode: PortfolioWorkspaceContext["viewMode"]
): boolean {
  if (viewMode === "detailed") {
    return true;
  }

  switch (sectionKey) {
    case "allocation":
    case "top-holdings":
    case "income":
    case "activity":
      return true;
    default:
      return false;
  }
}

type PortfolioMetricDrawerKey =
  | "aum"
  | "invested_assets"
  | "available_cash"
  | "holdings"
  | "net_flow_30d"
  | "book_readiness";

function buildMetricDrawer(
  metric: PortfolioMetricDrawerKey,
  workspace: PortfolioWorkspace,
  context: PortfolioWorkspaceContext,
  activityDisplayCurrency: string
): PortfolioDetailDrawerState {
  const commonSummary = [
    { label: "Portfolio", value: workspace.portfolio.portfolio_id },
    { label: "As of", value: formatDate(context.selectedAsOfDate) },
  ];

  switch (metric) {
    case "aum":
      return {
        kicker: "Metric Detail",
        title: "AUM",
        subtitle: "Total market value across invested holdings and operational cash.",
        summaryItems: [
          { label: "Value", value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency) },
          { label: "Base Currency", value: workspace.portfolio.base_currency },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Assets under management represents current portfolio market value in base currency.",
              "It combines invested holdings and available cash at the selected page context.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList([
              ["Invested Assets", formatCurrency(workspace.summary.invested_market_value_base, workspace.portfolio.base_currency)],
              ["Available Cash", formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency)],
              ["Holdings", String(workspace.summary.position_count)],
              ["Cash Accounts", String(workspace.summary.cash_balance_count ?? 0)],
            ]),
          },
        ],
        fullPageHref: "#portfolio-health",
        fullPageLabel: "Open health snapshot",
      };
    case "invested_assets":
      return {
        kicker: "Metric Detail",
        title: "Invested Assets",
        subtitle: "Value currently deployed into funded positions rather than cash inventory.",
        summaryItems: [
          { label: "Value", value: formatCurrency(workspace.summary.invested_market_value_base, workspace.portfolio.base_currency) },
          { label: "Weight", value: formatPct(getInvestedAssetWeight(workspace)) },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Invested assets indicates how much of the book is currently allocated to positions.",
              "Use it with available cash and allocation views to assess deployment level.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList([
              ["Top Holding", workspace.top_positions[0]?.instrument_name ?? "N/A"],
              ["Top Holding Weight", formatPct(workspace.top_positions[0]?.weight_pct ?? null)],
              ["Allocation Views", String(workspace.allocation_views?.length ?? 0)],
              ["Valued Positions", String(workspace.positions.filter((position) => (position.market_value_base ?? 0) > 0).length)],
            ]),
          },
        ],
        fullPageHref: "#portfolio-insights",
        fullPageLabel: "Open allocation",
      };
    case "available_cash":
      return {
        kicker: "Metric Detail",
        title: "Available Cash",
        subtitle: "Published cash inventory available to fund activity and meet liquidity needs.",
        summaryItems: [
          { label: "Value", value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency) },
          { label: "Cash Allocation", value: formatPct(workspace.summary.cash_weight_pct) },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Available cash aggregates current cash balances across portfolio cash instruments.",
              "Use it with projected cashflow to assess short-horizon funding capacity.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList(
              (workspace.cash_balances ?? []).length
                ? (workspace.cash_balances ?? []).map((balance) => [
                    balance.instrument_name,
                    formatCurrency(balance.market_value_base ?? balance.quantity, workspace.portfolio.base_currency),
                  ])
                : [["Cash Accounts", "No published cash balances available"]]
            ),
          },
        ],
        fullPageHref: "#portfolio-insights",
        fullPageLabel: "Open liquidity",
      };
    case "holdings":
      return {
        kicker: "Metric Detail",
        title: "Holdings",
        subtitle: "Current number of holdings with live book and valuation context.",
        summaryItems: [
          { label: "Count", value: formatCount(workspace.summary.position_count, "holding") },
          { label: "Top Holding", value: workspace.top_positions[0]?.instrument_name ?? "N/A" },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Holdings count is a quick breadth indicator for the current book.",
              "Use the detailed holdings grid for per-position valuation, exposure, and identifiers.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList(
              workspace.top_positions.slice(0, 5).map((position) => [
                position.instrument_name,
                formatCurrency(position.market_value_base, workspace.portfolio.base_currency),
              ])
            ),
          },
        ],
        fullPageHref: "#portfolio-drilldown",
        fullPageLabel: "Open holdings",
      };
    case "net_flow_30d":
      return {
        kicker: "Metric Detail",
        title: "30D Net Flow",
        subtitle: "Net booked portfolio activity across the active reporting window.",
        summaryItems: [
          { label: "Net Flow", value: formatCurrency(getRequestedWindowActivityAmount(workspace), activityDisplayCurrency) },
          { label: "Events", value: String(getRequestedWindowActivityCount(workspace)) },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Net flow aggregates booked inflows, outflows, fees, and related cash activity over the selected window.",
              "Positive values indicate net inflows. Negative values indicate net outflows.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList([
              ["Window", context.timeWindow],
              ["Requested Window Amount", formatCurrency(getRequestedWindowActivityAmount(workspace), activityDisplayCurrency)],
              ["Requested Window Events", String(getRequestedWindowActivityCount(workspace))],
              ["Year to Date Amount", formatCurrency(getYearToDateActivityAmount(workspace), activityDisplayCurrency)],
            ]),
          },
        ],
        fullPageHref: "#portfolio-insights",
        fullPageLabel: "Open activity",
      };
    case "book_readiness":
      return {
        kicker: "Metric Detail",
        title: "Book Readiness",
        subtitle: "Operational readiness across holdings, pricing, transactions, and reporting.",
        summaryItems: [
          { label: "Status", value: getBookReadinessStatus(workspace) },
          {
            label: "Exceptions",
            value: String(
              (
                workspace.exception_summaries ??
                buildPortfolioExceptionSummaries(workspace)
              ).length
            ),
          },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Book readiness is an operating signal based on coverage, reporting state, publication eligibility, and blockers.",
              "It is intended to tell RM, CA, and PM whether the book is usable for client and operational workflows.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList([
              ["Holdings", workspace.readiness.has_positions ? "Ready" : "Missing"],
              ["Reporting", formatStatus(workspace.readiness.reporting.status)],
              ["Publishing Allowed", formatBooleanFlag(workspace.operations?.publish_allowed)],
              ["Blocking Controls", formatBooleanFlag(workspace.operations?.controls_blocking)],
            ]),
          },
        ],
        fullPageHref: "#portfolio-attention",
        fullPageLabel: "Open readiness",
      };
  }
}

function buildExceptionDrawer(
  exception: {
    key: string;
    title: string;
    detail: string;
    tone: "neutral" | "success" | "warn" | "danger";
    href: string;
  },
  workspace: PortfolioWorkspace,
  context: PortfolioWorkspaceContext,
  affectedPositions: PortfolioPositionView[] = []
): PortfolioDetailDrawerState {
  const tabs: PortfolioDetailDrawerState["tabs"] = [
    {
      key: "explanation",
      label: "Explanation",
      content: renderDrawerParagraphs([exception.detail]),
    },
    {
      key: "evidence",
      label: "Evidence",
      content: renderDrawerDefinitionList(resolveExceptionEvidence(exception.key, workspace)),
    },
  ];

  if (exception.key === "pricing" && affectedPositions.length) {
    tabs.push({
      key: "affected-holdings",
      label: "Affected Holdings",
      content: renderDrawerDefinitionList(
        affectedPositions.slice(0, 8).map((position) => [
          position.instrument_name,
          position.market_price == null && position.market_value_base == null
            ? "Price and valuation missing"
            : position.market_price == null
              ? "Price missing"
              : "Valuation missing",
        ])
      ),
    });
  }

  return {
    kicker: "Readiness Issue",
    title: exception.title,
    subtitle: "Operational explanation and current evidence for this portfolio gap.",
    summaryItems: [
      { label: "Severity", value: formatStatus(exception.tone) },
      { label: "Portfolio", value: workspace.portfolio.portfolio_id },
      { label: "As of", value: formatDate(context.selectedAsOfDate) },
    ],
    tabs,
    fullPageHref: exception.href,
    fullPageLabel: "Open related section",
  };
}

function buildHoldingDrawer(
  row: HoldingsRow,
  portfolioId: string,
  baseCurrency: string,
  relatedTransactions: PortfolioWorkspace["recent_transactions"]
): PortfolioDetailDrawerState {
  return {
    kicker: "Holding Detail",
    title: row.instrument,
    subtitle: row.assetClass,
    summaryItems: [
      { label: "Market Value", value: formatCurrency(row.marketValue, baseCurrency) },
      { label: "Weight", value: formatPct(row.weight) },
      { label: "Currency", value: row.currency },
    ],
    tabs: [
      {
        key: "overview",
        label: "Overview",
        content: renderDrawerDefinitionList([
          ["Security ID", row.securityId],
          ["Quantity", formatQuantity(row.quantity)],
          ["Price", row.price === null ? "—" : formatCurrency(row.price, row.currency)],
          ["Held Since", formatDate(row.heldSince)],
        ]),
      },
      {
        key: "valuation",
        label: "Valuation",
        content: renderDrawerDefinitionList([
          ["Market Value", formatCurrency(row.marketValue, baseCurrency)],
          ["Unrealized P&L", formatCurrency(row.upl, baseCurrency)],
          ["Weight", formatPct(row.weight)],
          ["Sector", row.sector],
          ["ISIN", row.isin ?? "N/A"],
        ]),
      },
      {
        key: "related-transactions",
        label: "Related Transactions",
        content: relatedTransactions.length
          ? renderDrawerDefinitionList(
              relatedTransactions.slice(0, 6).map((transaction) => [
                `${formatDate(transaction.transaction_date)} ${formatStatus(transaction.transaction_type)}`,
                formatCurrency(
                  transaction.net_cost_base ?? transaction.gross_amount,
                  transaction.currency ?? baseCurrency
                ),
              ])
            )
          : renderDrawerParagraphs([
              "No related transactions are available in the current ledger window for this holding.",
            ]),
      },
    ],
    fullPageHref: `/portfolio?portfolioId=${encodeURIComponent(portfolioId)}#portfolio-drilldown`,
    fullPageLabel: "Open holdings",
  };
}

function buildTransactionDrilldownDrawer(
  filter: PortfolioTransactionDrilldownFilter,
  workspace: PortfolioWorkspace,
  transactions: PortfolioWorkspace["recent_transactions"],
  baseCurrency: string
): PortfolioDetailDrawerState {
  return {
    kicker: "Transaction Drill-Down",
    title: filter.kind === "activity" ? formatActivityBucketLabel(filter.bucket) : "Related Transactions",
    subtitle: filter.label,
    summaryItems: [
      { label: "Matches", value: formatCount(transactions.length, "transaction") },
      { label: "Portfolio", value: workspace.portfolio.portfolio_id },
      { label: "Window", value: `${formatDate(workspace.as_of_date)}` },
    ],
    tabs: [
      {
        key: "overview",
        label: "Overview",
        content: transactions.length
          ? renderDrawerDefinitionList(
              transactions.slice(0, 8).map((transaction) => [
                `${formatDate(transaction.transaction_date)} ${formatStatus(transaction.transaction_type)}`,
                `${transaction.instrument_id} · ${formatCurrency(
                  transaction.net_cost_base ?? transaction.gross_amount,
                  transaction.currency ?? baseCurrency
                )}`,
              ])
            )
          : renderDrawerParagraphs([
              "No transactions in the current ledger window match this drill-down.",
            ]),
      },
    ],
    fullPageHref: "#portfolio-drilldown",
    fullPageLabel: "Open transactions",
  };
}

function buildTransactionDrawer(
  row: TransactionRow,
  portfolioId: string,
  baseCurrency: string
): PortfolioDetailDrawerState {
  return {
    kicker: "Transaction Detail",
    title: row.type,
    subtitle: row.instrument,
    summaryItems: [
      { label: "Amount", value: formatCurrency(row.amount, row.currency) },
      { label: "Status", value: formatStatus(row.status) },
      { label: "Trade Date", value: formatDate(row.tradeDate) },
    ],
    tabs: [
      {
        key: "overview",
        label: "Overview",
        content: renderDrawerDefinitionList([
          ["Transaction ID", row.transactionId],
          ["Type", row.type],
          ["Instrument", row.instrument],
          ["Quantity", formatQuantity(row.quantity)],
          ["Amount", formatCurrency(row.amount, row.currency)],
        ]),
      },
      {
        key: "lifecycle",
        label: "Lifecycle",
        content: renderDrawerDefinitionList([
            ["Trade Date", formatDate(row.tradeDate)],
            ["Status", formatStatus(row.status)],
            ["Component Type", row.componentType ? formatStatus(row.componentType) : "N/A"],
            ["Settlement Date", "Not exposed by the current source contract"],
            ["Base Amount", formatCurrency(row.amount, baseCurrency)],
          ]),
      },
    ],
    fullPageHref: `/portfolio?portfolioId=${encodeURIComponent(portfolioId)}#portfolio-drilldown`,
    fullPageLabel: "Open transactions",
  };
}

function resolveExceptionEvidence(
  key: string,
  workspace: PortfolioWorkspace
): Array<[string, string]> {
  switch (key) {
    case "holdings":
      return [
        ["Positions", formatCount(workspace.positions.length, "position")],
        ["Top Holdings", formatCount(workspace.top_positions.length, "holding")],
        ["Reported Position Count", formatCount(workspace.summary.position_count, "holding")],
      ];
    case "pricing":
      return [
        ["Valued Positions", formatCount(workspace.positions.filter((position) => (position.market_value_base ?? 0) > 0).length, "position")],
        ["Allocation Views", String(workspace.allocation_views?.length ?? 0)],
        ["Failed Valuation Jobs", String(workspace.operations?.failed_valuation_jobs_within_window ?? 0)],
      ];
    case "transactions":
      return [
        ["Transactions in View", formatCount(workspace.recent_transactions.length, "transaction")],
        ["Latest Booked Transaction", formatDate(workspace.operations?.latest_booked_transaction_date)],
        ["Window End", formatDate(workspace.as_of_date)],
      ];
    case "reporting":
      return [
        ["Reporting Status", formatStatus(workspace.readiness.reporting.status)],
        ["Report Rows", String(workspace.readiness.reporting.row_count)],
        ["Generated At", formatDate(workspace.readiness.reporting.generated_at_utc)],
      ];
    case "controls_blocking":
      return [
        ["Publishing Allowed", formatBooleanFlag(workspace.operations?.publish_allowed)],
        ["Blocking Controls", formatBooleanFlag(workspace.operations?.controls_blocking)],
        ["Active Reprocessing Keys", String(workspace.operations?.active_reprocessing_keys ?? 0)],
      ];
    default: {
      const failure = workspace.partial_failures.find(
        (item) => `partial_failure_${item.error_code}` === key
      );
      return [
        ["Source Service", failure?.source_service ?? "Unknown"],
        ["Error Code", failure?.error_code ?? "Unknown"],
        ["Detail", failure?.detail ?? "No additional evidence available"],
      ];
    }
  }
}

function renderDrawerDefinitionList(entries: Array<[string, string]>): ReactNode {
  return (
    <dl className="portfolio-detail-drawer-definition-list">
      {entries.map(([label, value]) => (
        <div key={`${label}-${value}`} className="portfolio-detail-drawer-definition-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderDrawerParagraphs(paragraphs: string[]): ReactNode {
  return (
    <div className="portfolio-detail-drawer-copy">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function formatActivityBucketLabel(value: string): string {
  return formatLabel(value.toLowerCase());
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatPeriodContext(context: PortfolioWorkspaceContext): string {
  return `${context.periodLabel} period from ${formatDate(context.effectivePeriodStartDate)} to ${formatDate(
    context.effectivePeriodEndDate
  )}`;
}
