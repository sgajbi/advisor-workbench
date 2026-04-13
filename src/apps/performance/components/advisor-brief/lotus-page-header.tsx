import LotusStatusBar from "./lotus-status-bar";
import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";

export default function LotusPageHeader({
  summary,
  status,
  noteText,
  onRefresh,
}: {
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
        </div>
        <p className="performance-advisor-brief-overview-summary" aria-label="Brief synopsis">
          {summary}
        </p>
        <LotusStatusBar status={status} noteText={noteText} onRefresh={onRefresh} />
      </div>
    </header>
  );
}
