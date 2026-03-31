"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { WorkbenchSegmentedControl } from "@/design-system";
import type { PerformanceBenchmarkOptionView } from "@/features/workbench/types";

import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import { getPerformanceBenchmarkOptionLabel } from "./performance-summary-context-helpers";

type PerformanceControlPatch = {
  portfolioId?: string;
  period?: string;
  detailBasis?: string;
  contributionDimension?: string;
  attributionDimension?: string;
  chartFrequency?: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

type PerformanceChartViewMode = "combined" | "absolute" | "relative";

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
        <div className="performance-analysis-control-slot performance-analysis-control-slot-horizon">
          <Typography sx={controlLabelSx}>Horizon</Typography>
          <div className="performance-analysis-static-value">{period}</div>
        </div>
        <div className="performance-analysis-control-slot performance-analysis-control-slot-dates">
          <Typography sx={controlLabelSx}>Explicit Date Range</Typography>
          <div className="performance-analysis-static-value">
            {fromDate} to {toDate}
          </div>
        </div>
        <div className="performance-analysis-control-slot">
          <Typography sx={controlLabelSx}>Frequency</Typography>
          <div className="performance-analysis-static-value">{chartFrequency}</div>
        </div>
        <div className="performance-analysis-control-slot">
          <Typography sx={controlLabelSx}>Compared To</Typography>
          <div className="performance-analysis-static-value">{benchmark ?? "Default benchmark"}</div>
        </div>
        <div className="performance-analysis-control-slot">
          <Typography sx={controlLabelSx}>View Mode</Typography>
          <div className="performance-analysis-static-value">{chartViewMode}</div>
        </div>
        <div className="performance-analysis-control-slot performance-analysis-control-slot-basis">
          <Typography sx={controlLabelSx}>Basis</Typography>
          <div className="performance-analysis-static-value">{detailBasis}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-analysis-control-bar" role="group" aria-label="Analysis control bar">
      <div className="performance-analysis-control-slot performance-analysis-control-slot-horizon">
        <Typography sx={controlLabelSx}>Horizon</Typography>
        <ToggleButtonGroup exclusive size="small" value={period} aria-label="Horizon" sx={toggleGroupSx}>
          {PERIOD_OPTIONS.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              suppressHydrationWarning
              onClick={() =>
                onRequestChange({
                  period: option,
                  reportStartDate: undefined,
                  reportEndDate: undefined,
                })
              }
              disabled={isUpdating && option === period}
            >
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

      <form
        className="performance-analysis-control-slot performance-analysis-control-slot-dates"
        onSubmit={onApplyExplicitDates}
      >
        <Typography sx={controlLabelSx}>Explicit Date Range</Typography>
        <div className="performance-analysis-date-row">
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
          <Button
            type="submit"
            variant="contained"
            size="small"
            disableElevation
            suppressHydrationWarning
            className="performance-analysis-apply-button"
          >
            {isUpdating ? "Updating..." : "Apply"}
          </Button>
        </div>
      </form>

      <div className="performance-analysis-control-slot">
        <Typography sx={controlLabelSx}>Frequency</Typography>
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

      <div className="performance-analysis-control-slot">
        <Typography sx={controlLabelSx}>Compared To</Typography>
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
              "aria-label": "Compared To",
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

      <div className="performance-analysis-control-slot">
        <Typography sx={controlLabelSx}>View Mode</Typography>
        <WorkbenchSegmentedControl
          ariaLabel="Return path view mode"
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

      <div className="performance-analysis-control-slot performance-analysis-control-slot-basis">
        <Typography sx={controlLabelSx}>Basis</Typography>
        <ToggleButtonGroup exclusive size="small" value={detailBasis} aria-label="Basis" sx={toggleGroupSx}>
          {BASIS_OPTIONS.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              suppressHydrationWarning
              onClick={() =>
                onRequestChange({
                  detailBasis: option,
                })
              }
              disabled={isUpdating && option === detailBasis}
            >
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>
    </div>
  );
}

const controlLabelSx = {
  mb: 0.25,
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;

const toggleGroupSx = {
  flexWrap: "nowrap",
  gap: 0.375,
  "& .MuiToggleButtonGroup-grouped": {
    borderRadius: "8px !important",
    border: "1px solid rgba(31, 39, 51, 0.1) !important",
    px: 0.95,
    py: 0.4,
    color: "text.secondary",
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.78rem",
    minHeight: 36,
    backgroundColor: "#ffffff",
    whiteSpace: "nowrap",
  },
  "& .Mui-selected": {
    bgcolor: "#1f2733 !important",
    color: "#fff !important",
  },
} as const;

const selectControlSx = {
  minWidth: "100%",
  "& .MuiInputBase-root": {
    minHeight: 36,
  },
  "& .MuiInputBase-input": {
    fontSize: "0.8125rem",
    fontWeight: 600,
    py: 0.95,
  },
} as const;
