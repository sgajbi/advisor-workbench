import type { ElementType, ReactNode } from "react";

import { cx } from "../utils/cx";

type TextVariant =
  | "pageTitle"
  | "sectionTitle"
  | "subsectionTitle"
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
  pageTitle: "h1",
  sectionTitle: "h2",
  subsectionTitle: "h3",
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
  pageTitle: "ui-text-page-title",
  sectionTitle: "ui-text-section-title",
  subsectionTitle: "ui-text-subsection-title",
  cardTitle: "ui-text-card-title",
  body: "ui-text-body",
  secondary: "ui-text-secondary",
  label: "ui-text-label",
  eyebrow: "ui-text-eyebrow",
  metadata: "ui-text-metadata",
  metricValue: "ui-text-metric-value",
  metricValueCompact: "ui-text-metric-value-compact",
  badge: "ui-text-badge",
  button: "ui-text-button",
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
