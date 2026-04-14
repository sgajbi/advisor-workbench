import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

import Text from "./text";

export default function KpiStatTile({
  label,
  value,
  support,
  definition,
  valueTone,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  support?: React.ReactNode;
  definition?: string;
  valueTone?: "neutral" | "success" | "warn" | "danger";
  onClick?: () => void;
}) {
  const accessibleLabel = `${label}: ${typeof value === "string" || typeof value === "number" ? value : "Expand"}`;
  const tile = (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "kpi-stat-tile",
        onClick ? "kpi-stat-tile-interactive" : "",
        `kpi-stat-tile-${valueTone}`,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={onClick ? accessibleLabel : undefined}
      title={typeof definition === "string" ? definition : undefined}
      sx={{
        minWidth: 0,
        width: "100%",
        textAlign: "left",
        border: "none",
        background: "transparent",
        cursor: onClick ? "pointer" : "default",
        appearance: "none",
      }}
    >
      <Text variant="dataLabel" className="kpi-stat-label">
        {label}
      </Text>
      <Text variant="metricValueL" className="kpi-stat-value">
        {value}
      </Text>
      <Text variant="bodySmall" className="kpi-stat-support">
        {support ?? "\u00A0"}
      </Text>
    </Box>
  );

  if (!definition) {
    return tile;
  }

  return (
    <Tooltip title={definition} arrow>
      <Box component="span" sx={{ display: "block", minWidth: 0 }}>
        {tile}
      </Box>
    </Tooltip>
  );
}
