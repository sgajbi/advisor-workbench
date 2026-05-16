"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useMemo, useState } from "react";

import {
  AnalyticsModule,
  DeferredModulePlaceholder,
  DegradedStatePanel,
  MainWithSideRailLayout,
  MetricRow,
  SectionHeader,
  SemanticBadge,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
  WorkspaceGrid,
} from "@/design-system";

import {
  formatBooleanFlag,
  formatDate,
  formatStatus,
} from "../formatters";
import type {
  PortfolioHoldingsDrilldownFilter,
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import { getCoverageWarningLabel } from "../workspace-config";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  buildPortfolioReadinessIndicators,
  buildActivityDrilldownLabel,
  buildAllocationDrilldownLabel,
  buildHoldingsStatusDrilldownLabel,
  buildSecurityDrilldownLabel,
  filterPositionsByDrilldown,
  filterTransactionsByDrilldown,
  getPositionsNeedingPricing,
  getActivityDisplayCurrency,
  getIncomeDisplayCurrency,
  getOrderedWorkflowCues,
} from "../view-model";
import PortfolioAnalyticalMainColumn from "./portfolio-analytical-main-column";
import PortfolioExecutiveSummary from "./portfolio-executive-summary";
import PortfolioExceptionsSection from "./portfolio-exceptions-section";
import {
  PortfolioChangesSection,
  PortfolioInsightsSection,
} from "./portfolio-analytical-sections";
import {
  buildExceptionDrawer,
  buildMetricDrawer,
  buildTransactionDrilldownDrawer,
  type PortfolioDetailDrawerState,
} from "./portfolio-detail-drawer-builders";
import {
  PortfolioDecisionBand,
} from "./portfolio-decision-posture";
import PortfolioPageHeaderStatus from "./portfolio-page-header-status";
import PortfolioScreenRail from "./portfolio-screen-rail";
import PortfolioSummaryHeaderSection from "./portfolio-summary-header-section";
import PortfolioWorkspaceSideRail from "./portfolio-workspace-side-rail";
import {
  getPortfolioWorkspaceCapabilities,
} from "../capabilities";
import { isRenderableCapability } from "@/shell/workspace-capabilities";
import { usePortfolioSectionPreferences } from "./use-portfolio-section-preferences";

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

const DeferredPortfolioDetailDrawer = dynamic(() => import("./portfolio-detail-drawer"), {
  ssr: false,
});

export default function PortfolioWorkspaceView({
  portfolios,
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
  const [detailDrawer, setDetailDrawer] = useState<PortfolioDetailDrawerState | null>(null);
  const orderedWorkflowCues = workspace ? getOrderedWorkflowCues(workspace) : [];
  const setupActions = workspace?.workflow_actions ?? [];
  const primaryWorkflowCue = orderedWorkflowCues.find((cue) => cue.key === "performance") ?? orderedWorkflowCues[0];
  const readinessIndicators = workspace
    ? workspace.readiness_indicators ?? buildPortfolioReadinessIndicators(workspace)
    : [];
  const exceptionSummaries = workspace?.exception_summaries ?? [];
  const insights = workspace?.insights ?? [];
  const [dismissedInsightKeys, setDismissedInsightKeys] = useState<string[]>([]);
  const isSummaryView = context.viewMode === "summary";
  const isDetailedView = context.viewMode === "detailed";
  const showAttentionOnly = context.focusExceptions && Boolean(workspace?.partial_failures.length);
  const showInsights = !showAttentionOnly;
  const showChanges = isDetailedView && !showAttentionOnly;
  const showReadinessDetailGroup = isDetailedView;
  const showLiquidityModule = isDetailedView;
  const showDetailedAnalyticalSections = isDetailedView && !showAttentionOnly;
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
  const visibleInsights = insights.filter((insight) => !dismissedInsightKeys.includes(insight.key));
  const priorityReadinessIndicators = readinessIndicators.filter(
    (indicator) => indicator.status !== "Ready"
  );
  const showHealthSection = isDetailedView;
  const { getSectionExpanded, toggleSection } = usePortfolioSectionPreferences(
    context.viewMode,
  );

  const clearTransactionDrilldown = () => setTransactionDrilldown(null);

  const openTransactionDrilldown = (filter: PortfolioTransactionDrilldownFilter) => {
    setTransactionDrilldown(filter);
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
        rail={
          workspace ? (
            <PortfolioScreenRail portfolioId={workspace.portfolio.portfolio_id} activeScreen="portfolio" />
          ) : null
        }
        main={
          <>
            <WorkbenchPageFrame
              className="portfolio-page-frame"
              bodyClassName="portfolio-page-frame-body"
              title="Portfolio Summary"
              subtitle={
                workspace
                  ? `${workspace.portfolio.portfolio_id} · ${workspace.profile.portfolio_type ?? "Global Balanced"} · ${workspace.portfolio.base_currency}`
                  : "Front-office portfolio context, readiness, and decision support"
              }
              actions={
                <PortfolioPageHeaderStatus
                  label={portfolios.length ? "Catalog live" : "Catalog unavailable"}
                  tone={portfolios.length ? "success" : "warn"}
                />
              }
            >
              <WorkbenchSectionStack className="portfolio-page-sections">
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
                      toolbar={toolbar}
                      exceptions={<PortfolioExceptionsSection workspace={workspace} />}
                      insights={
                        <>
                          <PortfolioDecisionBand workspace={workspace} context={context} />
                          <PortfolioExecutiveSummary workspace={workspace} context={context} />
                          {showDetailedAnalyticalSections ? (
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
                          ) : null}
                        </>
                      }
                      health={
                        showDetailedAnalyticalSections ? (
                          <PortfolioHealthSection
                            workspace={workspace}
                            context={context}
                            showHealthSection={showHealthSection}
                          />
                        ) : null
                      }
                      changes={
                        showDetailedAnalyticalSections ? (
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
                        ) : null
                      }
                    />
                  </>
                )}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          </>
        }
        side={
          <PortfolioWorkspaceSideRail
            workspace={workspace}
            context={context}
            exceptions={exceptionSummaries}
            actions={setupActions}
            showDetailFootnote={showReadinessDetailGroup}
            onOpenException={handleOpenException}
          />
        }
      />

      <PortfolioDetailDrawerController
        detailDrawer={detailDrawer}
        onClose={() => {
          setDetailDrawer(null);
        }}
      />
    </>
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
