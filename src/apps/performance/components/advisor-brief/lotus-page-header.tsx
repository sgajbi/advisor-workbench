import LotusStatusBar from "./lotus-status-bar";
import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";

export default function LotusPageHeader({
  portfolioId,
  benchmarkLabel,
  asOfDate,
  period,
  summary,
  status,
  noteText,
  onRefresh,
}: {
  portfolioId: string;
  benchmarkLabel: string;
  asOfDate: string;
  period: string;
  summary: string;
  status: PerformanceAdvisorBriefStatus;
  noteText: string;
  onRefresh: () => void;
}) {
  return (
    <header className="lotus-page-header performance-advisor-brief-header">
      <div className="lotus-page-header-copy performance-advisor-brief-header-copy performance-advisor-brief-overview">
        <div className="performance-advisor-brief-overview-topline">
          <div className="performance-advisor-brief-overview-copy">
            <p className="lotus-page-header-eyebrow performance-advisor-brief-eyebrow">
              Advisor Brief
            </p>
            <div className="lotus-page-header-title-row">
              <h2 className="lotus-page-header-title performance-advisor-brief-title">
                Performance Advisor Brief
              </h2>
              <span className="lotus-page-header-anchor" aria-hidden="true" />
            </div>
          </div>
          <dl
            className="lotus-page-header-meta performance-advisor-brief-context-grid"
            aria-label="Advisor brief context"
          >
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
        </div>
        <p className="performance-advisor-brief-overview-summary" aria-label="Brief synopsis">
          {summary}
        </p>
        <LotusStatusBar status={status} noteText={noteText} onRefresh={onRefresh} />
      </div>
    </header>
  );
}
