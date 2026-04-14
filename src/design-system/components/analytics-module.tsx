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
  surface = "primary",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  id?: string;
  surface?: "primary" | "secondary" | "tertiary";
}) {
  return (
    <Box
      id={id}
      className={cx(
        "workbench-summary-card",
        compact && "workbench-summary-card-compact",
        "panel-shell",
        `panel-shell-surface-${surface}`,
        compact ? "panel-shell-density-compact" : "panel-shell-density-default",
        className
      )}
      sx={{
        display: "grid",
        gap: compact
          ? lotusThemeTokens.layout.workbenchSummaryBodyGap
          : lotusThemeTokens.layout.workbenchSectionGap,
        minWidth: 0,
        p: compact ? lotusThemeTokens.layout.panelPaddingCompact : lotusThemeTokens.layout.panelPaddingDefault,
        borderRadius: `${lotusThemeTokens.radius.panel}px`,
        border: `1px solid ${lotusThemeTokens.color.border.default}`,
        background:
          surface === "secondary"
            ? lotusThemeTokens.color.surface.secondary
            : surface === "tertiary"
              ? lotusThemeTokens.color.surface.tertiary
              : lotusThemeTokens.color.surface.primary,
        boxShadow: lotusThemeTokens.elevation.none,
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
