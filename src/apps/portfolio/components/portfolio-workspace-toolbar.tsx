"use client";

import { useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import {
  FilterBar,
  ModeTabs,
  PageToolbar,
  WorkbenchSegmentedControl,
  WorkbenchToolbarGroup,
} from "@/design-system";

import { formatDate } from "../formatters";
import type {
  PortfolioFilterChip,
  PortfolioFilterKey,
  PortfolioFilterOptions,
  PortfolioWorkspaceContext,
  PortfolioWorkspaceControls,
  PortfolioViewMode,
} from "../view-model";
import {
  getActivePortfolioFilterCount,
  PORTFOLIO_TIME_WINDOW_OPTIONS,
} from "../view-model";
import PortfolioModuleFilterPanel from "./portfolio-module-filter-panel";

export default function PortfolioWorkspaceToolbar({
  controls,
  context,
  filterOptions,
  activeFilterChips,
  onControlsChange,
  onFilterReset,
  onFilterChipRemove,
  onExport,
  quickActions,
}: {
  controls: PortfolioWorkspaceControls;
  context: PortfolioWorkspaceContext;
  filterOptions: PortfolioFilterOptions;
  activeFilterChips: PortfolioFilterChip[];
  onControlsChange: (patch: Partial<PortfolioWorkspaceControls>) => void;
  onFilterReset: () => void;
  onFilterChipRemove: (key: PortfolioFilterKey) => void;
  onExport: () => void;
  quickActions: Array<{ key: string; label: string; href: string }>;
}) {
  const [filtersAnchor, setFiltersAnchor] = useState<HTMLElement | null>(null);
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);

  const historicalContextCopy = useMemo(() => {
    if (context.historicalSnapshotState === "unsupported") {
      return `As of ${formatDate(context.selectedAsOfDate)}. ${context.historicalSnapshotReason}`;
    }

    if (context.historicalSnapshotState === "partial") {
      return `As of ${formatDate(context.selectedAsOfDate)}. ${context.historicalSnapshotReason}`;
    }

    if (!context.hasHistoricalGap) {
      return `As of ${formatDate(context.selectedAsOfDate)}. Snapshot-backed modules use the selected portfolio snapshot.`;
    }

    return `As of ${formatDate(context.selectedAsOfDate)}. Date-aware modules use the selected context; snapshot-backed modules continue to use the latest available state.`;
  }, [
    context.hasHistoricalGap,
    context.historicalSnapshotReason,
    context.historicalSnapshotState,
    context.selectedAsOfDate,
  ]);
  const activeFilterCount = getActivePortfolioFilterCount(controls);
  const supportsCustomRange = controls.viewMode === "detailed";
  const historicalControlTitle = !context.supportsHistoricalSnapshots
    ? context.historicalSnapshotReason
    : undefined;
  const reportingCurrencyControlTitle = !context.supportsReportingCurrencyRestatement
    ? context.reportingCurrencyRestatementReason
    : undefined;
  const contextSegments = useMemo(() => {
    const segments = [historicalContextCopy];

    if (context.reportingCurrencyRestatementState !== "supported") {
      segments.push(context.reportingCurrencyRestatementReason);
    }

    if (supportsCustomRange) {
      segments.push(
        `Period ${context.periodLabel}: ${formatDate(context.effectivePeriodStartDate)} to ${formatDate(
          context.effectivePeriodEndDate
        )}.`
      );
    } else {
      segments.push(`Period ${context.periodLabel}.`);
    }

    return segments;
  }, [
    context.effectivePeriodEndDate,
    context.effectivePeriodStartDate,
    context.periodLabel,
    context.reportingCurrencyRestatementReason,
    context.reportingCurrencyRestatementState,
    historicalContextCopy,
    supportsCustomRange,
  ]);

  return (
    <PageToolbar className="portfolio-workspace-toolbar">
      <div className="portfolio-workspace-toolbar-row">
        <div className="portfolio-workspace-toolbar-groups">
          <WorkbenchToolbarGroup
            title="Context"
            className="portfolio-workspace-toolbar-group portfolio-workspace-toolbar-group-context"
            ariaLabel="Context controls"
          >
              <div className="portfolio-workspace-toolbar-field">
                <label htmlFor="portfolio-as-of-date">As of</label>
                <TextField
                  id="portfolio-as-of-date"
                  type="date"
                  size="small"
                  value={controls.asOfDate}
                  onChange={(event) => onControlsChange({ asOfDate: event.target.value })}
                  inputProps={{ max: context.selectedAsOfDate }}
                  title={historicalControlTitle}
                  disabled={!context.supportsHistoricalSnapshots}
                />
              </div>

              <div className="portfolio-workspace-toolbar-field">
                <label htmlFor="portfolio-reporting-currency">Reporting Currency</label>
                <TextField
                  id="portfolio-reporting-currency"
                  select
                  size="small"
                  value={controls.reportingCurrency}
                  onChange={(event) =>
                    onControlsChange({ reportingCurrency: event.target.value })
                  }
                  SelectProps={{ native: true }}
                  title={reportingCurrencyControlTitle}
                  disabled={!context.supportsReportingCurrencyRestatement}
                >
                  {context.currencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </TextField>
              </div>
          </WorkbenchToolbarGroup>

          <WorkbenchToolbarGroup
            title="View"
            className="portfolio-workspace-toolbar-group portfolio-workspace-toolbar-group-view"
            ariaLabel="View controls"
          >
              <div className="portfolio-workspace-toolbar-field portfolio-workspace-toolbar-field-grow">
                <ModeTabs
                  value={controls.viewMode}
                  onChange={(nextValue: PortfolioViewMode) => {
                    onControlsChange({ viewMode: nextValue });
                  }}
                  options={[
                    { key: "summary", label: "Summary" },
                    { key: "detailed", label: "Detailed" },
                  ]}
                  ariaLabel="Portfolio view navigation"
                  className="portfolio-primary-view-tabs"
                />
              </div>
          </WorkbenchToolbarGroup>
        </div>

        <div className="portfolio-workspace-toolbar-sidecar">
          <div className="portfolio-workspace-toolbar-actions">
            <Button
              variant="outlined"
              size="small"
              className="portfolio-workspace-toolbar-action"
              aria-haspopup="menu"
              aria-expanded={Boolean(filtersAnchor)}
              aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"}
              onClick={(e) => setFiltersAnchor(e.currentTarget)}
            >
              {activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              className="portfolio-workspace-toolbar-action"
              aria-haspopup="menu"
              aria-expanded={Boolean(columnsAnchor)}
              aria-label="Columns"
              onClick={(e) => setColumnsAnchor(e.currentTarget)}
              disabled={controls.viewMode !== "detailed"}
            >
              Columns
            </Button>
            <Button
              variant="outlined"
              size="small"
              className="portfolio-workspace-toolbar-action"
              aria-label="Export portfolio data"
              onClick={onExport}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              size="small"
              className="portfolio-workspace-toolbar-action"
              aria-haspopup="menu"
              aria-expanded={Boolean(actionsAnchor)}
              aria-label="More actions"
              onClick={(e) => setActionsAnchor(e.currentTarget)}
            >
              More
            </Button>
          </div>

          <WorkbenchToolbarGroup
            title="Period"
            className="portfolio-workspace-toolbar-group portfolio-workspace-toolbar-group-period"
            ariaLabel="Period controls"
          >
              <div className="portfolio-workspace-toolbar-field portfolio-workspace-toolbar-field-grow portfolio-workspace-toolbar-field-presets">
                <WorkbenchSegmentedControl
                  value={controls.timeWindow}
                  onChange={(timeWindow) => onControlsChange({ timeWindow })}
                  options={PORTFOLIO_TIME_WINDOW_OPTIONS.map((option) => ({
                    key: option,
                    label: option,
                  }))}
                  ariaLabel="Portfolio period presets"
                  className="portfolio-workspace-toolbar-period-control"
                />
              </div>

              {supportsCustomRange ? (
                <>
                  <div className="portfolio-workspace-toolbar-field portfolio-workspace-toolbar-field-range-start">
                    <label htmlFor="portfolio-custom-start-date">From</label>
                    <TextField
                      id="portfolio-custom-start-date"
                      type="date"
                      size="small"
                      value={controls.customStartDate}
                      onChange={(event) => onControlsChange({ customStartDate: event.target.value })}
                      inputProps={{ max: controls.customEndDate || context.selectedAsOfDate }}
                    />
                  </div>

                  <div className="portfolio-workspace-toolbar-field portfolio-workspace-toolbar-field-range-end">
                    <label htmlFor="portfolio-custom-end-date">To</label>
                    <TextField
                      id="portfolio-custom-end-date"
                      type="date"
                      size="small"
                      value={controls.customEndDate}
                      onChange={(event) => onControlsChange({ customEndDate: event.target.value })}
                      inputProps={{
                        max: context.selectedAsOfDate,
                        min: controls.customStartDate || undefined,
                      }}
                    />
                  </div>
                </>
              ) : null}
          </WorkbenchToolbarGroup>
        </div>
      </div>

      <div className="portfolio-workspace-toolbar-context">
        {contextSegments.map((segment) => (
          <span key={segment}>{segment}</span>
        ))}
      </div>

      {activeFilterChips.length ? (
        <FilterBar className="portfolio-filter-chip-row">
          {activeFilterChips.map((chip) => (
            <Chip
              key={chip.key}
              label={`${chip.label}: ${chip.value}`}
              size="small"
              onDelete={() => onFilterChipRemove(chip.key)}
            />
          ))}
          <Button size="small" variant="text" onClick={onFilterReset}>
            Reset to default
          </Button>
        </FilterBar>
      ) : null}

      <Menu
        anchorEl={filtersAnchor}
        open={Boolean(filtersAnchor)}
        onClose={() => setFiltersAnchor(null)}
      >
        <PortfolioModuleFilterPanel
          controls={controls}
          filterOptions={filterOptions}
          availableFilters={[
            "asOfDate",
            "reportingCurrency",
            "includeCash",
            "assetClass",
            "sector",
            "region",
            "positionStatus",
            "transactionType",
            "timeWindow",
            "showOnlyNonZeroRows",
            "showOnlyExceptions",
          ]}
          reportingCurrencies={context.currencyOptions}
          onControlsChange={onControlsChange}
          onReset={() => {
            onFilterReset();
          }}
        />
      </Menu>

      <Menu
        anchorEl={columnsAnchor}
        open={Boolean(columnsAnchor)}
        onClose={() => setColumnsAnchor(null)}
      >
        <MenuItem
          selected={controls.columnMode === "essential"}
            onClick={() => {
            onControlsChange({ columnMode: "essential" });
            setColumnsAnchor(null);
          }}
        >
          Essential columns
        </MenuItem>
        <MenuItem
          selected={controls.columnMode === "expanded"}
            onClick={() => {
            onControlsChange({ columnMode: "expanded" });
            setColumnsAnchor(null);
          }}
        >
          Expanded columns
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={actionsAnchor}
        open={Boolean(actionsAnchor)}
        onClose={() => setActionsAnchor(null)}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Stack spacing={1}>
            {quickActions.map((action, index) => (
              <Box key={action.key}>
                {index ? <Divider sx={{ mb: 1 }} /> : null}
                <Button
                  href={action.href}
                  size="small"
                  variant="text"
                  sx={{ justifyContent: "flex-start", width: "100%" }}
                >
                  {action.label}
                </Button>
              </Box>
            ))}
          </Stack>
        </Box>
      </Menu>
    </PageToolbar>
  );
}
