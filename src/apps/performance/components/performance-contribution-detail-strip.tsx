import { WorkbenchSummaryMetricStrip } from "@/design-system";
import type { ContributionSummaryView } from "@/features/workbench/types";
import { cx } from "@/design-system/utils/cx";

import {
  formatPct,
  formatPerformancePositionLabel,
} from "../formatters";
import {
  getContributionCoverageAssessment,
  getContributionReconciliationAssessment,
} from "./performance-workspace-view-helpers";

function formatWeightingSchemeLabel(weightingScheme?: string | null) {
  if (!weightingScheme) {
    return null;
  }

  switch (weightingScheme.trim().toUpperCase()) {
    case "BOD":
      return "BOD weighting";
    case "EOD":
      return "EOD weighting";
    case "AVERAGE_WEIGHT":
      return "Average weight";
    default:
      return weightingScheme;
  }
}

function getTopContributorRow(rows: ContributionSummaryView["position_rows"]) {
  return rows.reduce<typeof rows[number] | null>(
    (best, row) =>
      best === null || row.contribution_pct > best.contribution_pct ? row : best,
    null
  );
}

function getTopDetractorRow(rows: ContributionSummaryView["position_rows"]) {
  return rows.reduce<typeof rows[number] | null>(
    (worst, row) =>
      worst === null || row.contribution_pct < worst.contribution_pct ? row : worst,
    null
  );
}

export default function PerformanceContributionDetailStrip({
  contribution,
  ariaLabel = "Contribution detail summary strip",
  className,
}: {
  contribution: ContributionSummaryView;
  ariaLabel?: string;
  className?: string;
}) {
  const topContributor = getTopContributorRow(contribution.position_rows);
  const topDetractor = getTopDetractorRow(contribution.position_rows);
  const hasDetractor =
    topDetractor !== null && topDetractor.contribution_pct < 0;
  const coverageAssessment = getContributionCoverageAssessment(contribution);
  const reconciliationAssessment = getContributionReconciliationAssessment(contribution);

  return (
    <WorkbenchSummaryMetricStrip
      className={cx("performance-analysis-metric-strip", className)}
      ariaLabel={ariaLabel}
      items={[
        {
          key: "top-contributor",
          label: "Top Contributor",
          value: topContributor
            ? formatPerformancePositionLabel(topContributor.position_id)
            : "Unavailable",
          support: topContributor
            ? formatPct(topContributor.contribution_pct)
            : "Position ranking unavailable",
          unavailable: !topContributor,
        },
        {
          key: "top-detractor",
          label: "Top Detractor",
          value: hasDetractor
            ? formatPerformancePositionLabel(topDetractor.position_id)
            : "None",
          support: hasDetractor
            ? formatPct(topDetractor?.contribution_pct)
            : "No negative contributors in this window",
        },
        {
          key: "coverage",
          label: "Coverage MV",
          value: formatPct(contribution.coverage_mv_pct),
          support: [coverageAssessment, formatWeightingSchemeLabel(contribution.weighting_scheme)]
            .filter(Boolean)
            .join(" • "),
        },
        {
          key: "portfolio-contribution",
          label: "Portfolio Contribution",
          value: formatPct(contribution.portfolio_contribution_pct),
          support: [
            contribution.total_portfolio_return_pct != null
              ? `Return ${formatPct(contribution.total_portfolio_return_pct)}`
              : null,
            reconciliationAssessment,
          ]
            .filter(Boolean)
            .join(" • "),
        },
      ]}
    />
  );
}
