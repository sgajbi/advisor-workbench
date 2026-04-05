import Box from "@mui/material/Box";

import { lotusThemeTokens } from "../theme/tokens";
import Text from "./text";

type AnalyticsEffectRow = {
  key: string;
  label: React.ReactNode;
  allocationPct: number;
  selectionPct: number;
  interactionPct: number;
  totalPct: React.ReactNode;
};

export default function AnalyticsEffectStrip({
  rows,
}: {
  rows: AnalyticsEffectRow[];
}) {
  return (
    <Box sx={{ display: "grid", gap: lotusThemeTokens.spacing.step2 }}>
      {rows.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 1.7fr) 72px",
            gap: lotusThemeTokens.spacing.step2,
            alignItems: "center",
          }}
        >
          <Text variant="subsectionTitle" as="div" className="analytics-effect-strip-label">
            {row.label}
          </Text>
          <Box
            sx={{
              display: "flex",
              gap: lotusThemeTokens.spacing.step1,
              alignItems: "center",
              minHeight: 10,
            }}
          >
            <EffectBar value={row.allocationPct} color="#5b9bd5" />
            <EffectBar value={row.selectionPct} color="#7fa65a" />
            <EffectBar value={row.interactionPct} color="#b07a8e" />
          </Box>
          <Text
            variant="metricValueCompact"
            as="div"
            className="analytics-effect-strip-total"
          >
            {row.totalPct}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function EffectBar({ value, color }: { value: number; color: string }) {
  return (
    <Box
      sx={{
        height: 10,
        width: `${Math.min(Math.abs(value) * 18, 100)}%`,
        minWidth: Math.abs(value) > 0 ? 10 : 0,
        borderRadius: 999,
        backgroundColor: color,
      }}
    />
  );
}
