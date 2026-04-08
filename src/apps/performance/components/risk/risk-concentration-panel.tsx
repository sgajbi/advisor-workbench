import {
  AnalyticsTable,
  SectionBlock,
  SemanticBadge,
  Text,
  WorkbenchRankedBarList,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

const COVERAGE_TONE = {
  ready: "success",
  partial: "warn",
  unavailable: "danger",
  blocked: "danger",
} as const;

export default function RiskConcentrationPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  const coverageSupportability =
    viewModel.supportability.find((item) => item.key === "concentration:issuer_enrichment") ?? null;
  const currentPositionDriver = viewModel.concentrationDriverRows.find(
    (row) => row.key === "largest_position"
  );
  const currentIssuerDriver = viewModel.concentrationDriverRows.find(
    (row) => row.key === "largest_issuer"
  );
  const coverageMetric = viewModel.concentrationMetrics.find((metric) => metric.key === "coverage_ratio");
  const topPositionMetric = viewModel.concentrationMetrics.find((metric) => metric.key === "top_position_weight");
  const topIssuerMetric = viewModel.concentrationMetrics.find((metric) => metric.key === "top_issuer_weight");
  const topTenMetric = viewModel.concentrationMetrics.find((metric) => metric.key === "top_n_cumulative");
  const comparisonRows = viewModel.concentrationComparisonRows.filter((row) =>
    ["portfolio_hhi", "issuer_hhi", "top_position_weight", "top_issuer_weight", "top_n_cumulative"].includes(
      row.key
    )
  );
  const currentStateRows = viewModel.concentrationComparisonRows.filter((row) =>
    ["portfolio_hhi", "issuer_hhi"].includes(row.key)
  );
  const controlRows = viewModel.concentrationCoverageRows.filter((row) =>
    ["grouping_level", "enrichment_policy", "weight_basis", "reporting_currency"].includes(row.key)
  );
  const coverageRows = viewModel.concentrationCoverageRows.filter((row) =>
    ["coverage_current", "coverage_proposed"].includes(row.key)
  );
  const concentrationPosture = buildConcentrationPosture({
    topPositionWeight: topPositionMetric?.value,
    topIssuerWeight: topIssuerMetric?.value,
    topTenWeight: topTenMetric?.value,
    coverageState: coverageSupportability?.state,
  });

  return (
    <SectionBlock
      title="Concentration"
      subtitle="Current stateful concentration pressure, principal drivers, and issuer coverage controls."
      className="performance-risk-panel performance-risk-concentration-panel"
    >
      <WorkbenchSummaryMetricStrip
        ariaLabel="Risk concentration headline metrics"
        className="performance-risk-metric-strip performance-risk-concentration-metric-strip"
        items={viewModel.concentrationMetrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          definition: metric.support,
        }))}
      />

      <div className="performance-risk-concentration-context" aria-label="Risk concentration interpretation">
        <div className="performance-risk-note-card performance-risk-concentration-reading">
          <div className="performance-risk-note-copy">
            <div className="performance-risk-note-header">
              <Text variant="cardTitle">Business reading</Text>
              <SemanticBadge tone={concentrationPosture.tone}>{concentrationPosture.label}</SemanticBadge>
            </div>
            <Text variant="body">
              Concentration is led by {currentPositionDriver?.currentDriver ?? "the top position"} at{" "}
              {topPositionMetric?.value ?? currentPositionDriver?.currentWeight ?? "N/A"} and by{" "}
              {currentIssuerDriver?.currentDriver ?? "the top issuer"} at{" "}
              {topIssuerMetric?.value ?? currentIssuerDriver?.currentWeight ?? "N/A"}.
            </Text>
            <Text variant="metadata">{concentrationPosture.support}</Text>
          </div>
        </div>

        <WorkbenchRankedBarList
          className="performance-risk-concentration-visual"
          title="Exposure concentration"
          label="Largest current exposures"
          scale={100}
          rows={[
            {
              key: "top_position",
              title: currentPositionDriver?.currentDriver ?? "Largest position",
              subtitle: "Single-name exposure",
              value: topPositionMetric?.value ?? currentPositionDriver?.currentWeight ?? "N/A",
              magnitudePct: parsePercentMagnitude(topPositionMetric?.value ?? currentPositionDriver?.currentWeight),
              tone: "negative",
            },
            {
              key: "top_issuer",
              title: currentIssuerDriver?.currentDriver ?? "Largest issuer",
              subtitle: "Issuer-bucket exposure",
              value: topIssuerMetric?.value ?? currentIssuerDriver?.currentWeight ?? "N/A",
              magnitudePct: parsePercentMagnitude(topIssuerMetric?.value ?? currentIssuerDriver?.currentWeight),
              tone: "negative",
            },
            {
              key: "top_ten",
              title: `${topTenMetric?.label ?? "Top 10"} concentration`,
              subtitle: "Share held in the largest positions",
              value: topTenMetric?.value ?? "N/A",
              magnitudePct: parsePercentMagnitude(topTenMetric?.value),
              tone: "negative",
            },
          ]}
        />

        <div className="performance-risk-note-card">
          <div className="performance-risk-note-copy">
            <div className="performance-risk-note-header">
              <Text variant="label">Coverage posture</Text>
              {coverageSupportability ? (
                <SemanticBadge tone={COVERAGE_TONE[coverageSupportability.state]}>
                  {coverageSupportability.state}
                </SemanticBadge>
              ) : null}
            </div>
            <Text variant="metricValueCompact">{coverageMetric?.value ?? "N/A"} issuer coverage</Text>
            <Text variant="metadata">
              {coverageSupportability?.reason ??
                "Issuer enrichment coverage is complete for the selected portfolio context."}
            </Text>
          </div>
        </div>
      </div>

      {viewModel.concentrationHasProposedChanges ? (
        <AnalyticsTable
          ariaLabel="Risk concentration comparison table"
          variant="analysis"
          density="comfortable"
          columns={[
            { key: "metric", label: "Metric" },
            { key: "current", label: "Current", align: "right" },
            { key: "proposed", label: "Proposed", align: "right" },
            { key: "delta", label: "Delta", align: "right" },
            { key: "interpretation", label: "Interpretation" },
          ]}
          rows={comparisonRows.map((row) => ({
            key: row.key,
            cells: [row.metric, row.current, row.proposed, row.delta, row.interpretation],
          }))}
          emptyState={{
            title: "No concentration measures available",
            body: "Stateful concentration analytics are not available for the selected portfolio context.",
          }}
        />
      ) : (
        <div className="performance-risk-concentration-index-grid" aria-label="Risk concentration current-state cards">
          {currentStateRows.map((row) => (
            <div key={row.key} className="performance-risk-concentration-index-card">
              <div className="performance-risk-concentration-index-header">
                <Text variant="label">{row.metric}</Text>
                <Text variant="metricValueCompact">{row.current}</Text>
              </div>
              <div className="performance-risk-concentration-index-band" aria-hidden="true">
                <div className="performance-risk-concentration-index-band-segment performance-risk-concentration-index-band-low" />
                <div className="performance-risk-concentration-index-band-segment performance-risk-concentration-index-band-mid" />
                <div className="performance-risk-concentration-index-band-segment performance-risk-concentration-index-band-high" />
                <div
                  className="performance-risk-concentration-index-marker"
                  style={{ left: `${resolveConcentrationIndexMarker(row.current)}%` }}
                />
              </div>
              <Text variant="metadata">{buildCurrentStateReading(row)}</Text>
            </div>
          ))}
        </div>
      )}

      <div className="performance-risk-concentration-footer">
        <AnalyticsTable
          ariaLabel="Risk concentration coverage table"
          variant="analysis"
          density="compact"
          columns={[
            { key: "item", label: "Coverage Control" },
            { key: "value", label: "Value" },
            { key: "support", label: "Interpretation" },
          ]}
          rows={coverageRows.map((row) => ({
            key: row.key,
            cells: [row.item, row.value, row.support],
          }))}
          emptyState={{
            title: "No concentration coverage diagnostics",
            body: "Coverage and valuation metadata are not available for the selected portfolio context.",
          }}
        />

        <div className="performance-risk-concentration-controls" aria-label="Risk concentration controls">
          {controlRows.map((row) => (
            <div key={row.key} className="performance-risk-control-item">
              <Text variant="label">{row.item}</Text>
              <Text variant="metricValueCompact">{row.value}</Text>
              <Text variant="metadata">{row.support}</Text>
            </div>
          ))}
        </div>
      </div>
    </SectionBlock>
  );
}

