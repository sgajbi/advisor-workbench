import { FormControl, MenuItem, Select, Typography } from "@mui/material";

import { AnalyticsTable, Panel } from "@/design-system";

import { formatLabel, formatPct } from "../formatters";
import { CONTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import type { PerformanceAnalysisModeProps } from "./performance-workspace-types";
import {
  getContributionTotals,
  inlineControlLabelSx,
  shouldShowContributionLocalFx,
} from "./performance-workspace-view-helpers";
import PerformanceCapabilityNotice from "./performance-capability-notice";

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
  return (
    <Panel id="performance-drivers" className="performance-detail-panel-wide">
      <div className="performance-section-heading">
        <h3>Contribution Detail</h3>
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
              <MenuItem key={option} value={option}>
                {formatLabel(option)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      {capabilities.contributionDetail.state === "supported" ? (
        workspace.contribution?.levels.map((level) => {
          const totals = getContributionTotals(workspace, level) ?? null;
          const showLocalFxColumns = shouldShowContributionLocalFx(level, workspace);
          return (
            <div key={`${level.level}-${level.name}`} className="performance-detail-block">
              <div className="performance-level-heading">
                <strong>{formatLabel(level.name)}</strong>
              </div>
              <AnalyticsTable
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
            </div>
          );
        })
      ) : isDetailsPending ? (
        <p className="muted">Loading contribution detail for the selected segment and horizon.</p>
      ) : (
        <PerformanceCapabilityNotice
          capability={capabilities.contributionDetail}
          partialTitle="Contribution detail is partial"
          unavailableTitle="Contribution detail unavailable"
          body={
            capabilities.contributionDetail.reason ??
            "Contribution detail is not available for the current selection."
          }
          hint="Contribution detail requires source-backed contribution levels for the selected segment and horizon."
        />
      )}
    </Panel>
  );
}
