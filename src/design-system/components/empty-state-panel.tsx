import StateInfoHint from "./state-info-hint";

export default function EmptyStatePanel({
  title,
  body,
  hint,
  illustration = false,
  centered = false,
  actions,
  why,
}: {
  title: string;
  body: string;
  hint?: string;
  illustration?: boolean;
  centered?: boolean;
  actions?: React.ReactNode;
  why?: {
    body: string;
    title?: string;
    label?: string;
  };
}) {
  const classes = [
    "portfolio-empty-state",
    illustration ? "portfolio-empty-state-illustrated" : "",
    centered ? "portfolio-empty-state-centered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {illustration ? (
        <div className="portfolio-empty-illustration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      <div className="portfolio-empty-state-header">
        <strong role="heading" aria-level={3}>
          {title}
        </strong>
        {why ? <StateInfoHint body={why.body} title={why.title} label={why.label} /> : null}
      </div>
      <p className="muted">{body}</p>
      {hint ? <p className="muted">{hint}</p> : null}
      {actions ? <div className="portfolio-grid-empty-actions">{actions}</div> : null}
    </div>
  );
}
