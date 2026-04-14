"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  TextField,
} from "@mui/material";

import {
  ActionButton,
  FieldLabel,
  Text,
  WorkbenchSegmentedControl,
} from "@/design-system";
import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { PerformanceBenchmarkOptionView } from "@/features/workbench/types";

import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import { getPerformanceBenchmarkOptionLabel } from "./performance-summary-context-helpers";
import type {
  PerformanceChartViewMode,
  PerformanceControlPatch,
} from "./performance-chart-panel-helpers";

export default function PerformanceAnalysisControlBar({
  period,
  detailBasis,
  chartFrequency,
  benchmark,
  resolvedBenchmarkOptions,
  fromDate,
  toDate,
  maxEndDate,
  minEndDate,
  chartViewMode,
  hasBenchmarkSeries,
  hasActiveSeries,
  capabilities,
  isUpdating,
  onRequestChange,
  onApplyExplicitDates,
  onFromDateChange,
  onToDateChange,
  onChartViewModeChange,
}: {
  period: string;
  detailBasis: string;
  chartFrequency: string;
  benchmark?: string;
  resolvedBenchmarkOptions: PerformanceBenchmarkOptionView[];
  fromDate: string;
  toDate: string;
  maxEndDate?: string;
  minEndDate?: string;
  chartViewMode: PerformanceChartViewMode;
  hasBenchmarkSeries: boolean;
  hasActiveSeries: boolean;
  capabilities: PerformanceWorkspaceCapabilities;
  isUpdating: boolean;
  onRequestChange: (patch: PerformanceControlPatch) => void;
  onApplyExplicitDates: (event: FormEvent<HTMLFormElement>) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onChartViewModeChange: (value: PerformanceChartViewMode) => void;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="performance-analysis-control-bar" role="group" aria-label="Analysis control bar" aria-busy="true">
      <div className="performance-analysis-control-cluster performance-analysis-control-cluster-selection">
          <div className="performance-analysis-control-slot performance-analysis-control-slot-horizon">
            <FieldLabel>Horizon</FieldLabel>
            <Text variant="cardTitle" as="div" className="performance-analysis-static-value">
              {period}
            </Text>
          </div>
          <div className="performance-analysis-control-slot performance-analysis-control-slot-basis">
            <FieldLabel>Basis</FieldLabel>
            <Text variant="cardTitle" as="div" className="performance-analysis-static-value">
              {detailBasis}
            </Text>
          </div>
          <div className="performance-analysis-control-slot performance-analysis-control-slot-view">
            <FieldLabel>View</FieldLabel>
            <Text variant="cardTitle" as="div" className="performance-analysis-static-value">
              {chartViewMode}
            </Text>
          </div>
        </div>
        <div className="performance-analysis-control-cluster performance-analysis-control-cluster-window">
          <div className="performance-analysis-control-slot performance-analysis-control-slot-dates">
            <FieldLabel>Window</FieldLabel>
            <Text variant="cardTitle" as="div" className="performance-analysis-static-value">
              {fromDate} to {toDate}
            </Text>
          </div>
        </div>
        <div className="performance-analysis-control-cluster performance-analysis-control-cluster-comparison">
          <div className="performance-analysis-control-slot">
            <FieldLabel>Frequency</FieldLabel>
            <Text variant="cardTitle" as="div" className="performance-analysis-static-value">
              {chartFrequency}
            </Text>
          </div>
          <div className="performance-analysis-control-slot">
            <FieldLabel>Benchmark</FieldLabel>
            <Text variant="cardTitle" as="div" className="performance-analysis-static-value">
              {benchmark ?? "Default benchmark"}
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-analysis-control-bar" role="group" aria-label="Analysis control bar">
      <div className="performance-analysis-control-cluster performance-analysis-control-cluster-selection">
        <div className="performance-analysis-control-slot performance-analysis-control-slot-horizon">
          <FieldLabel>Horizon</FieldLabel>
          <WorkbenchSegmentedControl
            value={period}
            onChange={(value) =>
              onRequestChange({
                period: value,
                reportStartDate: undefined,
                reportEndDate: undefined,
              })
            }
            ariaLabel="Horizon"
            className="performance-analysis-control-segmented"
            options={PERIOD_OPTIONS.map((option) => ({
              key: option,
              label: option,
              disabled: isUpdating && option === period,
            }))}
          />
        </div>

        <div className="performance-analysis-control-slot performance-analysis-control-slot-basis">
          <FieldLabel>Basis</FieldLabel>
          <WorkbenchSegmentedControl
            value={detailBasis}
            onChange={(value) =>
              onRequestChange({
                detailBasis: value,
              })
            }
            ariaLabel="Basis"
            className="performance-analysis-control-segmented"
            options={BASIS_OPTIONS.map((option) => ({
              key: option,
              label: option,
              disabled: isUpdating && option === detailBasis,
            }))}
          />
        </div>

        <div className="performance-analysis-control-slot performance-analysis-control-slot-view">
          <FieldLabel>View</FieldLabel>
          <WorkbenchSegmentedControl
            ariaLabel="Return view"
            className="performance-analysis-view-control"
            value={chartViewMode}
            onChange={onChartViewModeChange}
            options={[
              { key: "combined", label: "Combined", disabled: !hasBenchmarkSeries },
              { key: "absolute", label: "Absolute" },
              {
                key: "relative",
                label: "Relative",
                disabled: !hasActiveSeries,
                title: hasActiveSeries
                  ? undefined
                  : "Relative comparison requires benchmark-relative observations.",
              },
            ]}
          />
        </div>
      </div>

      <div className="performance-analysis-control-cluster performance-analysis-control-cluster-window">
        <form
          className="performance-analysis-control-slot performance-analysis-control-slot-dates"
          onSubmit={onApplyExplicitDates}
        >
          <FieldLabel>Window</FieldLabel>
          <div className="performance-analysis-date-row">
            <div className="performance-analysis-date-inputs">
              <TextField
                size="small"
                type="date"
                value={fromDate}
                slotProps={{
                  htmlInput: {
                    "aria-label": "From",
                    max: toDate || maxEndDate,
                    suppressHydrationWarning: true,
                  },
                }}
                onChange={(event) => onFromDateChange(event.currentTarget.value)}
              />
              <TextField
                size="small"
                type="date"
                value={toDate}
                slotProps={{
                  htmlInput: {
                    "aria-label": "To",
                    min: fromDate || minEndDate,
                    max: maxEndDate,
                    suppressHydrationWarning: true,
                  },
                }}
                onChange={(event) => onToDateChange(event.currentTarget.value)}
              />
            </div>
            <ActionButton
              type="submit"
              priority="primary"
              disabled={isUpdating}
              className="performance-analysis-apply-button"
            >
              {isUpdating ? "Updating..." : "Apply"}
            </ActionButton>
          </div>
        </form>
      </div>

      <div className="performance-analysis-control-cluster performance-analysis-control-cluster-comparison">
        <div className="performance-analysis-control-slot performance-analysis-control-slot-frequency">
          <FieldLabel>Frequency</FieldLabel>
          <TextField
            select
            size="small"
            value={chartFrequency}
            onChange={(event) =>
              onRequestChange({
                chartFrequency: event.target.value,
              })
            }
            disabled={isUpdating}
            sx={selectControlSx}
            SelectProps={{ native: true }}
            slotProps={{
              htmlInput: {
                "aria-label": "Frequency",
                suppressHydrationWarning: true,
              },
            }}
          >
            {CHART_FREQUENCY_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={!isCapabilityOptionSupported(capabilities.returnPath, "frequency", option.value)}
              >
                {option.label}
              </option>
            ))}
          </TextField>
        </div>

        <div className="performance-analysis-control-slot performance-analysis-control-slot-benchmark-select">
          <FieldLabel>Benchmark</FieldLabel>
          <TextField
            select
            size="small"
            value={benchmark ?? ""}
            onChange={(event) =>
              onRequestChange({
                benchmark: event.target.value || undefined,
              })
            }
            disabled={isUpdating}
            sx={selectControlSx}
            SelectProps={{ native: true }}
            slotProps={{
              htmlInput: {
                "aria-label": "Benchmark",
                suppressHydrationWarning: true,
              },
            }}
          >
            {resolvedBenchmarkOptions.map((option) => (
              <option key={option.benchmark_code} value={option.benchmark_code}>
                {getPerformanceBenchmarkOptionLabel(option)}
              </option>
            ))}
          </TextField>
        </div>
      </div>
    </div>
  );
}

const selectControlSx = {
  minWidth: "100%",
  "& .MuiInputBase-root": {
    minHeight: lotusThemeTokens.control.height.compactToolbar,
  },
  "& .MuiInputBase-input": {
    fontSize: lotusThemeTokens.typography.workbench.textCompactStrong,
    fontWeight: 600,
    py: lotusThemeTokens.spacing.step3,
  },
} as const;
