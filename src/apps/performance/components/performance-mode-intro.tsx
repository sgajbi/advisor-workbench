import type { ReactNode } from "react";

export default function PerformanceModeIntro({
  ariaLabel,
  kicker,
  title,
  description,
  actions,
  compact = false,
}: {
  ariaLabel: string;
  kicker: string;
  title: string;
  description: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={[
        "performance-mode-intro",
        compact ? "performance-mode-intro-compact" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      <div className="performance-mode-intro-copy">
        <span className="performance-mode-intro-kicker">{kicker}</span>
        <p className="performance-mode-intro-title">{title}</p>
        <p className="performance-mode-intro-description">{description}</p>
      </div>
      {actions ? <div className="performance-mode-intro-actions">{actions}</div> : null}
    </section>
  );
}
