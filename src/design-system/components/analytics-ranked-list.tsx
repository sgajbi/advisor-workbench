import Box from "@mui/material/Box";

import {
  WorkbenchSummaryVisualHeading,
  WorkbenchSummaryVisualLabel,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualTrack,
  WorkbenchSummaryVisualValue,
} from "./workbench-summary-visual";

type AnalyticsRankedRow = {
  key: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value: React.ReactNode;
  magnitudePct: number;
  tone: "positive" | "negative";
};

export default function AnalyticsRankedList({
  title,
  label,
  rows,
  scale,
  emptyMessage = "No ranked items are available for this analytical slice.",
}: {
  title: string;
  label: string;
  rows: AnalyticsRankedRow[];
  scale: number;
  emptyMessage?: string;
}) {
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 1,
        }}
      >
        <WorkbenchSummaryVisualHeading>{title}</WorkbenchSummaryVisualHeading>
        <WorkbenchSummaryVisualMeta>{label}</WorkbenchSummaryVisualMeta>
      </Box>

      {rows.length ? (
        <Box sx={{ display: "grid", gap: 1 }}>
          {rows.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.15fr) minmax(120px, 1fr) 80px",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  minWidth: 0,
                }}
              >
                <WorkbenchSummaryVisualLabel>{row.title}</WorkbenchSummaryVisualLabel>
                {row.subtitle ? (
                  <WorkbenchSummaryVisualMeta>{row.subtitle}</WorkbenchSummaryVisualMeta>
                ) : null}
              </Box>

              <WorkbenchSummaryVisualTrack
                className="performance-ranked-bar-track"
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${(Math.abs(row.magnitudePct) / scale) * 100}%`,
                    borderRadius: 999,
                    background:
                      row.tone === "positive"
                        ? "linear-gradient(90deg, #5e8165 0%, #7f9a82 100%)"
                        : "linear-gradient(90deg, #8e625f 0%, #b1827e 100%)",
                  }}
                />
              </WorkbenchSummaryVisualTrack>

              <WorkbenchSummaryVisualValue className="performance-ranked-value">
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
