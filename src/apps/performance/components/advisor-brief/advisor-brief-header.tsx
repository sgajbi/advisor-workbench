export default function AdvisorBriefHeader({
  title,
  summary,
  portfolioId,
  benchmarkLabel,
  asOfDate,
  period,
}: {
  title: string;
  summary: string;
  portfolioId: string;
  benchmarkLabel: string;
  asOfDate: string;
  period: string;
}) {
  return (
    <header className="performance-advisor-brief-header">
      <div className="performance-advisor-brief-copy">
        <p className="performance-advisor-brief-eyebrow">{title}</p>
        <h2 className="performance-advisor-brief-title">Performance Advisor Brief</h2>
        <p className="performance-advisor-brief-context-line">
          {period} | Portfolio: {portfolioId} | Benchmark: {benchmarkLabel} | As of {asOfDate}
        </p>
        <p className="performance-advisor-brief-summary">{summary}</p>
      </div>
    </header>
  );
}
