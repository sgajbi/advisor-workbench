import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

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
      <Typography
        component="span"
        sx={{
          fontSize: "0.75rem",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          fontSize: emphasize ? { xs: "2.25rem", md: "2.5rem" } : "1.75rem",
          lineHeight: emphasize ? 1.1 : 1.1,
          letterSpacing: emphasize ? "-0.05em" : "-0.02em",
          fontWeight: 700,
          color: getAnalyticsStatTone(valueTone),
          minWidth: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      {support ? (
        <Typography
          component="div"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 500,
            lineHeight: 1.6,
            color: "text.secondary",
          }}
        >
          {support}
        </Typography>
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

function getAnalyticsStatTone(tone: "neutral" | "success" | "warn" | "danger") {
  switch (tone) {
    case "success":
      return "success.dark";
    case "warn":
      return "warning.dark";
    case "danger":
      return "error.dark";
    default:
      return "text.primary";
  }
}