function parsePercentMagnitude(value: string | undefined) {
  if (!value) {
    return 0;
  }
  const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildCurrentStateReading(
  row: PerformanceRiskViewModel["concentrationComparisonRows"][number]
) {
  if (row.key === "portfolio_hhi") {
    return "Position-level concentration index for the current live book.";
  }
  if (row.key === "issuer_hhi") {
    return "Issuer concentration after enrichment and grouping policy are applied.";
  }
  return row.interpretation;
}

function buildConcentrationPosture({
  topPositionWeight,
  topIssuerWeight,
  topTenWeight,
  coverageState,
}: {
  topPositionWeight?: string;
  topIssuerWeight?: string;
  topTenWeight?: string;
  coverageState?: "ready" | "partial" | "unavailable" | "blocked";
}) {
  const topPosition = parsePercentMagnitude(topPositionWeight);
  const topIssuer = parsePercentMagnitude(topIssuerWeight);
  const topTen = parsePercentMagnitude(topTenWeight);

  if (coverageState && coverageState !== "ready") {
    return {
      label: "Review coverage",
      tone: "warn" as const,
      support:
        "Issuer coverage is not fully complete. Treat issuer-level concentration as conditional until enrichment is complete.",
    };
  }

  if (topPosition >= 20 || topIssuer >= 25 || topTen >= 80) {
    return {
      label: "Elevated",
      tone: "warn" as const,
      support:
        "Exposure is concentrated in a small number of positions. Review the largest line items before presenting this as diversified.",
    };
  }

  return {
    label: "Stable",
    tone: "success" as const,
    support:
      "Exposure is not dominated by a single line item. Hover the key figures for definitions and review the ranked bars for concentration leaders.",
  };
}

function resolveConcentrationIndexMarker(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, (numeric / 2500) * 100));
}
