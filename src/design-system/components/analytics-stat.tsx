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
}: {
  label: string;
  value: React.ReactNode;
  support?: React.ReactNode;
  emphasize?: boolean;
  definition?: React.ReactNode;
  valueTone?: "neutral" | "success" | "warn" | "danger";
}) {
  const stat = (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        minWidth: 0,
        px: emphasize ? 3 : 0,
        py: emphasize ? 2 : 0,
        borderRadius: emphasize ? "12px" : 0,
        border: "none",
        background: emphasize ? "#ffffff" : "transparent",
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
