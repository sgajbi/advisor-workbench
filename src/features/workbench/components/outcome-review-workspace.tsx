"use client";

import type {
  OutcomeReviewClientCommunicationBoundaryView,
  OutcomeReviewListItem,
  OutcomeReviewSourceBoundary,
} from "@/features/workbench/outcome-review-view-model";
import OutcomeReviewActionsCard from "./outcome-review-actions-card";
import OutcomeReviewDetailPanel from "./outcome-review-detail-panel";
import OutcomeReviewSourceLineageCard from "./outcome-review-source-lineage-card";
import OutcomeReviewTimelineCard from "./outcome-review-timeline-card";
import styles from "./outcome-review.module.css";

type Props = {
  items: OutcomeReviewListItem[];
  primaryReview: OutcomeReviewListItem;
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  sourceBoundary?: OutcomeReviewSourceBoundary;
  evidencePackHref: string;
  readyEvidenceCount: number;
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
  reportJobAvailable,
  reportJobPending,
  aiNarrativeAvailable,
  aiNarrativePending,
  onRequestReportJob,
  onRequestAiNarrative,
}: Props) {
  return (
    <>
      <div className={styles.workspaceGrid}>
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
        onRequestReportJob={onRequestReportJob}
      />
    </>
  );
}
