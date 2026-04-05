import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

import { cx } from "../utils/cx";
import Text from "./text";

export default function AnalyticsStat({
  label,
  value,
  support,
  emphasize = false,
  definition,
  valueTone = "neutral",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  support?: React.ReactNode;
  emphasize?: boolean;
  definition?: React.ReactNode;
  valueTone?: "neutral" | "success" | "warn" | "danger";
  onClick?: () => void;
}) {
  const accessibleLabel = `${label}: ${typeof value === "string" || typeof value === "number" ? value : "Open detail"}`;
  const stat = (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={onClick ? "analytics-stat-interactive" : undefined}
      aria-label={onClick ? accessibleLabel : undefined}
      title={typeof definition === "string" ? definition : undefined}
      sx={{
        display: "grid",
        gap: 1,
        minWidth: 0,
        minHeight: 44,
        px: emphasize ? 3 : 0,
        py: emphasize ? 2 : 0,
        borderRadius: emphasize ? "12px" : 0,
        border: "none",
        background: emphasize ? "#ffffff" : "transparent",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        outline: "none",
      }}
    >
      <Text variant="label" as="span">
        {label}
      </Text>
      <Text
        variant={emphasize ? "metricValue" : "metricValueCompact"}
        as="div"
        className={cx("analytics-stat-value", getAnalyticsStatToneClassName(valueTone))}
      >
        {value}
      </Text>
      {support ? (
        <Text variant="metadata" as="div">
          {support}
        </Text>
      ) : null}
    </Box>
  );

  if (!definition) {
    return stat;
  }

  return (
    <Tooltip title={definition} arrow>
      <Box component="span" sx={{ display: "block", minWidth: 0 }}>
        {stat}
      </Box>
    </Tooltip>
  );
}

function getAnalyticsStatToneClassName(tone: "neutral" | "success" | "warn" | "danger") {
  switch (tone) {
    case "success":
      return "analytics-stat-value-success";
    case "warn":
      return "analytics-stat-value-warn";
    case "danger":
      return "analytics-stat-value-danger";
    default:
      return "analytics-stat-value-neutral";
  }
}
