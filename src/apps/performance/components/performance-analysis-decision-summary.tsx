import {
  Panel,
  SemanticBadge,
  Text,
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

function toCapabilityTone(
  state: PerformanceWorkspaceCapabilities["attributionDetail"]["state"]
): "success" | "warn" | "danger" {
  if (state === "supported") {
    return "success";
  }
  if (state === "partial") {
    return "warn";
  }
  return "danger";
}

function toCapabilityValue(
  state: PerformanceWorkspaceCapabilities["attributionDetail"]["state"]
): string {
  if (state === "supported") {
    return "Ready";
  }
  if (state === "partial") {
    return "Partial";
  }
  return "Unavailable";
}

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
  const selectedPerformance =
    detailBasis === "GROSS" ? workspace.gross_performance : workspace.net_performance;
  const topDriverLabel = getTopDriverLabel(workspace);
  const contributionCoverage = workspace.contribution?.coverage_mv_pct;
  const evidenceGaps = [
    capabilities.attributionDetail,
    capabilities.contributionDetail,
  ].filter((capability) => capability.state !== "supported" && capability.reason);
  const headline =
    topDriverLabel && contributionCoverage != null
      ? `Largest observed driver ${topDriverLabel}; contribution coverage ${formatPct(
          contributionCoverage
        )} of market value.`
      : topDriverLabel
        ? `Largest observed driver ${topDriverLabel}.`
        : contributionCoverage != null
          ? `Contribution coverage ${formatPct(contributionCoverage)} of market value.`
          : "Benchmark-relative attribution and contribution remain in focus for the selected window.";

  const cards = [
    {
      label: "Active Return",
      value: formatPct(selectedPerformance.active_return_pct),
      support: selectedPerformance.benchmark_id ? "Benchmark-relative outcome" : "Portfolio-only outcome",
      definition:
        "Portfolio return less benchmark return for the selected reporting basis and horizon.",
    },
    {
      label: "Effects Sum",
      value: formatPct(workspace.attribution?.sum_of_effects_pct),
      support: workspace.attribution?.model ? `${workspace.attribution.model} model` : "Attribution decomposition",
      definition:
        "Combined allocation, selection, and interaction effects before residual reconciliation.",
    },
    {
      label: "Residual",
      value: formatPct(workspace.attribution?.residual_pct),
      support: workspace.attribution?.linking ? `${workspace.attribution.linking} linking` : "Attribution reconciliation",
      definition:
        "Difference between attributed effects and total active return after applying the selected linking method.",
    },
    {
      label: "Contribution Coverage",
      value: formatPct(contributionCoverage),
      support: topDriverLabel ? `Top driver ${topDriverLabel}` : "Contribution coverage",
      definition:
        "Share of portfolio market value covered by the published contribution dataset for the current selection.",
    },
  ];

  return (
    <section aria-label="Analysis decision summary">
      <Panel className="performance-analysis-summary-band performance-analysis-summary-band-compact">
        <div className="performance-analysis-summary-band-copy">
          <span className="performance-analysis-summary-band-kicker">Analysis Snapshot</span>
          <h3>Benchmark-relative evidence posture</h3>
          <Text variant="secondary" className="performance-analysis-summary-band-lead">
            {headline}
          </Text>
        </div>

        <WorkbenchSummaryMetricStrip
          ariaLabel="Analysis snapshot metrics"
          className="performance-analysis-summary-band-grid"
          itemClassName="performance-analysis-summary-card"
          items={cards.map((card) => ({
            key: card.label,
            label: card.label,
            value: card.value,
            support: card.support,
            definition: card.definition,
          }))}
        />

        <div className="performance-analysis-summary-band-status" aria-label="Analysis evidence gaps">
          <div className="performance-analysis-summary-band-status-heading">
            <span>Coverage</span>
          </div>
          <div className="performance-analysis-summary-band-status-items">
            <div className="performance-analysis-summary-band-status-item">
              <span className="performance-analysis-summary-band-status-label">Attribution detail</span>
              <SemanticBadge tone={toCapabilityTone(capabilities.attributionDetail.state)}>
                {toCapabilityValue(capabilities.attributionDetail.state)}
              </SemanticBadge>
            </div>
            <div className="performance-analysis-summary-band-status-item">
              <span className="performance-analysis-summary-band-status-label">Contribution detail</span>
              <SemanticBadge tone={toCapabilityTone(capabilities.contributionDetail.state)}>
                {toCapabilityValue(capabilities.contributionDetail.state)}
              </SemanticBadge>
            </div>
            {evidenceGaps[0]?.reason ? (
              <div className="performance-analysis-summary-band-gap">
                {evidenceGaps[0].reason}
              </div>
            ) : null}
          </div>
        </div>
      </Panel>
    </section>
  );
}
