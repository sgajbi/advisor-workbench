import { TextField } from "@mui/material";

import { FieldLabel } from "@/design-system";

import type {
  PerformanceHorizonBasisView,
  PerformanceHorizonTableView,
  PerformanceHorizonVisualMode,
} from "./performance-analytics-table-models";
import type { PerformanceChartViewMode } from "./performance-chart-panel-helpers";
import styles from "./performance-horizon-comparison-toolbar.module.css";

export type PerformanceHorizonBasisSelection = "inherit" | PerformanceHorizonBasisView;
export type PerformanceHorizonVisualSelection = "inherit" | PerformanceHorizonVisualMode;

type PerformanceHorizonComparisonToolbarProps = {
  tableView: PerformanceHorizonTableView;
  basisSelection: PerformanceHorizonBasisSelection;
  visualSelection: PerformanceHorizonVisualSelection;
  inheritedBasis: PerformanceHorizonBasisView;
  inheritedReturnView: PerformanceChartViewMode;
  resolvedVisualMode: PerformanceHorizonVisualMode;
  hasRelativeVisual: boolean;
  showVisualMode?: boolean;
  onTableViewChange: (value: PerformanceHorizonTableView) => void;
  onBasisSelectionChange: (value: PerformanceHorizonBasisSelection) => void;
  onVisualSelectionChange: (value: PerformanceHorizonVisualSelection) => void;
};

export default function PerformanceHorizonComparisonToolbar({
  tableView,
  basisSelection,
  visualSelection,
  inheritedBasis,
  inheritedReturnView,
  resolvedVisualMode,
  hasRelativeVisual,
  showVisualMode = true,
  onTableViewChange,
  onBasisSelectionChange,
  onVisualSelectionChange,
}: PerformanceHorizonComparisonToolbarProps) {
  const hasOverride = basisSelection !== "inherit" || visualSelection !== "inherit";
  const basisLabel = basisSelection === "inherit" ? inheritedBasis : basisSelection;
  const returnLabel = visualSelection === "inherit" ? inheritedReturnView : resolvedVisualMode;

  return (
    <div
      className={styles.frame}
      data-performance-comparison-display={hasOverride ? "override" : "inherited"}
    >
      <div className={styles.inheritance} aria-label="Horizon comparison display context">
        <span>{hasOverride ? "Comparison display override" : "Uses analysis selection"}</span>
        <strong>{formatSelectionLabel(basisLabel)} basis · {formatSelectionLabel(returnLabel)} return view</strong>
      </div>
      <details className={styles.disclosure}>
        <summary>Adjust comparison display</summary>
        <div className={styles.options}>
          <SelectOption
            label="Evidence columns"
            value={tableView}
            onChange={(value) => onTableViewChange(value as PerformanceHorizonTableView)}
            options={[
              { value: "combined", label: "Returns and economics" },
              { value: "returns", label: "Returns only" },
              { value: "economics", label: "Portfolio economics" },
            ]}
          />
          <SelectOption
            label="Basis comparison"
            value={basisSelection}
            onChange={(value) => onBasisSelectionChange(value as PerformanceHorizonBasisSelection)}
            options={[
              { value: "inherit", label: `Page basis (${formatSelectionLabel(inheritedBasis)})` },
              { value: "both", label: "Net and gross" },
              { value: "net", label: "Net only" },
              { value: "gross", label: "Gross only" },
            ]}
          />
          {showVisualMode ? (
            <SelectOption
              label="Return comparison"
              value={visualSelection}
              onChange={(value) => onVisualSelectionChange(value as PerformanceHorizonVisualSelection)}
              options={[
                {
                  value: "inherit",
                  label: `Page view (${formatSelectionLabel(inheritedReturnView)})`,
                },
                { value: "absolute", label: "Portfolio and benchmark" },
                {
                  value: "relative",
                  label: "Active return",
                  disabled: !hasRelativeVisual,
                },
                { value: "basis", label: "Net versus gross" },
              ]}
            />
          ) : null}
        </div>
      </details>
    </div>
  );
}

function SelectOption({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.option}>
      <FieldLabel>{label}</FieldLabel>
      <TextField
        select
        size="small"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        SelectProps={{ native: true }}
        slotProps={{ htmlInput: { "aria-label": label } }}
        sx={comparisonSelectSx}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </TextField>
    </div>
  );
}

const comparisonSelectSx = {
  width: "100%",
  "& .MuiInputBase-root": {
    minHeight: "36px",
    background: "var(--panel)",
  },
  "& .MuiInputBase-root.Mui-focused": {
    outline: "2px solid rgba(54, 95, 139, 0.78)",
    outlineOffset: "2px",
  },
  "@media (max-width: 640px)": {
    "& .MuiInputBase-root": {
      minHeight: "44px",
    },
  },
} as const;

function formatSelectionLabel(value: string) {
  const businessLabels: Record<string, string> = {
    both: "Net and gross",
    basis: "Net versus gross",
  };
  if (businessLabels[value]) {
    return businessLabels[value];
  }
  if (value === "NET" || value === "GROSS") {
    return value[0] + value.slice(1).toLowerCase();
  }
  return value[0].toUpperCase() + value.slice(1);
}
