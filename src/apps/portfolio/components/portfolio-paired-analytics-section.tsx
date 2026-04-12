"use client";

import dynamic from "next/dynamic";

import {
  AnalyticsTable,
  DeferredWorkbenchMount,
  SectionHeader,
  WorkbenchSummaryMetricStrip,
  WorkspaceGrid,
} from "@/design-system";
import { isRenderableCapability } from "@/shell/workspace-capabilities";

import type { PortfolioWorkspaceCapabilities } from "../capabilities";
import {
  formatCurrency,
  formatDate,
} from "../formatters";
import type {
  PortfolioActivitySummaryView,
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  getRequestedWindowActivityAmount,
  getRequestedWindowActivityCount,
} from "../view-model";
import PortfolioAnalyticsCapabilityBody from "./portfolio-analytics-capability-body";
import PortfolioCollapsibleModule from "./portfolio-collapsible-module";

const DeferredPortfolioIncomePanel = dynamic(
  () => import("./portfolio-chart-panels").then((module) => module.PortfolioIncomePanel),
  {
    ssr: false,
    loading: () => null,
  }
);

const DeferredPortfolioActivityPanel = dynamic(
  () => import("./portfolio-chart-panels").then((module) => module.PortfolioActivityPanel),
  {
    ssr: false,
    loading: () => null,
  }
);

type PortfolioPairedAnalyticsSectionProps = {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  isDetailedView: boolean;
  incomeDisplayCurrency: string;
  activityDisplayCurrency: string;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onSelectActivityBucket: (bucket: string | null) => void;
  getSectionExpanded: (sectionKey: "income" | "activity") => boolean;
  toggleSection: (sectionKey: "income" | "activity") => void;
  sectionId?: string;
  title?: string;
  subtitle?: string;
  sectionClassName?: string;
  gridClassName?: string;
};

type SummaryStat = {
  label: string;
  value: string | number;
};

export default function PortfolioPairedAnalyticsSection({
  workspace,
  context,
  capabilities,
  detailsLoading,
  isDetailedView,
  incomeDisplayCurrency,
  activityDisplayCurrency,
  transactionDrilldown,
  onSelectActivityBucket,
  getSectionExpanded,
  toggleSection,
  sectionId,
  title,
  subtitle,
  sectionClassName,
  gridClassName,
}: PortfolioPairedAnalyticsSectionProps) {
  const showIncomeModule = isRenderableCapability(capabilities.income);
  const showActivityModule = isRenderableCapability(capabilities.activity);

  if (!showIncomeModule && !showActivityModule) {
    return null;
  }

  const content = (
    <WorkspaceGrid
      className={
        isDetailedView
          ? `portfolio-primary-grid portfolio-paired-analytics-grid portfolio-paired-analytics-grid-detailed workbench-summary-region${gridClassName ? ` ${gridClassName}` : ""}`
          : `portfolio-primary-grid portfolio-paired-analytics-grid workbench-summary-region${gridClassName ? ` ${gridClassName}` : ""}`
      }
    >
      {showIncomeModule ? (
        <PortfolioCollapsibleModule
          className="portfolio-summary-module-card portfolio-paired-analytics-module portfolio-paired-analytics-module-primary"
          compact={!isDetailedView}
          title="Income"
          subtitle={`${incomeDisplayCurrency} income for ${formatPeriodContext(context)}.`}
          expanded={getSectionExpanded("income")}
          onToggle={() => toggleSection("income")}
        >
          {renderIncomeModule({
            workspace,
            capabilities,
            detailsLoading,
            isDetailedView,
            incomeDisplayCurrency,
          })}
        </PortfolioCollapsibleModule>
      ) : null}

      {showActivityModule ? (
        <PortfolioCollapsibleModule
          className="portfolio-summary-module-card portfolio-paired-analytics-module portfolio-paired-analytics-module-secondary"
          compact={!isDetailedView}
          title="Activity"
          subtitle={`${activityDisplayCurrency} activity for ${formatPeriodContext(context)}.`}
          expanded={getSectionExpanded("activity")}
          onToggle={() => toggleSection("activity")}
        >
          {renderActivityModule({
            workspace,
            capabilities,
            detailsLoading,
            isDetailedView,
            activityDisplayCurrency,
            transactionDrilldown,
            onSelectActivityBucket,
          })}
        </PortfolioCollapsibleModule>
      ) : null}
    </WorkspaceGrid>
  );

  if (!title) {
    return content;
  }

  return (
    <section
      id={sectionId}
      className={sectionClassName ? `portfolio-workspace-section ${sectionClassName}` : "portfolio-workspace-section"}
    >
      <SectionHeader title={title} subtitle={subtitle} />
      {content}
    </section>
  );
}

