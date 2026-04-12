"use client";

import PortfolioPairedAnalyticsSection from "./portfolio-paired-analytics-section";
import { formatPortfolioPeriodContext } from "./portfolio-analytical-section-state";
import type { PortfolioChangesSectionProps } from "./portfolio-analytical-section-types";

export function PortfolioChangesSection({
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
}: PortfolioChangesSectionProps) {
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
      subtitle={`Income and client activity for ${formatPortfolioPeriodContext(context)}.`}
      sectionClassName="portfolio-detailed-cluster-section"
      shellLabel="Income and activity"
      shellValue="Current-period movement, event mix, and drill-down readiness"
    />
  );
}
