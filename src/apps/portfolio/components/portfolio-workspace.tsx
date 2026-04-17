"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  ActionLink,
  AnalyticsModule,
  DeferredModulePlaceholder,
  DegradedStatePanel,
  MainWithSideRailLayout,
  MetricRow,
  Panel,
  SectionHeader,
  SemanticBadge,
  Text,
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
  formatStatus,
} from "../formatters";
import type {
  PortfolioHoldingsDrilldownFilter,
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
  buildActivityDrilldownLabel,
  buildAllocationDrilldownLabel,
  buildHoldingsStatusDrilldownLabel,
  buildSecurityDrilldownLabel,
  filterPositionsByDrilldown,
  filterTransactionsByDrilldown,
  getPositionsNeedingPricing,
  getRelatedTransactionsForSecurity,
  getActivityDisplayCurrency,
  getBookReadinessSupport,
  getIncomeDisplayCurrency,
  getInvestedAssetWeight,
  getOrderedWorkflowCues,
  getRequestedWindowActivityCount,
} from "../view-model";
import PortfolioAnalyticalMainColumn from "./portfolio-analytical-main-column";
import {
  getDefaultSectionExpanded,
  getPortfolioSectionStorageKey,
  PORTFOLIO_COLLAPSIBLE_SECTION_KEYS,
  PortfolioChangesSection,
  type PortfolioCollapsibleSectionKey,
  PortfolioDrilldownSection,
  PortfolioInsightsSection,
} from "./portfolio-analytical-sections";
import {
  buildExceptionDrawer,
  buildHoldingDrawer,
  buildMetricDrawer,
  buildTransactionDrawer,
  buildTransactionDrilldownDrawer,
  type PortfolioDetailDrawerState,
  type PortfolioMetricDrawerKey,
} from "./portfolio-detail-drawer-builders";
import PortfolioPageHeaderStatus from "./portfolio-page-header-status";
import PortfolioRail from "./portfolio-rail";
import PortfolioActionsModule from "../modules/portfolio-actions/portfolio-actions-module";
import PortfolioContextModule from "../modules/portfolio-context/portfolio-context-module";
import PortfolioHealthStrip from "../modules/portfolio-health/portfolio-health-strip";
import PortfolioInsightsStrip from "../modules/portfolio-insights/portfolio-insights-strip";
import PortfolioReadinessModule from "../modules/portfolio-readiness/portfolio-readiness-module";
import {
  getPortfolioWorkspaceCapabilities,
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
  const setupActions = workspace?.workflow_actions ?? [];
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
                    <PortfolioAnalyticalMainColumn
                      summaryHeader={
                        <PortfolioSummaryHeaderSection
                          workspace={workspace}
                          context={context}
                          orderedWorkflowCues={orderedWorkflowCues}
                          primaryWorkflowCueKey={primaryWorkflowCue?.key ?? null}
                          readinessIndicators={priorityReadinessIndicators}
                          onOpenMetricDrawer={(metric) =>
                            setDetailDrawer(buildMetricDrawer(metric, workspace, context))
                          }
                        />
                      }
                      exceptions={<PortfolioExceptionsSection workspace={workspace} />}
                      insights={
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
                          DeferredPortfolioAllocationPanel={DeferredPortfolioAllocationPanel}
                          DeferredPortfolioTopHoldingsPanel={DeferredPortfolioTopHoldingsPanel}
                        />
                      }
                      health={
                        <PortfolioHealthSection
                          workspace={workspace}
                          context={context}
                          showHealthSection={showHealthSection}
                        />
                      }
                      changes={
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
                      }
                      drilldown={
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
                          DeferredPortfolioHoldingsGrid={DeferredPortfolioHoldingsGrid}
                          DeferredPortfolioTransactionsGrid={DeferredPortfolioTransactionsGrid}
                          DeferredPortfolioProjectedCashflowModule={
                            DeferredPortfolioProjectedCashflowModule
                          }
                        />
                      }
                    />
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
  orderedWorkflowCues,
  primaryWorkflowCueKey,
  readinessIndicators,
  onOpenMetricDrawer,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
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
        <div className="portfolio-hero-header">
          <div className="portfolio-hero-content">
            <Text variant="label" className="portfolio-hero-label">
              Portfolio
            </Text>
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
        </div>

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
              label: "Cash",
              value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency),
              definition:
                "Available cash inventory in the portfolio base currency across published cash balances.",
              support: `${formatPct(workspace.summary.cash_weight_pct)} cash allocation`,
              onClick: () => onOpenMetricDrawer("available_cash"),
            },
            {
              key: "cash_accounts",
              label: "Cash Accounts",
              value: workspace.summary.cash_balance_count ?? 0,
              definition: "Number of published cash balance accounts in the current portfolio book.",
              support: formatCount(workspace.summary.cash_balance_count ?? 0, "cash account"),
            },
          ]}
        />
        <Text variant="metadata" className="portfolio-hero-support">
          {getBookReadinessSupport(workspace)}
        </Text>
        <Text variant="metadata" className="portfolio-hero-support">
          {getRequestedWindowActivityCount(workspace)} booked events
        </Text>
      </Panel>

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
