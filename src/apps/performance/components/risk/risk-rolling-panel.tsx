import { useEffect, useState } from "react";

import {
  AnalyticsTable,
  DisclosureToggleButton,
  ScreenStatePanel,
  SectionBlock,
  Text,
  WorkbenchSegmentedControl,
  WorkbenchStatusRow,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

type RiskRollingPanelProps = {
  viewModel: PerformanceRiskViewModel;
  rollingExpanded: boolean;
  onToggleRolling: () => void;
};

export default function RiskRollingPanel({
  viewModel,
  rollingExpanded,
  onToggleRolling,
}: RiskRollingPanelProps) {
  const defaultWindowKey = viewModel.rollingWindows[0]?.key ?? "";
  const [selectedWindowKey, setSelectedWindowKey] = useState(defaultWindowKey);

  useEffect(() => {
    setSelectedWindowKey(defaultWindowKey);
  }, [defaultWindowKey]);

  const selectedWindow =
    viewModel.rollingWindows.find((window) => window.key === selectedWindowKey) ??
    viewModel.rollingWindows[0] ??
    null;

  return (
    <SectionBlock
      title="Rolling Risk"
      subtitle="Windowed risk behaviour, dependency quality, and short-versus-long horizon context."
      className="performance-risk-panel performance-risk-rolling-panel"
      actions={
        <DisclosureToggleButton
          expanded={rollingExpanded}
          onToggle={onToggleRolling}
          expandedToggleLabel="Collapse rolling series"
          collapsedToggleLabel="Expand rolling series"
        />
      }
    >
      {viewModel.rollingExecutiveSummary ? (
        <section className="performance-risk-briefing-card" aria-label="Rolling risk business reading">
          <Text variant="cardTitle">{viewModel.rollingExecutiveSummary.heading}</Text>
          <Text variant="metricValueCompact" className="performance-risk-briefing-headline">
            {viewModel.rollingExecutiveSummary.headline}
          </Text>
          <Text variant="secondary">{viewModel.rollingExecutiveSummary.detail}</Text>
          {viewModel.rollingExecutiveSummary.actionCue ? (
            <Text variant="metadata" className="performance-risk-briefing-cue">
              Next: {viewModel.rollingExecutiveSummary.actionCue}
            </Text>
          ) : null}
        </section>
      ) : null}
      {viewModel.rollingWindows.length > 1 ? (
        <WorkbenchSegmentedControl
          value={selectedWindow?.key ?? defaultWindowKey}
          onChange={setSelectedWindowKey}
          options={viewModel.rollingWindows.map((window) => ({
            key: window.key,
            label: window.label,
          }))}
          ariaLabel="Rolling risk windows"
          className="performance-risk-window-toolbar"
        />
      ) : null}
      <WorkbenchSummaryMetricStrip
        ariaLabel="Rolling risk headline metrics"
        className="performance-risk-metric-strip"
        items={(selectedWindow?.headlineMetrics ?? []).map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          unavailable: metric.state === "unavailable",
        }))}
      />
      {viewModel.rollingQualityFlags.length ? (
        <WorkbenchStatusRow
          label="Rolling quality flags"
          className="performance-risk-quality-flags"
          items={viewModel.rollingQualityFlags.map((flag) => ({
            value: flag,
            tone: "warn" as const,
          }))}
        />
      ) : null}
      {viewModel.rollingContextRows.length ? (
        <div className="performance-risk-context-card-grid" aria-label="Rolling risk methodology context">
          {viewModel.rollingContextRows.map((row) => (
            <div key={row.key} className="performance-risk-context-card">
              <Text variant="label">{row.label}</Text>
              <Text variant="cardTitle">{row.value}</Text>
              <Text variant="metadata">{row.support}</Text>
            </div>
          ))}
        </div>
      ) : null}
      <AnalyticsTable
        ariaLabel="Rolling risk summary table"
        variant="analysis"
        density="compact"
        columns={[
          { key: "metric", label: "Measure" },
          { key: "latest", label: "Current Reading", align: "right" },
          { key: "average", label: "Average", align: "right" },
          { key: "p05", label: "P05", align: "right" },
          { key: "p95", label: "P95", align: "right" },
          { key: "support", label: "Interpretation" },
        ]}
        rows={(selectedWindow?.summaryRows ?? []).map((row) => ({
          key: row.key,
          cells: [row.metric, row.latest, row.average, row.p05, row.p95, row.support],
        }))}
        emptyState={{
          title: "No rolling risk metrics",
          body: "Rolling risk windows are not available for this portfolio context.",
        }}
      />
      {rollingExpanded ? (
        <div className="performance-risk-rolling-detail" aria-label="Rolling series detail">
          {viewModel.rollingDetailState === "loading" ? (
            <ScreenStatePanel
              kind="loading"
              title="Loading rolling series"
              body="Fetching time-series risk detail for the selected rolling window."
              surface="analysis"
              rows={2}
            />
          ) : viewModel.rollingDetailState === "unavailable" ? (
            <ScreenStatePanel
              kind="unavailable"
              title="Rolling series unavailable"
              body="Time-series rolling detail is not available for the selected portfolio context."
              surface="analysis"
            />
          ) : (
            <AnalyticsTable
              ariaLabel="Rolling risk series table"
              variant="analysis"
              density="compact"
              columns={[
                { key: "date", label: "Date" },
                ...((selectedWindow?.seriesMetricKeys ?? []).map((metricKey) => ({
                  key: metricKey,
                  label:
                    selectedWindow?.summaryRows.find((row) => row.key.endsWith(metricKey))?.metric ??
                    metricKey,
                  align: "right" as const,
                })) ?? []),
              ]}
              rows={(selectedWindow?.seriesRows ?? []).map((row) => ({
                key: row.key,
                cells: [
                  row.date,
                  ...(selectedWindow?.seriesMetricKeys.map(
                    (metricKey) => row.values[metricKey] ?? "N/A"
                  ) ?? []),
                ],
              }))}
              emptyState={{
                title: "No rolling series",
                body: "Rolling series detail has not been returned for this window.",
              }}
            />
          )}
        </div>
      ) : null}
    </SectionBlock>
  );
}