function renderIncomeModule({
  workspace,
  capabilities,
  detailsLoading,
  isDetailedView,
  incomeDisplayCurrency,
}: {
  workspace: PortfolioWorkspace;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  isDetailedView: boolean;
  incomeDisplayCurrency: string;
}) {
  return (
    <PortfolioAnalyticsCapabilityBody
      capability={capabilities.income}
      detailsLoading={detailsLoading}
      supportedData={workspace.income_summary}
      partialTitle="Income is not classified yet"
      unavailableTitle="No income activity"
      body={
        capabilities.income.reason ??
        "No income events have been recorded for the selected period."
      }
      partialHint="Dividend, coupon, and income classifications need to be published before income composition can be shown."
      unavailableHint="Dividend and coupon events will populate income once they are booked."
    >
      {(summary) => (
        <div className="portfolio-analytics-module-body" data-analytics-module="income">
          <PortfolioAnalyticsSummaryRow
            ariaLabel="Income overview"
            stats={[
              {
                label: "Net income",
                value: formatCurrency(
                  summary.totals_requested_window.net.reporting_currency_amount,
                  incomeDisplayCurrency
                ),
              },
              {
                label: "Gross income",
                value: formatCurrency(
                  summary.totals_requested_window.gross.reporting_currency_amount,
                  incomeDisplayCurrency
                ),
              },
              {
                label: "Income events",
                value: summary.totals_requested_window.net.transaction_count,
              },
            ]}
          />
          <DeferredWorkbenchMount
            placeholder={<div className="module-skeleton module-skeleton-chart" />}
          >
            <DeferredPortfolioIncomePanel summary={summary} compact={!isDetailedView} />
          </DeferredWorkbenchMount>
          {isDetailedView ? (
            <AnalyticsTable
              density="compact"
              variant="portfolio"
              className="portfolio-analytics-table"
              ariaLabel="Income summary"
              columns={[
                { key: "category", label: "Income Type" },
                { key: "windowNet", label: "Window Net", align: "right" },
                { key: "ytdNet", label: "YTD Net", align: "right" },
                { key: "windowGross", label: "Window Gross", align: "right" },
                { key: "txns", label: "Window Events", align: "right" },
              ]}
              rows={[
                {
                  key: "total",
                  cells: [
                    "Total",
                    formatCurrency(
                      summary.totals_requested_window.net.reporting_currency_amount,
                      incomeDisplayCurrency
                    ),
                    formatCurrency(
                      summary.totals_year_to_date.net.reporting_currency_amount,
                      incomeDisplayCurrency
                    ),
                    formatCurrency(
                      summary.totals_requested_window.gross.reporting_currency_amount,
                      incomeDisplayCurrency
                    ),
                    summary.totals_requested_window.net.transaction_count,
                  ],
                },
                ...summary.income_types.map((item) => ({
                  key: item.income_type,
                  cells: [
                    formatIncomeTypeLabel(item.income_type),
                    formatCurrency(
                      item.requested_window.net.reporting_currency_amount,
                      incomeDisplayCurrency
                    ),
                    formatCurrency(
                      item.year_to_date.net.reporting_currency_amount,
                      incomeDisplayCurrency
                    ),
                    formatCurrency(
                      item.requested_window.gross.reporting_currency_amount,
                      incomeDisplayCurrency
                    ),
                    item.requested_window.net.transaction_count,
                  ],
                })),
              ]}
            />
          ) : null}
        </div>
      )}
    </PortfolioAnalyticsCapabilityBody>
  );
}

