export default function ReadinessIndicator({
  label,
  status,
  tone,
  href,
}: {
  label: string;
  status: string;
  tone: "success" | "warn" | "danger" | "neutral";
  href: string;
}) {
  return (
    <a
      href={href}
      className="portfolio-readiness-indicator"
      aria-label={`${label} readiness: ${status}. Open related section.`}
      title={`${label}: ${status}`}
    >
      <span className="portfolio-readiness-label">{label}</span>
      <span
        className={`portfolio-readiness-chip portfolio-readiness-chip-${tone}`}
        aria-label={`Status ${status}`}
      >
        {status}
      </span>
    </a>
  );
}
