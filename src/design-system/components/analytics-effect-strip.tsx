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
  const maxMagnitude = Math.max(
    0.01,
    ...rows.flatMap((row) => [
      Math.abs(row.allocationPct),
      Math.abs(row.selectionPct),
      Math.abs(row.interactionPct),
    ])
  );

  return (
    <Box sx={{ display: "grid", gap: lotusThemeTokens.spacing.step2 }}>
      {rows.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(96px, 10rem) minmax(0, 1fr) minmax(84px, 6rem)",
            gap: lotusThemeTokens.spacing.step2,
            alignItems: "center",
          }}
        >
          <Text variant="subsectionTitle" as="div" className="analytics-effect-strip-label">
            {row.label}
          </Text>
          <Box
            sx={{
              position: "relative",
              display: "grid",
              gap: "4px",
              minHeight: 34,
              paddingInline: lotusThemeTokens.spacing.step2,
              paddingBlock: "4px",
              borderRadius: `${lotusThemeTokens.radius.md}px`,
              border: "1px solid rgba(23, 32, 43, 0.06)",
              background:
                "linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)",
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                position: "absolute",
                left: "50%",
                top: "5px",
                bottom: "5px",
                width: "1px",
                bgcolor: "rgba(64, 82, 108, 0.16)",
              }}
            />
            <EffectBar value={row.allocationPct} color="#5b9bd5" maxMagnitude={maxMagnitude} />
            <EffectBar value={row.selectionPct} color="#7fa65a" maxMagnitude={maxMagnitude} />
            <EffectBar value={row.interactionPct} color="#b07a8e" maxMagnitude={maxMagnitude} />
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

function EffectBar({
  value,
  color,
  maxMagnitude,
}: {
  value: number;
  color: string;
  maxMagnitude: number;
}) {
  const magnitudePct = Math.min((Math.abs(value) / maxMagnitude) * 48, 48);
  const hasValue = Math.abs(value) > 0.0001;

  return (
    <Box
      sx={{
        position: "relative",
        height: 6,
        borderRadius: 999,
        backgroundColor: "rgba(222, 228, 235, 0.68)",
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          bottom: 0,
          left: value >= 0 ? "50%" : `calc(50% - ${magnitudePct}%)`,
          width: hasValue ? `${Math.max(magnitudePct, 1.4)}%` : 0,
          borderRadius: 999,
          backgroundColor: color,
        },
      }}
    />
  );
}
