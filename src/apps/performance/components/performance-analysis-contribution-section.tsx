import { useState } from "react";

import { FormControl, MenuItem, Select } from "@mui/material";

import { AnalyticsTable, FieldLabel, WorkbenchDataGridFrame } from "@/design-system";

import {
  buildPerformancePositionContributionTableModel,
} from "./performance-analytics-table-models";
import PerformanceAnalysisDetailPane from "./performance-analysis-detail-pane";
import { getContributionDetailOptions } from "./performance-analysis-detail-options";
import PerformanceContributionAggregateTable from "./performance-contribution-aggregate-table";
import PerformanceContributionContextNote from "./performance-contribution-context-note";
import { formatLabel } from "../formatters";
import { CONTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceAnalysisModuleState from "./performance-analysis-module-state";
import PerformanceAnalysisToolbar from "./performance-analysis-toolbar";
import type { PerformanceAnalysisModeProps } from "./performance-workspace-types";
import { isCapabilityOptionSupported } from "./performance-capability-options";

type ContributionDetailView = "positions" | "segments";

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
  const [detailView, setDetailView] = useState<ContributionDetailView>(
    hasPositionContributionRows ? "positions" : "segments"
  );
  const positionTableModel = hasPositionContributionRows
    ? buildPerformancePositionContributionTableModel({
        rows: workspace.contribution?.position_rows ?? [],
      })
    : null;
  const segmentLevel = workspace.contribution?.levels?.[0] ?? null;
  const actions = (
    <PerformanceAnalysisToolbar>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <FieldLabel>Segment</FieldLabel>
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
      title="Performance Drivers"
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
        {workspace.contribution ? (
          <PerformanceAnalysisDetailPane
            title="Contribution Breakdown"
            value={detailView}
            onChange={setDetailView}
            options={getContributionDetailOptions({
              positionCount: workspace.contribution.position_rows.length,
              segmentCount: segmentLevel?.rows.length ?? 0,
              hasSegmentBreakdown: hasAggregateContributionLevels,
            })}
            className="performance-analysis-contribution-detail-pane"
          >
            {hasAggregateContributionLevels ? (
              <PerformanceContributionContextNote
                contribution={workspace.contribution}
                showReconciliation={false}
              />
            ) : null}
            {detailView === "positions" ? (
              positionTableModel ? (
                <AnalyticsTable
                  className="performance-analysis-table"
                  density="compact"
                  variant="analysis"
                  ariaLabel="Position contribution table"
                  columns={positionTableModel.columns}
                  rows={positionTableModel.rows.map((row) => ({
                    key: row.key,
                    ariaLabel: row.ariaLabel,
                    cells: row.cells,
                  }))}
                />
              ) : (
                <AnalyticsTable
                  className="performance-analysis-table"
                  density="compact"
                  variant="analysis"
                  ariaLabel="Position contribution detail unavailable"
                  columns={[
                    { key: "position", label: "Position" },
                    { key: "contribution", label: "Contribution", align: "right" },
                  ]}
                  rows={[]}
                  emptyState={{
                    title: "Position ranking unavailable",
                    body:
                      "Open Segment Contribution to inspect grouped contribution for the selected segment.",
                  }}
                />
              )
            ) : segmentLevel ? (
              <PerformanceContributionAggregateTable
                className="performance-analysis-table"
                contribution={workspace.contribution}
                level={segmentLevel}
                ariaLabel={`${formatLabel(segmentLevel.name)} contribution table`}
                rowKeyPrefix={segmentLevel.name}
              />
            ) : (
              <AnalyticsTable
                className="performance-analysis-table"
                density="compact"
                variant="analysis"
                ariaLabel="Segment contribution detail unavailable"
                columns={[
                  { key: "segment", label: "Segment" },
                  { key: "contribution", label: "Contribution", align: "right" },
                ]}
                rows={[]}
                emptyState={{
                  title: "Segment breakdown unavailable",
                  body:
                    "Grouped contribution is not available for the current selection and horizon.",
                }}
              />
            )}
          </PerformanceAnalysisDetailPane>
        ) : null}
      </PerformanceAnalysisModuleState>
    </WorkbenchDataGridFrame>
  );
}
