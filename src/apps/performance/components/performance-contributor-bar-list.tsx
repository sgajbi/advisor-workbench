import type { PerformanceContributorRankedItem } from "./performance-summary-driver-helpers";

export default function PerformanceContributorBarList({
  title,
  ariaLabel,
  items,
  emptyBody,
}: {
  title: string;
  ariaLabel: string;
  items: PerformanceContributorRankedItem[];
  emptyBody: string;
}) {
  return (
    <section className="performance-contributor-bar-list" aria-label={ariaLabel}>
      <div className="performance-contributor-bar-list-header">
        <strong className="performance-contributor-bar-list-title">{title}</strong>
      </div>
      {items.length ? (
        <div className="performance-contributor-bars">
          {items.map((item) => (
            <div key={item.key} className="performance-contributor-bar-row">
              <div className="performance-contributor-bar-copy">
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
              <div className="performance-contributor-bar-measure">
                <span>{item.value}</span>
                <div className="performance-contributor-bar-track" aria-hidden="true">
                  <div
                    className={`performance-contributor-bar-fill performance-contributor-bar-fill-${item.tone}`}
                    style={{ width: `${Math.max(item.magnitudePct, 4)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="performance-contributor-bar-empty">{emptyBody}</p>
      )}
    </section>
  );
}
