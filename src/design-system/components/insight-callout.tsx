export default function InsightCallout({
  title,
  detail,
  severity,
  href,
  onDismiss,
}: {
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  href: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`portfolio-insight-card portfolio-insight-card-${severity}`}
      data-severity={severity}
    >
      <a
        href={href}
        className="portfolio-insight-link"
        aria-label={`${title}. Severity ${severity}. Open related section.`}
      >
        <span className="portfolio-insight-severity" title={`Severity: ${severity}`}>
          {severity}
        </span>
        <strong>{title}</strong>
        <p>{detail}</p>
      </a>
      {onDismiss ? (
        <button
          type="button"
          className="portfolio-insight-dismiss"
          aria-label={`Dismiss ${title}`}
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
