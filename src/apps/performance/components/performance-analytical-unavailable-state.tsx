import type { ReactNode } from "react";

type PerformanceAnalyticalStateItem = {
  label: string;
  value: ReactNode;
};

export default function PerformanceAnalyticalUnavailableState({
  ariaLabel,
  status,
  title,
  body,
  hint,
  contextItems,
  availableItems = [],
}: {
  ariaLabel: string;
  status: "partial" | "unavailable";
  title: string;
  body: string;
  hint?: string;
  contextItems: PerformanceAnalyticalStateItem[];
  availableItems?: PerformanceAnalyticalStateItem[];
}) {
  return (
    <section
      className={`performance-analytical-state performance-analytical-state-${status}`}
      aria-label={ariaLabel}
    >
      <header className="performance-analytical-state-header">
        <div className="performance-analytical-state-heading">
          <span className="performance-analytical-state-kicker">
            {status === "partial" ? "Analytical partial" : "Analytical unavailable"}
          </span>
          <strong>{title}</strong>
        </div>
        <span className="performance-analytical-state-status">
          {status === "partial" ? "Partial" : "Unavailable"}
        </span>
      </header>

      <p className="performance-analytical-state-body">{body}</p>

      <div className="performance-analytical-state-grid">
        <section className="performance-analytical-state-section">
          <span className="performance-analytical-state-section-label">Selection context</span>
          <dl className="performance-analytical-state-list">
            {contextItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="performance-analytical-state-section">
          <span className="performance-analytical-state-section-label">Still available</span>
          <dl className="performance-analytical-state-list">
            {availableItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {hint ? (
        <div className="performance-analytical-state-footer">
          <span>Dependency</span>
          <p>{hint}</p>
        </div>
      ) : null}
    </section>
  );
}
