import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import { cx } from "../utils/cx";
import Text from "./text";

export default function AnalyticsModule({
  title,
  subtitle,
  actions,
  children,
  className,
  compact = false,
  id,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  id?: string;
}) {
  return (
    <Box
      id={id}
      className={cx(
        "workbench-summary-card",
        compact && "workbench-summary-card-compact",
        className
      )}
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
          <Box sx={{ minWidth: 0 }} className="workbench-summary-card-header">
            {title ? (
              <Text variant="cardTitle" className="workbench-summary-card-title">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="metadata" as="div" className="workbench-summary-card-subtitle">
                {subtitle}
              </Text>
            ) : null}
          </Box>
          {actions ? <Box sx={{ minWidth: 0 }}>{actions}</Box> : null}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}
