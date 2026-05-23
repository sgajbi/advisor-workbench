import { FormControl, MenuItem, Select } from "@mui/material";

import { FieldLabel, WorkbenchSummaryToolbar } from "@/design-system";

import { formatLabel } from "../formatters";

type PerformanceAnalysisSegmentToolbarProps = {
  fieldLabel?: string;
  ariaLabel: string;
  value: string;
  disabled?: boolean;
  options: readonly string[];
  isOptionSupported: (option: string) => boolean;
  onChange: (value: string) => void;
};

export default function PerformanceAnalysisSegmentToolbar({
  fieldLabel = "Segment",
  ariaLabel,
  value,
  disabled = false,
  options,
  isOptionSupported,
  onChange,
}: PerformanceAnalysisSegmentToolbarProps) {
  const selectedValue = options.includes(value) ? value : "";

  return (
    <WorkbenchSummaryToolbar className="performance-analysis-toolbar">
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <FieldLabel>{fieldLabel}</FieldLabel>
        <Select
          aria-label={ariaLabel}
          value={selectedValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option} disabled={!isOptionSupported(option)}>
              {formatLabel(option)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </WorkbenchSummaryToolbar>
  );
}
