import type { ElementType, ReactNode } from "react";

import { cx } from "../utils/cx";

type TextVariant =
  | "workspaceTitle"
  | "pageTitle"
  | "sectionTitle"
  | "panelTitle"
  | "subsectionTitle"
  | "metricValueXL"
  | "metricValueL"
  | "metricValueM"
  | "bodySmall"
  | "helperText"
  | "dataLabel"
  | "microLabel"
  | "tableHeader"
  | "tableCell"
  | "buttonLabel"
  | "badgeLabel"
  | "tooltipTitle"
  | "tooltipBody"
  | "cardTitle"
  | "body"
  | "secondary"
  | "label"
  | "eyebrow"
  | "metadata"
  | "metricValue"
  | "metricValueCompact"
  | "badge"
  | "button";

const DEFAULT_TAG_BY_VARIANT: Record<TextVariant, ElementType> = {
  workspaceTitle: "h1",
  pageTitle: "h1",
  sectionTitle: "h2",
  panelTitle: "h3",
  subsectionTitle: "h3",
  metricValueXL: "strong",
  metricValueL: "strong",
  metricValueM: "strong",
  bodySmall: "p",
  helperText: "p",
  dataLabel: "span",
  microLabel: "span",
  tableHeader: "span",
  tableCell: "span",
  buttonLabel: "span",
  badgeLabel: "span",
  tooltipTitle: "strong",
  tooltipBody: "span",
  cardTitle: "h3",
  body: "p",
  secondary: "p",
  label: "span",
  eyebrow: "span",
  metadata: "span",
  metricValue: "strong",
  metricValueCompact: "strong",
  badge: "span",
  button: "span",
};

const CLASS_BY_VARIANT: Record<TextVariant, string> = {
  workspaceTitle: "ui-text-workspace-title",
  pageTitle: "ui-text-page-title",
  sectionTitle: "ui-text-section-title",
  panelTitle: "ui-text-panel-title",
  subsectionTitle: "ui-text-subsection-title",
  metricValueXL: "ui-text-metric-value-xl",
  metricValueL: "ui-text-metric-value-l",
  metricValueM: "ui-text-metric-value-m",
  bodySmall: "ui-text-body-small",
  helperText: "ui-text-helper-text",
  dataLabel: "ui-text-data-label",
  microLabel: "ui-text-micro-label",
  tableHeader: "ui-text-table-header",
  tableCell: "ui-text-table-cell",
  buttonLabel: "ui-text-button-label",
  badgeLabel: "ui-text-badge-label",
  tooltipTitle: "ui-text-tooltip-title",
  tooltipBody: "ui-text-tooltip-body",
  cardTitle: "ui-text-panel-title ui-text-card-title",
  body: "ui-text-body",
  secondary: "ui-text-body-small ui-text-secondary",
  label: "ui-text-data-label ui-text-label",
  eyebrow: "ui-text-micro-label ui-text-eyebrow",
  metadata: "ui-text-metadata",
  metricValue: "ui-text-metric-value-l ui-text-metric-value",
  metricValueCompact: "ui-text-metric-value-m ui-text-metric-value-compact",
  badge: "ui-text-badge-label ui-text-badge",
  button: "ui-text-button-label ui-text-button",
};

export default function Text({
  variant,
  as,
  className,
  children,
}: {
  variant: TextVariant;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const Component = as ?? DEFAULT_TAG_BY_VARIANT[variant];

  return <Component className={cx("ui-text", CLASS_BY_VARIANT[variant], className)}>{children}</Component>;
}

export type { TextVariant };
