"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { TextField } from "@mui/material";

import { ActionButton, FieldLabel, Text, WorkbenchChoiceGroup } from "@/design-system";
import { useClientMounted } from "@/design-system/hooks/use-client-mounted";
import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { PerformanceBenchmarkOptionView } from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";
import {
  buildPerformanceControlSelectionPatch,
  buildResolvedBenchmarkOptions,
  type PerformanceControlPatch,
} from "./performance-chart-panel-helpers";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import { getPerformanceBenchmarkOptionLabel } from "./performance-summary-context-helpers";
import choiceStyles from "./performance-choice-groups.module.css";
import styles from "./performance-source-selection-controls.module.css";

type PerformanceSourceSelectionControlsProps = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  benchmarkOptions: PerformanceBenchmarkOptionView[];
  reportStartDate: string;
  reportEndDate: string;
  capabilities: PerformanceWorkspaceCapabilities;
  isUpdating: boolean;
  ariaLabel: string;
  onRequestChange: (patch: PerformanceControlPatch) => void;
};

type ExplicitDateDraft = {
  sourceStartDate: string;
  sourceEndDate: string;
  fromDate: string;
  toDate: string;
};

export default function PerformanceSourceSelectionControls({
  portfolioId,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  benchmarkOptions,
  reportStartDate,
  reportEndDate,
  capabilities,
  isUpdating,
  ariaLabel,
  onRequestChange,
}: PerformanceSourceSelectionControlsProps) {
  const isHydrated = useClientMounted();
  const focusRestoreTargetRef = useRef<HTMLElement | null>(null);
  const wasUpdatingRef = useRef(isUpdating);
  const [dateDraft, setDateDraft] = useState<ExplicitDateDraft>({
    sourceStartDate: reportStartDate,
    sourceEndDate: reportEndDate,
    fromDate: reportStartDate,
    toDate: reportEndDate,
  });
  const activeDateDraft =
    dateDraft.sourceStartDate === reportStartDate && dateDraft.sourceEndDate === reportEndDate
      ? dateDraft
      : {
          sourceStartDate: reportStartDate,
          sourceEndDate: reportEndDate,
          fromDate: reportStartDate,
          toDate: reportEndDate,
        };
  const resolvedBenchmarkOptions = buildResolvedBenchmarkOptions({ benchmark, benchmarkOptions });
  const availableStartDate = capabilities.returnPath.earliestAvailableDate;
  const availableEndDate = capabilities.returnPath.latestAvailableDate;

  useEffect(() => {
    const updateCompleted = wasUpdatingRef.current && !isUpdating;
    wasUpdatingRef.current = isUpdating;
    if (!updateCompleted) {
      return;
    }

    const target = focusRestoreTargetRef.current;
    focusRestoreTargetRef.current = null;
    const activeElement = document.activeElement;
    if (
      target?.isConnected &&
      (activeElement === document.body || activeElement === document.documentElement)
    ) {
      target.focus();
    }
  }, [isUpdating]);

  function updateSelection(patch: PerformanceControlPatch, focusRestoreTarget?: HTMLElement) {
    focusRestoreTargetRef.current = focusRestoreTarget ?? null;
    onRequestChange(
      buildPerformanceControlSelectionPatch({
        patch,
        portfolioId,
        period,
        detailBasis,
        contributionDimension,
        attributionDimension,
        chartFrequency,
        benchmark,
        reportStartDate,
        reportEndDate,
      }),
    );
  }

  function applyExplicitDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeDateDraft.fromDate || !activeDateDraft.toDate) {
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    updateSelection(
      {
        period: "EXPLICIT",
        reportStartDate: activeDateDraft.fromDate,
        reportEndDate: activeDateDraft.toDate,
      },
      submitter instanceof HTMLElement ? submitter : undefined,
    );
  }

  if (!isHydrated) {
    return (
      <div
        className={`performance-analysis-control-bar ${styles.controls}`}
        role="group"
        aria-label={ariaLabel}
        aria-busy="true"
      >
        <ControlCluster className="performance-analysis-control-cluster-selection">
          <ControlSlot label="Horizon" className="performance-analysis-control-slot-horizon">
            <StaticControlValue>{period}</StaticControlValue>
          </ControlSlot>
          <ControlSlot label="Basis" className="performance-analysis-control-slot-basis">
            <StaticControlValue>{detailBasis}</StaticControlValue>
          </ControlSlot>
        </ControlCluster>
        <ControlCluster className="performance-analysis-control-cluster-window">
          <ControlSlot label="Window" className="performance-analysis-control-slot-dates">
            <StaticControlValue>{reportStartDate} to {reportEndDate}</StaticControlValue>
          </ControlSlot>
        </ControlCluster>
        <ControlCluster className="performance-analysis-control-cluster-comparison">
          <ControlSlot label="Frequency" className="performance-analysis-control-slot-frequency">
            <StaticControlValue>{chartFrequency}</StaticControlValue>
          </ControlSlot>
          <ControlSlot label="Benchmark" className="performance-analysis-control-slot-benchmark-select">
            <StaticControlValue>{benchmark ?? "Default benchmark"}</StaticControlValue>
          </ControlSlot>
        </ControlCluster>
      </div>
    );
  }

  return (
    <div
      className={`performance-analysis-control-bar ${styles.controls}`}
      role="group"
      aria-label={ariaLabel}
    >
      <ControlCluster className="performance-analysis-control-cluster-selection">
        <ControlSlot label="Horizon" className="performance-analysis-control-slot-horizon">
          <WorkbenchChoiceGroup
            value={period}
            onChange={(value) =>
              updateSelection({
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
            onChange={(value) => updateSelection({ detailBasis: value })}
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
      </ControlCluster>

      <ControlCluster className="performance-analysis-control-cluster-window">
        <form
          className="performance-analysis-control-slot performance-analysis-control-slot-dates"
          onSubmit={applyExplicitDates}
        >
          <FieldLabel>Window</FieldLabel>
          <div className="performance-analysis-date-row">
            <div className="performance-analysis-date-inputs">
              <TextField
                size="small"
                type="date"
                value={activeDateDraft.fromDate}
                slotProps={{
                  htmlInput: {
                    "aria-label": "From",
                    min: availableStartDate,
                    max: activeDateDraft.toDate || reportEndDate,
                    suppressHydrationWarning: true,
                  },
                }}
                onChange={(event) =>
                  setDateDraft({ ...activeDateDraft, fromDate: event.currentTarget.value })
                }
              />
              <TextField
                size="small"
                type="date"
                value={activeDateDraft.toDate}
                slotProps={{
                  htmlInput: {
                    "aria-label": "To",
                    min: activeDateDraft.fromDate || reportStartDate,
                    max: availableEndDate,
                    suppressHydrationWarning: true,
                  },
                }}
                onChange={(event) =>
                  setDateDraft({ ...activeDateDraft, toDate: event.currentTarget.value })
                }
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
              updateSelection({ chartFrequency: event.target.value }, event.currentTarget)
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
        </ControlSlot>

        <ControlSlot label="Benchmark" className="performance-analysis-control-slot-benchmark-select">
          <TextField
            select
            size="small"
            value={benchmark ?? ""}
            onChange={(event) =>
              updateSelection(
                { benchmark: event.target.value || undefined },
                event.currentTarget,
              )
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

function ControlCluster({ className, children }: { className: string; children: ReactNode }) {
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
