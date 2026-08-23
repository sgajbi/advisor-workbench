"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { TextField } from "@mui/material";

import { ActionButton, FieldLabel, Text, WorkbenchChoiceGroup } from "@/design-system";
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
  presentationControl?: ReactNode;
  onRequestChange: (
    patch: PerformanceControlPatch,
    focusTarget?: PerformanceSourceControlFocusTarget
  ) => void;
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
  presentationControl,
  onRequestChange,
}: PerformanceSourceSelectionControlsProps) {
  const isHydrated = useClientMounted();
  const selectionFocusTargetRef = useRef<HTMLElement | null>(null);
  const focusRestoreFrameRef = useRef<number | null>(null);
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
      { kind: "action", actionLabel: "Apply" },
      submitter instanceof HTMLElement ? submitter : undefined,
    );
  }

  if (!isHydrated) {
    return (
      <div
        className={styles.controls}
        role="group"
        aria-label={ariaLabel}
        aria-busy="true"
      >
        <ControlSlot label="Horizon" className={styles.horizonSlot}>
          <StaticControlValue>{period}</StaticControlValue>
        </ControlSlot>
        <ControlSlot label="Basis" className={styles.basisSlot}>
          <StaticControlValue>{detailBasis}</StaticControlValue>
        </ControlSlot>
        <ControlSlot label="Frequency" className={styles.frequencySlot}>
          <StaticControlValue>{chartFrequency}</StaticControlValue>
        </ControlSlot>
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

      <details
        className={styles.windowDisclosure}
        open={period === "EXPLICIT" ? true : undefined}
        data-performance-control-slot="custom-window"
        data-performance-window-control="true"
      >
        <summary className={styles.windowSummary}>
          <span className={styles.windowSummaryLabel}>Custom window</span>
          <span className={styles.windowSummaryValue}>{windowLabel}</span>
        </summary>
        <form
          className={styles.dateForm}
          data-performance-date-form="true"
          onSubmit={applyExplicitDates}
        >
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
          <ActionButton
            type="submit"
            priority="primary"
            disabled={isUpdating}
            className={styles.applyButton}
          >
            {isUpdating ? "Updating..." : "Apply"}
          </ActionButton>
        </form>
      </details>
      {presentationControl}
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
