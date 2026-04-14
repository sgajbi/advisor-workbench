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
        {!compact ? <span className="performance-mode-intro-kicker">{kicker}</span> : null}
        <p className="performance-mode-intro-title">{title}</p>
        {!compact ? <p className="performance-mode-intro-description">{description}</p> : null}
      </div>
      {actions ? <div className="performance-mode-intro-actions">{actions}</div> : null}
    </section>
  );
}
