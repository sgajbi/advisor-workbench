import { Text } from "@/design-system";
import { PERFORMANCE_WORKFLOW_LABELS } from "../../performance-terminology";

import LotusStatusBar from "./lotus-status-bar";
import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";

export default function LotusPageHeader({
  summary,
  status,
  noteText,
  onRefresh,
  canCopy,
  refreshing,
  interactionBusy,
}: {
  summary: string;
  status: PerformanceAdvisorBriefStatus;
  noteText: string;
  onRefresh: () => void;
  canCopy: boolean;
  refreshing: boolean;
  interactionBusy: boolean;
}) {
  return (
    <header className="lotus-page-header performance-advisor-brief-header">
      <div className="lotus-page-header-copy performance-advisor-brief-header-copy performance-advisor-brief-overview">
        <div className="performance-advisor-brief-overview-topline">
          <div className="performance-advisor-brief-overview-copy">
            <Text
              as="p"
              variant="dataLabel"
              className="lotus-page-header-eyebrow performance-advisor-brief-eyebrow"
            >
              {PERFORMANCE_WORKFLOW_LABELS.adviserBrief}
            </Text>
            <div className="lotus-page-header-title-row">
              <Text
                as="h2"
                variant="pageTitle"
                className="lotus-page-header-title performance-advisor-brief-title"
              >
                Performance adviser brief
              </Text>
              <span className="lotus-page-header-anchor" aria-hidden="true" />
            </div>
          </div>
        </div>
        <Text
          as="p"
          variant="body"
          className="performance-advisor-brief-overview-summary"
          aria-label="Brief synopsis"
        >
          {summary}
        </Text>
        <LotusStatusBar
          status={status}
          noteText={noteText}
          onRefresh={onRefresh}
          canCopy={canCopy}
          refreshing={refreshing}
          interactionBusy={interactionBusy}
        />
      </div>
    </header>
  );
}
