import Box from "@mui/material/Box";

import { lotusThemeTokens } from "../theme/tokens";
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
        gap: compact
          ? lotusThemeTokens.spacing.step3
          : lotusThemeTokens.layout.workbenchSectionGap,
        minWidth: 0,
        p: compact
          ? {
              xs: lotusThemeTokens.layout.workbenchCardPaddingCompact,
              md: lotusThemeTokens.layout.workbenchCardPadding,
            }
          : {
              xs: lotusThemeTokens.layout.workbenchCardPadding,
              md: lotusThemeTokens.layout.workbenchCardPadding,
            },
        borderRadius: `${lotusThemeTokens.radius.md}px`,
        border: lotusThemeTokens.color.border.subtle,
        background: lotusThemeTokens.color.surface.panel,
        boxShadow: "none",
      }}
    >
      {title || subtitle || actions ? (
        <Box sx={{ display: "grid", gap: lotusThemeTokens.spacing.step2, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: lotusThemeTokens.spacing.step2,
              minWidth: 0,
            }}
          >
              <Box sx={{ minWidth: 0, flex: "1 1 auto" }} className="workbench-summary-card-header">
              {title ? (
                <Text variant="panelTitle" className="workbench-summary-card-title">
                  {title}
                </Text>
              ) : null}
            </Box>
            {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
          </Box>
          {subtitle ? (
            <Text variant="bodySmall" as="div" className="workbench-summary-card-subtitle">
              {subtitle}
            </Text>
          ) : null}
        </Box>
      ) : null}
      {children}
    </Box>
  );
}
