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

      <dl className="performance-analytical-state-facts">
        {contextItems.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      {availableItems.length ? (
        <div className="performance-analytical-state-support">
          <span className="performance-analytical-state-section-label">Available now</span>
          <dl className="performance-analytical-state-list">
            {availableItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {hint ? (
        <div className="performance-analytical-state-footer">
          <span>Blocked by</span>
          <p>{hint}</p>
        </div>
      ) : null}
    </section>
  );
}
