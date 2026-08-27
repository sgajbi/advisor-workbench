"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TextField } from "@mui/material";

import { FieldLabel, Text, WorkbenchChoiceGroup } from "@/design-system";
import { useClientMounted } from "@/design-system/hooks/use-client-mounted";
import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { PerformanceBenchmarkOptionView } from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import { formatDate } from "../formatters";
import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";
import {
  buildPerformanceControlSelectionPatch,
  buildResolvedBenchmarkOptions,
  type PerformanceControlPatch,
} from "./performance-chart-panel-helpers";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import PerformanceCustomWindowDialog, {
  type PerformanceCustomWindow,
} from "./performance-custom-window-dialog";
import { getPerformanceBenchmarkOptionLabel } from "./performance-summary-context-helpers";
import choiceStyles from "./performance-choice-groups.module.css";
import styles from "./performance-source-selection-controls.module.css";
import type { PerformanceSourceControlFocusTarget } from "./performance-workspace-types";

export type PerformanceSourceSelectionControlsProps = {
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
  showFrequency?: boolean;
  presentationControl?: ReactNode;
  onRequestChange: (
    patch: PerformanceControlPatch,
    focusTarget?: PerformanceSourceControlFocusTarget
  ) => void;
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
  showFrequency = true,
  presentationControl,
  onRequestChange,
}: PerformanceSourceSelectionControlsProps) {
  const isHydrated = useClientMounted();
  const selectionFocusTargetRef = useRef<HTMLElement | null>(null);
  const focusRestoreFrameRef = useRef<number | null>(null);
  const wasUpdatingRef = useRef(isUpdating);
  const windowTriggerRef = useRef<HTMLButtonElement | null>(null);
  const windowRequestWasUpdatingRef = useRef(false);
  const [windowDialogOpen, setWindowDialogOpen] = useState(false);
  const [submittedWindow, setSubmittedWindow] = useState<PerformanceCustomWindow | null>(null);
  const resolvedBenchmarkOptions = buildResolvedBenchmarkOptions({ benchmark, benchmarkOptions });
  const availableStartDate = capabilities.returnPath.earliestAvailableDate;
  const availableEndDate = capabilities.returnPath.latestAvailableDate;
  const windowLabel = `${formatDate(reportStartDate)} – ${formatDate(reportEndDate)}`;

  useEffect(() => {
    const updateCompleted = wasUpdatingRef.current && !isUpdating;
    wasUpdatingRef.current = isUpdating;
    if (!updateCompleted) {
      return;
    }

    const firstFrameId = window.requestAnimationFrame(() => {
      const secondFrameId = window.requestAnimationFrame(() => {
        const target = selectionFocusTargetRef.current;
        selectionFocusTargetRef.current = null;
        if (target && !target.isConnected) {
          return;
        }
        const activeElement = document.activeElement;
        if (
          target?.isConnected &&
          (activeElement === document.body || activeElement === document.documentElement)
        ) {
          target.focus();
        }
      });
      focusRestoreFrameRef.current = secondFrameId;
    });
    focusRestoreFrameRef.current = firstFrameId;

    return () => {
      if (focusRestoreFrameRef.current !== null) {
        window.cancelAnimationFrame(focusRestoreFrameRef.current);
        focusRestoreFrameRef.current = null;
      }
    };
  }, [isUpdating]);

  useEffect(() => {
    if (!submittedWindow) {
      windowRequestWasUpdatingRef.current = false;
      return;
    }
    if (isUpdating) {
      windowRequestWasUpdatingRef.current = true;
      return;
    }
    if (!windowRequestWasUpdatingRef.current) {
      return;
    }

    windowRequestWasUpdatingRef.current = false;
    setSubmittedWindow(null);
    setWindowDialogOpen(false);
  }, [isUpdating, submittedWindow]);

  function updateSelection(
    patch: PerformanceControlPatch,
    focusTarget: PerformanceSourceControlFocusTarget,
    focusRestoreTarget?: HTMLElement
  ) {
    const activeElement = document.activeElement;
    selectionFocusTargetRef.current =
      focusRestoreTarget ?? (activeElement instanceof HTMLElement ? activeElement : null);
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
      focusTarget
    );
  }

  function applyExplicitDates(window: PerformanceCustomWindow) {
    setSubmittedWindow(window);
    updateSelection(
      {
        period: "EXPLICIT",
        reportStartDate: window.fromDate,
        reportEndDate: window.toDate,
      },
      { kind: "action", actionLabel: "Apply" },
      windowTriggerRef.current ?? undefined,
    );
  }

  if (!isHydrated) {
    return (
      <div
        className={styles.controls}
        role="group"
        aria-label={ariaLabel}
        aria-busy="true"
        data-performance-frequency-control={showFrequency ? "visible" : "hidden"}
      >
        <ControlSlot label="Horizon" className={styles.horizonSlot}>
          <StaticControlValue>{period}</StaticControlValue>
        </ControlSlot>
        <ControlSlot label="Basis" className={styles.basisSlot}>
          <StaticControlValue>{detailBasis}</StaticControlValue>
        </ControlSlot>
        {showFrequency ? (
          <ControlSlot label="Frequency" className={styles.frequencySlot}>
            <StaticControlValue>{chartFrequency}</StaticControlValue>
          </ControlSlot>
        ) : null}
        <ControlSlot label="Benchmark" className={styles.benchmarkSlot}>
          <StaticControlValue>{benchmark ?? "Default benchmark"}</StaticControlValue>
        </ControlSlot>
        <div className={styles.windowSummaryStatic}>
          <FieldLabel>Custom window</FieldLabel>
          <StaticControlValue>{windowLabel}</StaticControlValue>
        </div>
        {presentationControl}
      </div>
    );
  }

  return (
    <div
      className={styles.controls}
      role="group"
      aria-label={ariaLabel}
      data-performance-source-control-region="true"
      data-performance-frequency-control={showFrequency ? "visible" : "hidden"}
    >
      <ControlSlot label="Horizon" className={styles.horizonSlot}>
        <WorkbenchChoiceGroup
          value={period}
          onChange={(value) =>
            updateSelection(
              {
                period: value,
                reportStartDate: undefined,
                reportEndDate: undefined,
              },
              { kind: "choice", groupLabel: "Horizon", optionLabel: value }
            )
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

      <ControlSlot label="Basis" className={styles.basisSlot}>
        <WorkbenchChoiceGroup
          value={detailBasis}
          onChange={(value) =>
            updateSelection(
              { detailBasis: value },
              { kind: "choice", groupLabel: "Basis", optionLabel: value }
            )
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

      {showFrequency ? (
        <ControlSlot label="Frequency" className={styles.frequencySlot}>
          <TextField
            select
            size="small"
            value={chartFrequency}
            onChange={(event) =>
              updateSelection(
                { chartFrequency: event.target.value },
                { kind: "field", fieldLabel: "Frequency" },
                event.currentTarget
              )
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
      ) : null}

      <ControlSlot label="Benchmark" className={styles.benchmarkSlot}>
        <TextField
          select
          size="small"
          value={benchmark ?? ""}
          onChange={(event) =>
            updateSelection(
              { benchmark: event.target.value || undefined },
              { kind: "field", fieldLabel: "Benchmark" },
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

      <button
        ref={windowTriggerRef}
        type="button"
        className={styles.windowTrigger}
        aria-haspopup="dialog"
        aria-expanded={windowDialogOpen}
        aria-labelledby="performance-review-window-label performance-review-window-value"
        disabled={isUpdating}
        onClick={() => setWindowDialogOpen(true)}
        data-performance-control-slot="custom-window"
        data-performance-window-control="true"
      >
        <span className={styles.windowTriggerCopy}>
          <span id="performance-review-window-label" className={styles.windowSummaryLabel}>
            Review window
          </span>
          <span id="performance-review-window-value" className={styles.windowSummaryValue}>
            {windowLabel}
          </span>
        </span>
        <span className={styles.windowTriggerAction} aria-hidden="true">Edit</span>
      </button>
      {presentationControl}
      <PerformanceCustomWindowDialog
        open={windowDialogOpen}
        confirmedWindow={{ fromDate: reportStartDate, toDate: reportEndDate }}
        earliestAvailableDate={availableStartDate}
        latestAvailableDate={availableEndDate}
        isSubmitting={submittedWindow !== null || isUpdating}
        onCancel={() => setWindowDialogOpen(false)}
        onApply={applyExplicitDates}
        onExited={() => windowTriggerRef.current?.focus()}
      />
    </div>
  );
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
    <div
      className={[styles.slot, className].filter(Boolean).join(" ")}
      data-performance-control-slot={label.toLowerCase()}
    >
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function StaticControlValue({ children }: { children: ReactNode }) {
  return (
    <Text variant="cardTitle" as="div" className={styles.staticValue}>
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
