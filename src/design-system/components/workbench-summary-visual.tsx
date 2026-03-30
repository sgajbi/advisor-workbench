import type { ComponentPropsWithoutRef } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { cx } from "../utils/cx";

export function WorkbenchSummaryToolbar({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cx("workbench-summary-toolbar", className)} {...props}>
      {children}
    </div>
  );
}

export function WorkbenchSummaryVisualCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx("workbench-summary-visual-card", className)}>{children}</div>;
}

export function WorkbenchSummaryVisualHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Typography
      className={cx("workbench-summary-visual-heading", className)}
      sx={{ fontSize: "0.95rem", fontWeight: 700, color: "text.primary" }}
    >
      {children}
    </Typography>
  );
}

export function WorkbenchSummaryVisualLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Typography
      className={cx("workbench-summary-visual-label", className)}
      sx={{ fontSize: "0.875rem", fontWeight: 700, color: "text.primary" }}
    >
      {children}
    </Typography>
  );
}

export function WorkbenchSummaryVisualValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Typography
      className={cx("workbench-summary-visual-value", className)}
      sx={{
        fontSize: "0.875rem",
        fontWeight: 700,
        color: "text.primary",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </Typography>
  );
}

export function WorkbenchSummaryVisualMeta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Typography
      className={cx("workbench-summary-visual-meta", className)}
      sx={{ fontSize: "0.75rem", color: "text.secondary" }}
    >
      {children}
    </Typography>
  );
}

export function WorkbenchSummaryVisualTrack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Box
      className={cx("workbench-summary-visual-track", className)}
      sx={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}