function renderActivityModule({
  workspace,
  capabilities,
  detailsLoading,
  isDetailedView,
  activityDisplayCurrency,
  transactionDrilldown,
  onSelectActivityBucket,
}: {
  workspace: PortfolioWorkspace;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  isDetailedView: boolean;
  activityDisplayCurrency: string;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onSelectActivityBucket: (bucket: string | null) => void;
}) {
  return (
    <PortfolioAnalyticsCapabilityBody
      capability={capabilities.activity}
      detailsLoading={detailsLoading}
      supportedData={workspace.activity_summary}
      partialTitle="Activity totals are incomplete"
      unavailableTitle="No client activity"
      body={
        capabilities.activity.reason ??
        "No funding, trading, or cash activity has been recorded in the selected period."
      }
      partialHint="Publish activity aggregation output to complete the client money movement view."
      unavailableHint="Funding and trade events will populate the activity view."
    >
      {(summary) => (
        <div className="portfolio-analytics-module-body" data-analytics-module="activity">
          <PortfolioAnalyticsSummaryRow
            ariaLabel="Activity overview"
            stats={[
              {
                label: "Net flow",
                value: formatCurrency(
                  getRequestedWindowActivityAmount(workspace),
                  activityDisplayCurrency
                ),
              },
              {
                label: "Total movement",
                value: formatCurrency(
                  getActivityGrossMovement(summary),
                  activityDisplayCurrency
                ),
              },
              {
                label: "Activity events",
                value: getRequestedWindowActivityCount(workspace),
              },
            ]}
          />
          <DeferredWorkbenchMount
            placeholder={<div className="module-skeleton module-skeleton-chart" />}
          >
            <DeferredPortfolioActivityPanel
              summary={summary}
              compact={!isDetailedView}
              selectedBucket={
                transactionDrilldown?.kind === "activity" ? transactionDrilldown.bucket : null
              }
              onSelectionChange={onSelectActivityBucket}
            />
          </DeferredWorkbenchMount>
          {isDetailedView ? (
            <AnalyticsTable
              density="compact"
              variant="portfolio"
              className="portfolio-analytics-table"
              ariaLabel="Activity summary"
              columns={[
                { key: "bucket", label: "Bucket" },
                { key: "windowAmount", label: "Window Amount", align: "right" },
                { key: "ytdAmount", label: "YTD Amount", align: "right" },
                { key: "windowTxns", label: "Window Events", align: "right" },
                { key: "ytdTxns", label: "YTD Events", align: "right" },
              ]}
              rows={summary.buckets.map((bucket) => ({
                key: bucket.bucket,
                cells: [
                  formatActivityBucketLabel(bucket.bucket),
                  formatCurrency(
                    bucket.requested_window.reporting_currency_amount,
                    activityDisplayCurrency
                  ),
                  formatCurrency(
                    bucket.year_to_date.reporting_currency_amount,
                    activityDisplayCurrency
                  ),
                  bucket.requested_window.transaction_count,
                  bucket.year_to_date.transaction_count,
                ],
              }))}
            />
          ) : null}
        </div>
      )}
    </PortfolioAnalyticsCapabilityBody>
  );
}

function PortfolioAnalyticsSummaryRow({
  stats,
  ariaLabel,
}: {
  stats: SummaryStat[];
  ariaLabel: string;
}) {
  return (
    <WorkbenchSummaryMetricStrip
      className="portfolio-analytics-summary-row"
      itemClassName="portfolio-analytics-summary-stat"
      ariaLabel={ariaLabel}
      items={stats.map((stat) => ({
        key: stat.label,
        label: stat.label,
        value: stat.value,
      }))}
    />
  );
}

function getActivityGrossMovement(summary: PortfolioActivitySummaryView): number {
  return summary.buckets.reduce(
    (total, bucket) => total + Math.abs(bucket.requested_window.reporting_currency_amount),
    0
  );
}

function formatIncomeTypeLabel(value: string): string {
  return formatLabel(value.toLowerCase());
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
  return `${context.periodLabel} period from ${formatDate(
    context.effectivePeriodStartDate
  )} to ${formatDate(context.effectivePeriodEndDate)}`;
}
