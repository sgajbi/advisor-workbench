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
  kicker = "Performance contract",
}: {
  ariaLabel: string;
  status: "partial" | "unavailable";
  title: string;
  body: string;
  hint?: string;
  contextItems: PerformanceAnalyticalStateItem[];
  availableItems?: PerformanceAnalyticalStateItem[];
  kicker?: string | null;
}) {
  return (
    <section
      className={`performance-analytical-state performance-analytical-state-${status}`}
      aria-label={ariaLabel}
    >
      <header className="performance-analytical-state-header">
        <div className="performance-analytical-state-heading">
          {kicker ? (
            <span className="performance-analytical-state-kicker">
              {kicker}
            </span>
          ) : null}
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

      {availableItems.length || hint ? (
        <div className="performance-analytical-state-resolution">
          {availableItems.length ? (
            <section className="performance-analytical-state-support">
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
          ) : null}

          {hint ? (
            <section className="performance-analytical-state-footer">
              <span>Needs source support</span>
              <p>{hint}</p>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
