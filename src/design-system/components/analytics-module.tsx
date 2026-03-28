import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

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
        gap: 2,
        minWidth: 0,
        p: 3,
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
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
              fontSize: "1rem",
              fontWeight: 650,
              lineHeight: 1.25,
              color: "text.primary",
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              component="div"
              sx={{
                mt: 0.5,
                fontSize: "0.75rem",
                fontWeight: 500,
                lineHeight: 1.45,
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
