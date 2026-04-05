export default function AdvisorBriefHeader({
  portfolioId,
  benchmarkLabel,
  asOfDate,
  period,
}: {
  portfolioId: string;
  benchmarkLabel: string;
  asOfDate: string;
  period: string;
}) {
  return (
    <header className="performance-advisor-brief-header">
      <div className="performance-advisor-brief-header-copy">
        <p className="performance-advisor-brief-eyebrow">Performance • Advisor Brief</p>
        <h2 className="performance-advisor-brief-title">Performance Advisor Brief</h2>
      </div>
      <dl className="performance-advisor-brief-context-grid" aria-label="Advisor brief context">
        <div>
          <dt>Period</dt>
          <dd>{period}</dd>
        </div>
        <div>
          <dt>Portfolio</dt>
          <dd>{portfolioId}</dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd>{benchmarkLabel}</dd>
        </div>
        <div>
          <dt>As of</dt>
          <dd>{asOfDate}</dd>
        </div>
      </dl>
    </header>
  );
}
