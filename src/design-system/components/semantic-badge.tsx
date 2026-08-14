import { cx } from "../utils/cx";
import styles from "./semantic-badge.module.css";

export type SemanticBadgeTone = "default" | "success" | "warn" | "danger";
export type SemanticBadgeEmphasis = "subtle" | "strong";

export default function SemanticBadge({
  children,
  tone = "default",
  emphasis = "subtle",
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: SemanticBadgeTone;
  emphasis?: SemanticBadgeEmphasis;
  className?: string;
  title?: string;
}) {
  const label = typeof children === "string" ? children : undefined;

  return (
    <span
      className={cx(
        "semantic-badge",
        "lotus-semantic-badge",
        styles.base,
        `semantic-badge-${tone}`,
        `lotus-semantic-badge-${tone}`,
        styles[tone],
        emphasis === "strong" && "semantic-badge-strong lotus-semantic-badge-strong",
        emphasis === "strong" && styles.strong,
        className
      )}
      aria-label={label ? `Status ${label}` : undefined}
      title={title ?? label}
    >
      {children}
    </span>
  );
}
