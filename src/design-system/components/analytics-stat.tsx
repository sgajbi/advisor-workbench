import { Box, Typography } from "@mui/material";

export default function AnalyticsStat({
  label,
  value,
  support,
  emphasize = false,
}: {
  label: string;
  value: React.ReactNode;
  support?: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 0.5,
        minWidth: 0,
        px: emphasize ? 2 : 0,
        py: emphasize ? 1.75 : 0,
        borderRadius: emphasize ? 3 : 0,
        border: emphasize ? "1px solid rgba(31, 39, 51, 0.08)" : "none",
        background: emphasize
          ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,248,250,0.96) 100%)"
          : "transparent",
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: "0.6875rem",
          fontWeight: 800,
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
          fontSize: emphasize ? { xs: "2.2rem", md: "3rem" } : "1.125rem",
          lineHeight: emphasize ? 0.94 : 1.2,
          letterSpacing: emphasize ? "-0.05em" : "-0.02em",
          fontWeight: emphasize ? 800 : 700,
          color: "text.primary",
          minWidth: 0,
        }}
      >
        {value}
      </Typography>
      {support ? (
        <Typography
          component="div"
          sx={{
            fontSize: "0.8125rem",
            lineHeight: 1.45,
            color: "text.secondary",
          }}
        >
          {support}
        </Typography>
      ) : null}
    </Box>
  );
}
