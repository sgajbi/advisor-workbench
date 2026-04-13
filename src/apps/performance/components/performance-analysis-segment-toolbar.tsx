import { FormControl, MenuItem, Select } from "@mui/material";

import { FieldLabel } from "@/design-system";

import { formatLabel } from "../formatters";
import PerformanceAnalysisToolbar from "./performance-analysis-toolbar";

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
  return (
    <PerformanceAnalysisToolbar>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <FieldLabel>{fieldLabel}</FieldLabel>
        <Select
          aria-label={ariaLabel}
          value={value}
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
    </PerformanceAnalysisToolbar>
  );
}
