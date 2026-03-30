import Box from "@mui/material/Box";

import {
  WorkbenchSummaryVisualHeading,
  WorkbenchSummaryVisualLabel,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualTrack,
  WorkbenchSummaryVisualValue,
} from "./workbench-summary-visual";

import { cx } from "../utils/cx";

export type WorkbenchRankedBarRow = {
  key: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value: React.ReactNode;
  magnitudePct: number;
  tone: "positive" | "negative";
};

export default function WorkbenchRankedBarList({
  title,
  label,
  rows,
  scale,
  emptyMessage = "No ranked items are available for this analytical slice.",
  className,
}: {
  title: string;
  label: string;
  rows: WorkbenchRankedBarRow[];
  scale: number;
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <Box className={cx("workbench-ranked-bar-list", className)}>
      <Box className="workbench-ranked-bar-list-header">
        <WorkbenchSummaryVisualHeading>{title}</WorkbenchSummaryVisualHeading>
        <WorkbenchSummaryVisualMeta>{label}</WorkbenchSummaryVisualMeta>
      </Box>

      {rows.length ? (
        <Box className="workbench-ranked-bar-list-body">
          {rows.map((row) => (
            <Box key={row.key} className="workbench-ranked-bar-row">
              <Box className="workbench-ranked-bar-row-meta">
                <WorkbenchSummaryVisualLabel>{row.title}</WorkbenchSummaryVisualLabel>
                {row.subtitle ? (
                  <WorkbenchSummaryVisualMeta>{row.subtitle}</WorkbenchSummaryVisualMeta>
                ) : null}
              </Box>

              <WorkbenchSummaryVisualTrack className="workbench-ranked-bar-track">
                <Box
                  className={cx(
                    "workbench-ranked-bar-fill",
                    row.tone === "positive"
                      ? "workbench-ranked-bar-fill-positive"
                      : "workbench-ranked-bar-fill-negative"
                  )}
                  sx={{
                    height: "100%",
                    width: `${scale > 0 ? (Math.abs(row.magnitudePct) / scale) * 100 : 0}%`,
                  }}
                />
              </WorkbenchSummaryVisualTrack>

              <WorkbenchSummaryVisualValue className="workbench-ranked-bar-value">
                {row.value}
              </WorkbenchSummaryVisualValue>
            </Box>
          ))}
        </Box>
      ) : (
        <WorkbenchSummaryVisualMeta>{emptyMessage}</WorkbenchSummaryVisualMeta>
      )}
    </Box>
  );
}
