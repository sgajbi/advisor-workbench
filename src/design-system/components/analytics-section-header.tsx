import { Box, Stack, Typography } from "@mui/material";

export default function AnalyticsSectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", md: "center" }}
      useFlexGap
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 0.25,
            fontSize: { xs: "1.125rem", md: "1.25rem" },
            lineHeight: 1.08,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            component="div"
            sx={{
              fontSize: "0.8125rem",
              color: "text.secondary",
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Box sx={{ minWidth: 0, width: { xs: "100%", md: "auto" } }}>{actions}</Box>
      ) : null}
    </Stack>
  );
}
