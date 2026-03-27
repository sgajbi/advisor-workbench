import { Box, Typography } from "@mui/material";

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
    <Box sx={{ display: "grid", gap: 0.75 }}>
      {rows.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 1.7fr) 72px",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>{row.label}</Typography>
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", minHeight: 10 }}>
            <EffectBar value={row.allocationPct} color="#5b9bd5" />
            <EffectBar value={row.selectionPct} color="#7fa65a" />
            <EffectBar value={row.interactionPct} color="#b07a8e" />
          </Box>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, textAlign: "right" }}>
            {row.totalPct}
          </Typography>
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
