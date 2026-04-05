import type { ComponentPropsWithoutRef } from "react";

import Box from "@mui/material/Box";

import { cx } from "../utils/cx";
import Text from "./text";

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
    <Text variant="cardTitle" as="div" className={cx("workbench-summary-visual-heading", className)}>
      {children}
    </Text>
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
    <Text variant="subsectionTitle" as="div" className={cx("workbench-summary-visual-label", className)}>
      {children}
    </Text>
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
    <Text variant="metricValueCompact" as="div" className={cx("workbench-summary-visual-value", className)}>
      {children}
    </Text>
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
    <Text variant="metadata" as="div" className={cx("workbench-summary-visual-meta", className)}>
      {children}
    </Text>
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
