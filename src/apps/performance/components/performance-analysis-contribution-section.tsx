import { FormControl, MenuItem, Select, Typography } from "@mui/material";

import { AnalyticsTable, WorkbenchDataGridFrame } from "@/design-system";

import { buildPerformancePositionContributionTableModel } from "./performance-analytics-table-models";
import PerformanceContributionContextNote from "./performance-contribution-context-note";
import PerformanceContributionDetailStrip from "./performance-contribution-detail-strip";
import { formatLabel, formatPct } from "../formatters";
import { CONTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceAnalysisLevelSection from "./performance-analysis-level-section";
import PerformanceAnalysisModuleState from "./performance-analysis-module-state";
import PerformanceAnalysisToolbar from "./performance-analysis-toolbar";
import type { PerformanceAnalysisModeProps } from "./performance-workspace-types";
import {
  getContributionTotals,
  inlineControlLabelSx,
  shouldShowContributionLocalFx,
} from "./performance-workspace-view-helpers";
import { isCapabilityOptionSupported } from "./performance-capability-options";

type PerformanceAnalysisContributionSectionProps = Pick<
  PerformanceAnalysisModeProps,
  | "workspace"
  | "contributionDimension"
  | "onRequestChange"
  | "isUpdating"
  | "isDetailsPending"
  | "capabilities"
>;

export default function PerformanceAnalysisContributionSection({
  workspace,
  contributionDimension,
  onRequestChange,
  isUpdating,
  isDetailsPending,
  capabilities,
}: PerformanceAnalysisContributionSectionProps) {
  const hasAggregateContributionLevels = (workspace.contribution?.levels?.length ?? 0) > 0;
  const hasPositionContributionRows = (workspace.contribution?.position_rows?.length ?? 0) > 0;
  const positionTableModel = hasPositionContributionRows
    ? buildPerformancePositionContributionTableModel({
        rows: workspace.contribution?.position_rows ?? [],
      })
    : null;
  const actions = (
    <PerformanceAnalysisToolbar>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <Typography component="label" sx={inlineControlLabelSx}>
          Segment
        </Typography>
        <Select
          aria-label="Contribution Segment"
          value={contributionDimension}
          onChange={(event) =>
            onRequestChange?.({
              contributionDimension: event.target.value,
            })
          }
          disabled={isUpdating}
        >
          {CONTRIBUTION_DIMENSION_OPTIONS.map((option) => (
            <MenuItem
              key={option}
              value={option}
              disabled={
                !isCapabilityOptionSupported(capabilities.contributionDetail, "dimension", option)
              }
            >
              {formatLabel(option)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </PerformanceAnalysisToolbar>
  );

  return (
    <WorkbenchDataGridFrame
      id="performance-drivers"
      title="Contribution Detail"
      subtitle="Position and segment contribution detail for the selected horizon."
      actions={actions}
      className="performance-detail-panel-wide performance-analysis-module"
    >
      <PerformanceAnalysisModuleState
        capability={capabilities.contributionDetail}
        isDetailsPending={isDetailsPending}
        loadingText="Loading contribution detail for the selected segment and horizon."
        partialTitle="Contribution detail is partial"
        unavailableTitle="Contribution detail unavailable"
        body={
          capabilities.contributionDetail.reason ??
          "Contribution detail is not available for the current selection."
        }
        hint={
          hasAggregateContributionLevels
            ? "Aggregate contribution remains available even when position-level ranking is absent."
            : "Contribution detail requires source-backed contribution levels for the selected segment and horizon."
        }
        allowPartialContent={hasAggregateContributionLevels}
      >
        {workspace.contribution && hasPositionContributionRows ? (
          <PerformanceContributionDetailStrip contribution={workspace.contribution} />
        ) : null}
        {positionTableModel ? (
          <PerformanceAnalysisLevelSection title="Position Ranking">
            <AnalyticsTable
              className="performance-analysis-table"
              dense
              ariaLabel="Position contribution table"
              columns={positionTableModel.columns}
              rows={positionTableModel.rows.map((row) => ({
                key: row.key,
                ariaLabel: row.ariaLabel,
                cells: row.cells,
              }))}
            />
          </PerformanceAnalysisLevelSection>
        ) : null}
        {workspace.contribution && hasAggregateContributionLevels ? (
          <PerformanceContributionContextNote contribution={workspace.contribution} />
        ) : null}
        {workspace.contribution?.levels.map((level) => {
          const totals = getContributionTotals(workspace, level) ?? null;
          const showLocalFxColumns = shouldShowContributionLocalFx(level, workspace);
          return (
            <PerformanceAnalysisLevelSection
              key={`${level.level}-${level.name}`}
              title={formatLabel(level.name)}
            >
              <AnalyticsTable
                className="performance-analysis-table"
                dense
                ariaLabel={`${formatLabel(level.name)} contribution table`}
                columns={[
                  { key: "bucket", label: "Bucket" },
                  { key: "contribution", label: "Contribution", align: "right" },
                  { key: "weight", label: "Avg. Weight", align: "right" },
                  { key: "return", label: "Return", align: "right" },
                  ...(showLocalFxColumns
                    ? [
                        { key: "local", label: "Local", align: "right" as const },
                        { key: "fx", label: "FX", align: "right" as const },
                      ]
                    : []),
                ]}
                rows={level.rows.map((row) => ({
                  key: `${level.name}-${row.key_label}`,
                  cells: [
                    row.key_label,
                    formatPct(row.contribution_pct),
                    formatPct(row.weight_avg_pct),
                    formatPct(row.total_return_pct),
                    ...(showLocalFxColumns
                      ? [
                          formatPct(row.local_contribution_pct),
                          formatPct(row.fx_contribution_pct),
                        ]
                      : []),
                  ],
                }))}
                footer={[
                  "Total",
                  formatPct(totals?.portfolioContributionPct ?? level.total_contribution_pct),
                  formatPct(level.total_weight_avg_pct ?? totals?.weightAvgPct ?? null),
                  formatPct(
                    level.total_portfolio_return_pct ??
                      workspace.contribution?.total_portfolio_return_pct ??
                      null
                  ),
                  ...(showLocalFxColumns
                    ? [
                        formatPct(totals?.localContributionPct ?? null),
                        formatPct(totals?.fxContributionPct ?? null),
                      ]
                    : []),
                ]}
              />
            </PerformanceAnalysisLevelSection>
          );
        })}
      </PerformanceAnalysisModuleState>
    </WorkbenchDataGridFrame>
  );
}
