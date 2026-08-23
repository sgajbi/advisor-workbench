import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

import { cx } from "../utils/cx";
import styles from "./kpi-stat-tile.module.css";
import Text from "./text";

const TONE_CLASS = {
  neutral: styles.neutral,
  success: styles.success,
  warn: styles.warn,
  danger: styles.danger,
} as const;

export default function KpiStatTile({
  label,
  value,
  support,
  definition,
  valueTone,
  onClick,
  density = "default",
}: {
  label: string;
  value: React.ReactNode;
  support?: React.ReactNode;
  definition?: string;
  valueTone?: "neutral" | "success" | "warn" | "danger";
  onClick?: () => void;
  density?: "default" | "compact";
}) {
  const accessibleLabel = `${label}: ${typeof value === "string" || typeof value === "number" ? value : "Expand"}`;
  const tile = (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-density={density}
      data-tone={valueTone ?? "neutral"}
      className={cx(
        styles.tile,
        density === "compact" && styles.compact,
        onClick && styles.interactive,
        TONE_CLASS[valueTone ?? "neutral"]
      )}
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
      <Text variant="dataLabel" className={styles.label} data-slot="label">
        {label}
      </Text>
      <Text variant="metricValueL" className={styles.value} data-slot="value">
        {value}
      </Text>
      <Text variant="bodySmall" className={styles.support} data-slot="support">
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
