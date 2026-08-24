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
import { PERFORMANCE_RETURN_LABELS } from "../performance-terminology";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";
import {
  getTopContributionRows,
  getTopPositionContributionRows,
  hasPositionContributionRanking,
} from "../view-model";
import { getAttributionSourcePosture } from "./performance-attribution-presentations";

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
  const attributionPosture = getAttributionSourcePosture(attribution);
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
          label: PERFORMANCE_RETURN_LABELS.activeReturn,
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
          label: "Sum of effects",
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
          support:
            attribution.residual_materiality?.classification != null
              ? `${attribution.residual_materiality.classification} residual`
              : attribution.linking
                ? `${attribution.linking} linking`
                : "Attribution reconciliation",
          definition:
            "Difference between attributed effects and total active return after applying the selected linking method.",
        }
      : null,
    attributionPosture?.state !== "supported"
      ? {
          label: "Attribution availability",
          value: attributionPosture?.state === "partial" ? "Partial" : "Unavailable",
          support: attributionPosture?.reason ?? "Source supportability qualification",
          definition:
            "Source-owned attribution status returned by lotus-performance for this selection.",
        }
      : null,
    contributionCoverage != null
      ? {
          label: "Contribution coverage",
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
          <span className="performance-analysis-summary-band-kicker">Analysis snapshot</span>
          <Text variant="secondary" className="performance-analysis-summary-band-lead">
            {headline}
          </Text>
        </div>

        {cards.length ? (
          <WorkbenchSummaryMetricStrip
            layout="custom"
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
