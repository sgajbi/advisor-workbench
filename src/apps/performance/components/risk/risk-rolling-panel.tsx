import { useEffect, useState } from "react";

import {
  AnalyticsTable,
  ScreenStatePanel,
  WorkbenchSegmentedControl,
  WorkbenchStatusRow,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";
import RiskDetailSection from "./risk-detail-section";
import RiskExpandAction from "./risk-expand-action";
import RiskExecutiveSummary from "./risk-executive-summary";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";
import RiskModuleShell from "./risk-module-shell";

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
  const priorityMetrics = ["Volatility", "Tracking Error", "Beta", "Max Drawdown"];
  const selectedHeadlineMetrics = (selectedWindow?.headlineMetrics ?? []).filter((metric) =>
    priorityMetrics.includes(metric.label)
  );
  const selectedSummaryRows = (selectedWindow?.summaryRows ?? []).map((row) => ({
    ...row,
    range: `${row.p05} to ${row.p95}`,
  }));

  return (
    <RiskModuleShell
      title="Rolling Risk"
      subtitle="Windowed risk behaviour, dependency quality, and short-versus-long horizon context."
      className="performance-risk-rolling-panel"
      actions={
        <RiskExpandAction
          expanded={rollingExpanded}
          onToggle={onToggleRolling}
          expandedLabel="Collapse rolling series"
          collapsedLabel="Expand rolling series"
        />
      }
      businessReading={
        viewModel.rollingExecutiveSummary ? (
          <RiskExecutiveSummary
            summary={viewModel.rollingExecutiveSummary}
            ariaLabel="Rolling risk business reading"
          />
        ) : null
      }
      headlineMetrics={
        <RiskHeadlineMetricGrid
          ariaLabel="Rolling risk headline metrics"
          metrics={selectedHeadlineMetrics}
        />
      }
      detail={
        <RiskDetailSection
          title="Window detail"
          ariaLabel="Rolling risk detail"
          toolbar={
            viewModel.rollingWindows.length > 1 ? (
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
            ) : null
          }
        >
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
          <AnalyticsTable
            ariaLabel="Rolling risk summary table"
            variant="analysis"
            density="compact"
            columns={[
              { key: "metric", label: "Measure" },
              { key: "latest", label: "Current Reading", align: "right" },
              { key: "average", label: "Typical", align: "right" },
              { key: "range", label: "Observed Range", align: "right" },
              { key: "support", label: "Reading" },
            ]}
            rows={selectedSummaryRows.map((row) => ({
              key: row.key,
              cells: [row.metric, row.latest, row.average, row.range, row.support],
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
                        selectedWindow?.summaryRows.find((row) => row.key.endsWith(metricKey))
                          ?.metric ?? metricKey,
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
        </RiskDetailSection>
      }
      context={
        <RiskContextList
          rows={viewModel.rollingContextRows}
          ariaLabel="Rolling risk methodology context"
          compact
          title="Context and methodology"
        />
      }
    />
  );
}
