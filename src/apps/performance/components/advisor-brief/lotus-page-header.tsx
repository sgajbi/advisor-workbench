export default function LotusPageHeader({
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
    <header className="lotus-page-header performance-advisor-brief-header">
      <div className="lotus-page-header-copy performance-advisor-brief-header-copy">
        <p className="lotus-page-header-eyebrow performance-advisor-brief-eyebrow">
          Performance • Advisor Brief
        </p>
        <div className="lotus-page-header-title-row">
          <h2 className="lotus-page-header-title performance-advisor-brief-title">
            Performance Advisor Brief
          </h2>
          <span className="lotus-page-header-anchor" aria-hidden="true" />
        </div>
      </div>
      <dl className="lotus-page-header-meta performance-advisor-brief-context-grid" aria-label="Advisor brief context">
        <div>
          <dt>Portfolio</dt>
          <dd>{portfolioId}</dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd>{benchmarkLabel}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>{period}</dd>
        </div>
        <div>
          <dt>As of</dt>
          <dd>{asOfDate}</dd>
        </div>
      </dl>
    </header>
  );
}
