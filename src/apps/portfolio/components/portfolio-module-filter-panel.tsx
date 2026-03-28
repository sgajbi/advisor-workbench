"use client";

import { type ReactNode } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";

import type {
  PortfolioFilterKey,
  PortfolioFilterOptions,
  PortfolioTimeWindow,
  PortfolioWorkspaceControls,
} from "../view-model";
import { PORTFOLIO_TIME_WINDOW_OPTIONS } from "../view-model";

const FILTER_LABELS: Record<PortfolioFilterKey, string> = {
  asOfDate: "As of",
  reportingCurrency: "Reporting Currency",
  includeCash: "Include Cash",
  assetClass: "Asset Class",
  sector: "Sector",
  region: "Region",
  positionStatus: "Position Status",
  transactionType: "Transaction Type",
  timeWindow: "Period",
  showOnlyNonZeroRows: "Show only non-zero rows",
  showOnlyExceptions: "Show only exceptions",
};

export default function PortfolioModuleFilterPanel({
  controls,
  filterOptions,
  availableFilters,
  reportingCurrencies,
  onControlsChange,
  onReset,
}: {
  controls: PortfolioWorkspaceControls;
  filterOptions: PortfolioFilterOptions;
  availableFilters: PortfolioFilterKey[];
  reportingCurrencies: string[];
  onControlsChange: (patch: Partial<PortfolioWorkspaceControls>) => void;
  onReset: () => void;
}) {
  return (
    <Box className="portfolio-filter-panel">
      <Stack spacing={1.5}>
        {availableFilters.includes("asOfDate") ? (
          <FilterField label={FILTER_LABELS.asOfDate}>
            <input
              className="portfolio-filter-native-input"
              type="date"
              value={controls.asOfDate}
              onChange={(event) => onControlsChange({ asOfDate: event.target.value })}
            />
          </FilterField>
        ) : null}

        {availableFilters.includes("reportingCurrency") ? (
          <FilterField label={FILTER_LABELS.reportingCurrency}>
            <Select
              size="small"
              value={controls.reportingCurrency}
              onChange={(event) =>
                onControlsChange({ reportingCurrency: event.target.value })
              }
            >
              {reportingCurrencies.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FilterField>
        ) : null}

        {availableFilters.includes("includeCash") ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={controls.includeCash}
                onChange={(event) =>
                  onControlsChange({ includeCash: event.target.checked })
                }
              />
            }
            label={FILTER_LABELS.includeCash}
          />
        ) : null}

        {availableFilters.includes("assetClass") ? (
          <FilterSelect
            label={FILTER_LABELS.assetClass}
            value={controls.assetClass}
            options={["ALL", ...filterOptions.assetClasses]}
            onChange={(value) => onControlsChange({ assetClass: value })}
          />
        ) : null}

        {availableFilters.includes("sector") ? (
          <FilterSelect
            label={FILTER_LABELS.sector}
            value={controls.sector}
            options={["ALL", ...filterOptions.sectors]}
            onChange={(value) => onControlsChange({ sector: value })}
          />
        ) : null}

        {availableFilters.includes("region") ? (
          <FilterSelect
            label={FILTER_LABELS.region}
            value={controls.region}
            options={["ALL", ...filterOptions.regions]}
            onChange={(value) => onControlsChange({ region: value })}
          />
        ) : null}

        {availableFilters.includes("positionStatus") ? (
          <FilterSelect
            label={FILTER_LABELS.positionStatus}
            value={controls.positionStatus}
            options={filterOptions.positionStatuses}
            onChange={(value) => onControlsChange({ positionStatus: value })}
          />
        ) : null}

        {availableFilters.includes("transactionType") ? (
          <FilterSelect
            label={FILTER_LABELS.transactionType}
            value={controls.transactionType}
            options={["ALL", ...filterOptions.transactionTypes]}
            onChange={(value) => onControlsChange({ transactionType: value })}
          />
        ) : null}

        {availableFilters.includes("timeWindow") ? (
          <FilterSelect
            label={FILTER_LABELS.timeWindow}
            value={controls.timeWindow}
            options={[...PORTFOLIO_TIME_WINDOW_OPTIONS]}
            onChange={(value) =>
              onControlsChange({ timeWindow: value as PortfolioTimeWindow })
            }
          />
        ) : null}

        {availableFilters.includes("showOnlyNonZeroRows") ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={controls.showOnlyNonZeroRows}
                onChange={(event) =>
                  onControlsChange({ showOnlyNonZeroRows: event.target.checked })
                }
              />
            }
            label={FILTER_LABELS.showOnlyNonZeroRows}
          />
        ) : null}

        {availableFilters.includes("showOnlyExceptions") ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={controls.showOnlyExceptions}
                onChange={(event) =>
                  onControlsChange({ showOnlyExceptions: event.target.checked })
                }
              />
            }
            label={FILTER_LABELS.showOnlyExceptions}
          />
        ) : null}

        <Box className="portfolio-filter-panel-footer">
          <Button size="small" variant="text" onClick={onReset}>
            Reset to default
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <FilterField label={label}>
      <FormControl size="small" fullWidth>
        <Select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option === "ALL" ? "All" : option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FilterField>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box className="portfolio-filter-field">
      <span className="portfolio-filter-field-label">{label}</span>
      {children}
    </Box>
  );
}
