import { useMemo, useState } from "react";

import { FormControl, MenuItem, Select, Typography } from "@mui/material";

import { AnalyticsTable, WorkbenchDataGridFrame, WorkbenchRankedBarList } from "@/design-system";

import {
  buildPerformancePositionContributionTableModel,
} from "./performance-analytics-table-models";
import PerformanceAnalysisDetailPane from "./performance-analysis-detail-pane";
import PerformanceAnalysisDrilldownWorkspace from "./performance-analysis-drilldown-workspace";
import PerformanceAnalysisInsightPane from "./performance-analysis-insight-pane";
import { getContributionDetailOptions } from "./performance-analysis-detail-options";
import PerformanceContributionAggregateTable from "./performance-contribution-aggregate-table";
import PerformanceContributionContextNote from "./performance-contribution-context-note";
import PerformanceContributionDetailStrip from "./performance-contribution-detail-strip";
import { formatLabel } from "../formatters";
import { CONTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceAnalysisModuleState from "./performance-analysis-module-state";
import PerformanceAnalysisToolbar from "./performance-analysis-toolbar";
import type { PerformanceAnalysisModeProps } from "./performance-workspace-types";
import { inlineControlLabelSx } from "./performance-workspace-view-helpers";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import { formatPct, formatPerformancePositionLabel } from "../formatters";
import type { ContributionRowView, WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

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
  const [detailView, setDetailView] = useState<ContributionDetailView>("positions");
  const hasAggregateContributionLevels = (workspace.contribution?.levels?.length ?? 0) > 0;
  const hasPositionContributionRows = (workspace.contribution?.position_rows?.length ?? 0) > 0;
  const positionTableModel = hasPositionContributionRows
    ? buildPerformancePositionContributionTableModel({
        rows: workspace.contribution?.position_rows ?? [],
      })
    : null;
  const rankedRows = useMemo(
    () => getContributionInsightRows(workspace),
    [workspace]
  );
  const segmentLevel = workspace.contribution?.levels?.[0] ?? null;
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
      title="Performance Drivers"
      subtitle="Contribution drivers and position-level drill-down for the selected period."
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
          <PerformanceAnalysisDrilldownWorkspace
            insightLabel="Top / Bottom Contributors panel"
            detailLabel="Contribution Detail panel"
            insightPane={
              <PerformanceAnalysisInsightPane
                title="Top / Bottom Contributors"
                subtitle="Largest positive and negative position contributions for the selected period."
                className="performance-contribution-insight-pane"
              >
                <PerformanceContributionDetailStrip contribution={workspace.contribution} />
                <div className="performance-contribution-ranked-panel">
                  <WorkbenchRankedBarList
                    title="Contributor Ranking"
                    label="Contribution"
                    rows={rankedRows}
                    scale={
                      rankedRows.length > 0
                        ? Math.max(...rankedRows.map((row) => row.magnitudePct))
                        : 0
                    }
                    emptyMessage="No ranked contribution insight is available for this selection."
                  />
                </div>
                {hasAggregateContributionLevels ? (
                  <PerformanceContributionContextNote contribution={workspace.contribution} />
                ) : null}
              </PerformanceAnalysisInsightPane>
            }
            detailPane={
              <PerformanceAnalysisDetailPane
                title="Contribution Detail"
                subtitle="Inspect position-level contributions or grouped segment contribution."
                value={detailView}
                onChange={setDetailView}
                options={getContributionDetailOptions({
                  positionCount: workspace.contribution.position_rows.length,
                  segmentCount: segmentLevel?.rows.length ?? 0,
                  hasSegmentBreakdown: hasAggregateContributionLevels,
                })}
              >
                {detailView === "positions" ? (
                  positionTableModel ? (
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
                  ) : (
                    <div
                      className="performance-analysis-detail-empty"
                      aria-label="Position contribution detail unavailable"
                    >
                      <strong>Position ranking unavailable</strong>
                      <span>
                        Open Segment breakdown to inspect grouped contribution for the selected
                        segment.
                      </span>
                    </div>
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
                  <div
                    className="performance-analysis-detail-empty"
                    aria-label="Segment contribution detail unavailable"
                  >
                    <strong>Segment breakdown unavailable</strong>
                    <span>
                      Grouped contribution is not available for the current selection and horizon.
                    </span>
                  </div>
                )}
              </PerformanceAnalysisDetailPane>
            }
          />
        ) : null}
      </PerformanceAnalysisModuleState>
    </WorkbenchDataGridFrame>
  );
}

function getContributionInsightRows(workspace: WorkbenchPerformanceWorkspace) {
  const positionRows = [...(workspace.contribution?.position_rows ?? [])]
    .sort((left, right) => Math.abs(right.contribution_pct) - Math.abs(left.contribution_pct))
    .slice(0, 6)
    .map((row) => ({
      key: `position-${row.position_id}`,
      title: formatPerformancePositionLabel(row.position_id),
      subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
      value: formatPct(row.contribution_pct),
      magnitudePct: Math.abs(row.contribution_pct ?? 0),
      tone: row.contribution_pct < 0 ? ("negative" as const) : ("positive" as const),
    }));

  if (positionRows.length > 0) {
    return positionRows;
  }

  const aggregateRows = [...(workspace.contribution?.levels?.[0]?.rows ?? [])]
    .sort((left, right) => Math.abs(right.contribution_pct) - Math.abs(left.contribution_pct))
    .slice(0, 6);

  return aggregateRows.map((row: ContributionRowView) => ({
    key: `segment-${row.key_label}`,
    title: row.key_label,
    subtitle: row.weight_avg_pct == null ? "Grouped contribution" : `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
    value: formatPct(row.contribution_pct),
    magnitudePct: Math.abs(row.contribution_pct ?? 0),
    tone: row.contribution_pct < 0 ? ("negative" as const) : ("positive" as const),
  }));
}
