import {
  Panel,
  Text,
  type WorkbenchSummaryMetricStripItem,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import {
  formatPerformancePositionLabel,
  formatPct,
} from "../formatters";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";
import {
  getTopContributionRows,
  getTopPositionContributionRows,
  hasPositionContributionRanking,
} from "../view-model";

function getTopDriverLabel(workspace: WorkbenchPerformanceWorkspace): string | null {
  if (hasPositionContributionRanking(workspace)) {
    const topPosition = getTopPositionContributionRows(workspace, 1)[0];
    if (topPosition) {
      return formatPerformancePositionLabel(topPosition.position_id);
    }
  }

  const topSegment = getTopContributionRows(workspace, 1)[0];
  return topSegment?.key_label ?? null;
}

export default function PerformanceAnalysisDecisionSummary({
  workspace,
  detailBasis,
  capabilities,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  detailBasis: string;
  capabilities: PerformanceWorkspaceCapabilities;
}) {
  void capabilities;

  const selectedPerformance =
    detailBasis === "GROSS" ? workspace.gross_performance : workspace.net_performance;
  const attribution = workspace.attribution;
  const topDriverLabel = getTopDriverLabel(workspace);
  const contributionCoverage = workspace.contribution?.coverage_mv_pct;
  const headline =
    topDriverLabel
      ? `Largest observed driver ${topDriverLabel}.`
      : contributionCoverage != null
        ? `Published contribution covers ${formatPct(contributionCoverage)} of market value.`
        : "Benchmark-relative attribution and contribution for the selected window.";
  const analysisActiveReturn =
    attribution?.active_return_pct ?? selectedPerformance.active_return_pct;

  const cards = [
    analysisActiveReturn != null
      ? {
          label: "Active Return",
          value: formatPct(analysisActiveReturn),
          support: selectedPerformance.benchmark_id
            ? "Benchmark-relative outcome"
            : "Portfolio-only outcome",
          definition:
            "Benchmark-relative return reconciled through the selected analysis dataset.",
        }
      : null,
    attribution?.sum_of_effects_pct != null
      ? {
          label: "Effects Sum",
          value: formatPct(attribution.sum_of_effects_pct),
          support: attribution.model
            ? `${attribution.model} model`
            : "Attribution decomposition",
          definition:
            "Combined allocation, selection, and interaction effects before residual reconciliation.",
        }
      : null,
    attribution?.residual_pct != null
      ? {
          label: "Residual",
          value: formatPct(attribution.residual_pct),
          support: attribution.linking
            ? `${attribution.linking} linking`
            : "Attribution reconciliation",
          definition:
            "Difference between attributed effects and total active return after applying the selected linking method.",
        }
      : null,
    contributionCoverage != null
      ? {
          label: "Contribution Coverage",
          value: formatPct(contributionCoverage),
          support: topDriverLabel ? `Top driver ${topDriverLabel}` : "Contribution coverage",
          definition:
            "Share of portfolio market value covered by the published contribution dataset for the current selection.",
        }
      : null,
  ].filter(Boolean) as WorkbenchSummaryMetricStripItem[];

  return (
    <section aria-label="Analysis decision summary">
      <Panel className="performance-analysis-summary-band performance-analysis-summary-band-compact">
        <div className="performance-analysis-summary-band-copy">
          <span className="performance-analysis-summary-band-kicker">Analysis Snapshot</span>
          <Text variant="secondary" className="performance-analysis-summary-band-lead">
            {headline}
          </Text>
        </div>

        {cards.length ? (
          <WorkbenchSummaryMetricStrip
            ariaLabel="Analysis snapshot metrics"
            className="performance-analysis-summary-band-grid"
            itemClassName="performance-analysis-summary-card"
            items={cards}
          />
        ) : null}
      </Panel>
    </section>
  );
}
