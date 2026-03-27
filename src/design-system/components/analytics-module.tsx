import { Box, Stack, Typography } from "@mui/material";

export default function AnalyticsModule({
  title,
  subtitle,
  actions,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        minWidth: 0,
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(249,250,252,0.94) 100%)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        useFlexGap
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h4"
            sx={{
              m: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "text.primary",
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              component="div"
              sx={{
                mt: 0.25,
                fontSize: "0.75rem",
                lineHeight: 1.4,
                color: "text.secondary",
              }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions ? <Box sx={{ minWidth: 0 }}>{actions}</Box> : null}
      </Stack>
      {children}
    </Box>
  );
}
