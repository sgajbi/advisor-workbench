"use client";

import { useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import type {
  PortfolioWorkspaceContext,
  PortfolioWorkspaceControls,
  PortfolioViewMode,
} from "../view-model";
import { PORTFOLIO_TIME_WINDOW_OPTIONS } from "../view-model";

export default function PortfolioWorkspaceToolbar({
  controls,
  context,
  onControlsChange,
  onExport,
  quickActions,
}: {
  controls: PortfolioWorkspaceControls;
  context: PortfolioWorkspaceContext;
  onControlsChange: (patch: Partial<PortfolioWorkspaceControls>) => void;
  onExport: () => void;
  quickActions: Array<{ key: string; label: string; href: string }>;
}) {
  const [filtersAnchor, setFiltersAnchor] = useState<HTMLElement | null>(null);
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);

  const historicalContextCopy = useMemo(() => {
    if (!context.supportsHistoricalSnapshots) {
      return `As of ${context.selectedAsOfDate}. Historical portfolio snapshots are not source-backed yet, so snapshot modules stay on the latest published state.`;
    }

    if (!context.hasHistoricalGap) {
      return `As of ${context.selectedAsOfDate}. Snapshot-backed modules use the selected portfolio snapshot.`;
    }

    return `Context set to ${context.selectedAsOfDate}. Date-aware modules reflect the selected context; snapshot-backed modules continue to use the latest available portfolio state.`;
  }, [context.hasHistoricalGap, context.selectedAsOfDate, context.supportsHistoricalSnapshots]);

  return (
    <section className="portfolio-workspace-toolbar">
      <div className="portfolio-workspace-toolbar-row">
        <div className="portfolio-workspace-toolbar-field">
          <label htmlFor="portfolio-as-of-date">As of</label>
          <TextField
            id="portfolio-as-of-date"
            type="date"
            size="small"
            value={controls.asOfDate}
            onChange={(event) => onControlsChange({ asOfDate: event.target.value })}
            inputProps={{ max: context.selectedAsOfDate }}
            disabled={!context.supportsHistoricalSnapshots}
            helperText={
              context.supportsHistoricalSnapshots ? undefined : "Historical snapshots pending source support"
            }
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
            disabled={!context.supportsReportingCurrencyRestatement}
            helperText={
              context.supportsReportingCurrencyRestatement
                ? undefined
                : "Cross-currency restatement pending source support"
            }
          >
            {context.currencyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </TextField>
        </div>

        <div className="portfolio-workspace-toolbar-field portfolio-workspace-toolbar-field-grow">
          <label>View</label>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={controls.viewMode}
            onChange={(_event, nextValue: PortfolioViewMode | null) => {
              if (nextValue) {
                onControlsChange({ viewMode: nextValue });
              }
            }}
          >
            <ToggleButton value="summary">Summary</ToggleButton>
            <ToggleButton value="detailed">Detailed</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <div className="portfolio-workspace-toolbar-field portfolio-workspace-toolbar-field-grow">
          <label>Time Window</label>
          <div className="portfolio-segmented-control">
            {PORTFOLIO_TIME_WINDOW_OPTIONS.map((option) => {
              const active = controls.timeWindow === option;
              return (
                <button
                  key={option}
                  type="button"
                  className={
                    active
                      ? "portfolio-segmented-control-button portfolio-segmented-control-button-active"
                      : "portfolio-segmented-control-button"
                  }
                  onClick={() => onControlsChange({ timeWindow: option })}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="portfolio-workspace-toolbar-actions">
          <Button variant="outlined" size="small" onClick={(e) => setFiltersAnchor(e.currentTarget)}>
            Filters
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setColumnsAnchor(e.currentTarget)}
            disabled={controls.viewMode !== "detailed"}
          >
            Columns
          </Button>
          <Button variant="outlined" size="small" onClick={onExport}>
            Export
          </Button>
          <Button variant="outlined" size="small" onClick={(e) => setActionsAnchor(e.currentTarget)}>
            More
          </Button>
        </div>
      </div>

      <div className="portfolio-workspace-toolbar-context">
        <span>{historicalContextCopy}</span>
        <span>
          View mode: <strong>{controls.viewMode === "summary" ? "Summary" : "Detailed"}</strong>
        </span>
        <span>
          Window: <strong>{controls.timeWindow}</strong>
        </span>
      </div>

      <Menu
        anchorEl={filtersAnchor}
        open={Boolean(filtersAnchor)}
        onClose={() => setFiltersAnchor(null)}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={controls.hideEmptyModules}
                onChange={(event) =>
                  onControlsChange({ hideEmptyModules: event.target.checked })
                }
              />
            }
            label="Hide empty modules"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={controls.focusExceptions}
                onChange={(event) =>
                  onControlsChange({ focusExceptions: event.target.checked })
                }
              />
            }
            label="Focus exceptions"
          />
        </Box>
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
    </section>
  );
}
