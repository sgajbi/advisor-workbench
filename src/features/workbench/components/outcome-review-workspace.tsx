"use client";

import type {
  OutcomeReviewClientCommunicationBoundaryView,
  OutcomeReviewListItem,
  OutcomeReviewSourceBoundary,
} from "@/features/workbench/outcome-review-view-model";
import OutcomeReviewActionsCard from "./outcome-review-actions-card";
import OutcomeReviewDetailPanel from "./outcome-review-detail-panel";
import OutcomeReviewReadinessBand from "./outcome-review-readiness-band";
import OutcomeReviewSourceLineageCard from "./outcome-review-source-lineage-card";
import OutcomeReviewTimelineCard from "./outcome-review-timeline-card";

type Props = {
  items: OutcomeReviewListItem[];
  primaryReview: OutcomeReviewListItem;
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  sourceBoundary?: OutcomeReviewSourceBoundary;
  evidencePackHref: string;
  readyEvidenceCount: number;
  sourceEvidenceStatus: string;
  reportJobAvailable: boolean;
  reportJobPending: boolean;
  aiNarrativeAvailable: boolean;
  aiNarrativePending: boolean;
  onRequestReportJob: () => void;
  onRequestAiNarrative: () => void;
};

export default function OutcomeReviewWorkspace({
  items,
  primaryReview,
  clientCommunicationBoundary,
  sourceBoundary = {
    appliedFilters: [],
    supportBoundary: [],
    sourceOwnerFacets: [],
    sourceTypeFacets: [],
  },
  evidencePackHref,
  readyEvidenceCount,
  sourceEvidenceStatus,
  reportJobAvailable,
  reportJobPending,
  aiNarrativeAvailable,
  aiNarrativePending,
  onRequestReportJob,
  onRequestAiNarrative,
}: Props) {
  return (
    <>
      <OutcomeReviewReadinessBand
        reviewWindow={primaryReview.reviewWindow}
        reportInputBlocked={primaryReview.reportInputBlocked}
        aiEvidenceBlocked={primaryReview.aiEvidenceBlocked}
        sourceEvidenceStatus={sourceEvidenceStatus}
      />

      <div className="outcome-review-workspace-grid">
        <OutcomeReviewTimelineCard items={items} />

        <OutcomeReviewActionsCard
          primaryReview={primaryReview}
          evidencePackHref={evidencePackHref}
          aiNarrativeAvailable={aiNarrativeAvailable}
          aiNarrativePending={aiNarrativePending}
          onRequestAiNarrative={onRequestAiNarrative}
        />

        <OutcomeReviewSourceLineageCard boundary={sourceBoundary} />
      </div>

      <OutcomeReviewDetailPanel
        primaryReview={primaryReview}
        clientCommunicationBoundary={clientCommunicationBoundary}
        readyEvidenceCount={readyEvidenceCount}
        reportJobAvailable={reportJobAvailable}
        reportJobPending={reportJobPending}
        aiNarrativeAvailable={aiNarrativeAvailable}
        aiNarrativePending={aiNarrativePending}
        onRequestReportJob={onRequestReportJob}
        onRequestAiNarrative={onRequestAiNarrative}
      />
    </>
  );
}
