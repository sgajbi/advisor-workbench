import { Panel, SemanticBadge } from "@/design-system";

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

  const summaryRows = [
    selectedPerformance.active_return_pct != null
      ? `Active return ${formatPct(selectedPerformance.active_return_pct)}.`
      : "Active return unavailable.",
    workspace.attribution?.sum_of_effects_pct != null
      ? `Effects ${formatPct(workspace.attribution.sum_of_effects_pct)} with residual ${formatPct(workspace.attribution.residual_pct)}.`
      : "Attribution effects incomplete.",
    contributionCoverage != null
      ? `Contribution coverage ${formatPct(contributionCoverage)} of market value.`
      : "Contribution coverage unavailable.",
    topDriverLabel ? `Largest observed driver ${topDriverLabel}.` : null,
  ].filter(Boolean);

  const cards = [
    {
      label: "Active Return",
      value: formatPct(selectedPerformance.active_return_pct),
      support: selectedPerformance.benchmark_id ? "Benchmark-relative outcome" : "Portfolio-only outcome",
    },
    {
      label: "Effects Sum",
      value: formatPct(workspace.attribution?.sum_of_effects_pct),
      support: workspace.attribution?.model ? `${workspace.attribution.model} model` : "Attribution decomposition",
    },
    {
      label: "Residual",
      value: formatPct(workspace.attribution?.residual_pct),
      support: workspace.attribution?.linking ? `${workspace.attribution.linking} linking` : "Attribution reconciliation",
    },
    {
      label: "Contribution Coverage",
      value: formatPct(contributionCoverage),
      support: topDriverLabel ? `Top driver ${topDriverLabel}` : "Contribution coverage",
    },
  ];

  return (
    <section aria-label="Analysis decision summary">
      <Panel className="performance-analysis-summary-band performance-analysis-summary-band-compact">
        <div className="performance-analysis-summary-band-copy">
          <span className="performance-analysis-summary-band-kicker">Decision Summary</span>
          <h3>Benchmark-relative evidence posture</h3>
          <div className="performance-analysis-summary-band-copy-list">
            {summaryRows.map((row) => (
              <p key={row}>{row}</p>
            ))}
          </div>
        </div>

        <div className="performance-analysis-summary-band-grid">
          {cards.map((card) => (
            <article key={card.label} className="performance-analysis-summary-card">
              <span className="performance-analysis-summary-card-label">{card.label}</span>
              <strong className="performance-analysis-summary-card-value">{card.value}</strong>
              <span className="performance-analysis-summary-card-support">{card.support}</span>
            </article>
          ))}
        </div>

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
            {evidenceGaps.map((capability) => (
              <div
                key={capability.reason}
                className="performance-analysis-summary-band-gap"
              >
                {capability.reason}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </section>
  );
}
