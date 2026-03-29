import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { cx } from "../utils/cx";

export default function AnalyticsModule({
  title,
  subtitle,
  actions,
  children,
  className,
  compact = false,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Box
      className={cx(className)}
      sx={{
        display: "grid",
        gap: compact ? 1.5 : 2,
        minWidth: 0,
        p: compact ? { xs: 2.25, md: 2.5 } : { xs: 2.5, md: 3 },
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        boxShadow: "none",
      }}
    >
      {title || subtitle || actions ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "flex-start" }}
          useFlexGap
        >
          <Box sx={{ minWidth: 0 }}>
            {title ? (
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
            ) : null}
            {subtitle ? (
              <Typography
                component="div"
                sx={{
                  mt: compact ? 0.25 : 0.5,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: "text.secondary",
                  maxWidth: "36ch",
                }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {actions ? <Box sx={{ minWidth: 0 }}>{actions}</Box> : null}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}
