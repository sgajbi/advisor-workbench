"use client";

import type { FormEvent, ReactNode } from "react";
import { TextField } from "@mui/material";

import {
  ActionButton,
  FieldLabel,
  Text,
  WorkbenchChoiceGroup,
} from "@/design-system";
import { useClientMounted } from "@/design-system/hooks/use-client-mounted";
import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { PerformanceBenchmarkOptionView } from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";
import type {
  PerformanceChartViewMode,
  PerformanceControlPatch,
} from "./performance-chart-panel-helpers";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import { getPerformanceBenchmarkOptionLabel } from "./performance-summary-context-helpers";
import choiceStyles from "./performance-choice-groups.module.css";

type PerformanceAnalysisControlBarProps = {
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
};

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
}: PerformanceAnalysisControlBarProps) {
  const isHydrated = useClientMounted();

  if (!isHydrated) {
    return (
      <div
        className="performance-analysis-control-bar"
        role="group"
        aria-label="Analysis control bar"
        aria-busy="true"
      >
        <ControlCluster className="performance-analysis-control-cluster-selection">
          <ControlSlot label="Horizon" className="performance-analysis-control-slot-horizon">
            <StaticControlValue>{period}</StaticControlValue>
          </ControlSlot>
          <ControlSlot label="Basis" className="performance-analysis-control-slot-basis">
            <StaticControlValue>{detailBasis}</StaticControlValue>
          </ControlSlot>
          <ControlSlot label="View" className="performance-analysis-control-slot-view">
            <StaticControlValue>{chartViewMode}</StaticControlValue>
          </ControlSlot>
        </ControlCluster>
        <ControlCluster className="performance-analysis-control-cluster-window">
          <ControlSlot label="Window" className="performance-analysis-control-slot-dates">
            <StaticControlValue>
              {fromDate} to {toDate}
            </StaticControlValue>
          </ControlSlot>
        </ControlCluster>
        <ControlCluster className="performance-analysis-control-cluster-comparison">
          <ControlSlot label="Frequency" className="performance-analysis-control-slot-frequency">
            <StaticControlValue>{chartFrequency}</StaticControlValue>
          </ControlSlot>
          <ControlSlot
            label="Benchmark"
            className="performance-analysis-control-slot-benchmark-select"
          >
            <StaticControlValue>{benchmark ?? "Default benchmark"}</StaticControlValue>
          </ControlSlot>
        </ControlCluster>
      </div>
    );
  }

  return (
    <div className="performance-analysis-control-bar" role="group" aria-label="Analysis control bar">
      <ControlCluster className="performance-analysis-control-cluster-selection">
        <ControlSlot label="Horizon" className="performance-analysis-control-slot-horizon">
          <WorkbenchChoiceGroup
            value={period}
            onChange={(value) =>
              onRequestChange({
                period: value,
                reportStartDate: undefined,
                reportEndDate: undefined,
              })
            }
            ariaLabel="Horizon"
            className={choiceStyles.horizon}
            density="compact"
            options={PERIOD_OPTIONS.map((option) => ({
              key: option,
              label: option,
              disabled: isUpdating,
            }))}
          />
        </ControlSlot>

        <ControlSlot label="Basis" className="performance-analysis-control-slot-basis">
          <WorkbenchChoiceGroup
            value={detailBasis}
            onChange={(value) =>
              onRequestChange({
                detailBasis: value,
              })
            }
            ariaLabel="Basis"
            className={choiceStyles.horizon}
            density="compact"
            options={BASIS_OPTIONS.map((option) => ({
              key: option,
              label: option,
              disabled: isUpdating,
            }))}
          />
        </ControlSlot>

        <ControlSlot label="View" className="performance-analysis-control-slot-view">
          <WorkbenchChoiceGroup
            ariaLabel="Return view"
            className={choiceStyles.horizon}
            density="compact"
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
        </ControlSlot>
      </ControlCluster>

      <ControlCluster className="performance-analysis-control-cluster-window">
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
      </ControlCluster>

      <ControlCluster className="performance-analysis-control-cluster-comparison">
        <ControlSlot label="Frequency" className="performance-analysis-control-slot-frequency">
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
                disabled={
                  !isCapabilityOptionSupported(capabilities.returnPath, "frequency", option.value)
                }
              >
                {option.label}
              </option>
            ))}
          </TextField>
        </ControlSlot>

        <ControlSlot
          label="Benchmark"
          className="performance-analysis-control-slot-benchmark-select"
        >
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
        </ControlSlot>
      </ControlCluster>
    </div>
  );
}

function ControlCluster({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return <div className={`performance-analysis-control-cluster ${className}`}>{children}</div>;
}

function ControlSlot({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={["performance-analysis-control-slot", className].filter(Boolean).join(" ")}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function StaticControlValue({ children }: { children: ReactNode }) {
  return (
    <Text variant="cardTitle" as="div" className="performance-analysis-static-value">
      {children}
    </Text>
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
