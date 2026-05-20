"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getDpmOutcomeReviewReportInput,
  requestDpmOutcomeReviewAiNarrative,
  submitDpmOutcomeReviewReportJob,
} from "@/features/workbench/api";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import {
  buildOutcomeClientCommunicationBoundaryView,
  type OutcomeReviewClientCommunicationBoundaryView,
  type OutcomeReviewListItem,
} from "@/features/workbench/outcome-review-view-model";
import {
  buildOutcomeReviewHandoffMessages,
  describeOutcomeNarrativeRun,
} from "@/features/workbench/outcome-review-panel-helpers";

type Params = {
  primaryReview: OutcomeReviewListItem | null;
};

export type OutcomeReviewHandoffActions = {
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  handoffStatusMessages: string[];
  reportJobAvailable: boolean;
  reportJobPending: boolean;
  aiNarrativeAvailable: boolean;
  aiNarrativePending: boolean;
  requestOutcomeReportJob: () => Promise<void>;
  requestOutcomeAiNarrative: () => Promise<void>;
};

export function useOutcomeReviewHandoffs({
  primaryReview,
}: Params): OutcomeReviewHandoffActions {
  const [reportJobStatus, setReportJobStatus] = useState<string | null>(null);
  const [reportJobError, setReportJobError] = useState<string | null>(null);
  const [reportJobPending, setReportJobPending] = useState(false);
  const [aiNarrativeStatus, setAiNarrativeStatus] = useState<string | null>(null);
  const [aiNarrativeError, setAiNarrativeError] = useState<string | null>(null);
  const [aiNarrativePending, setAiNarrativePending] = useState(false);
  const [handoffBoundary, setHandoffBoundary] =
    useState<OutcomeReviewClientCommunicationBoundaryView | null>(null);

  const reportJobAvailable = Boolean(primaryReview && !primaryReview.reportInputBlocked);
  const aiNarrativeAvailable = Boolean(primaryReview && !primaryReview.aiEvidenceBlocked);
  const clientCommunicationBoundary =
    handoffBoundary ?? primaryReview?.clientCommunicationBoundary ?? null;

  const handoffStatusMessages = useMemo(
    () =>
      buildOutcomeReviewHandoffMessages(
        reportJobError ?? reportJobStatus,
        aiNarrativeError ?? aiNarrativeStatus,
      ),
    [aiNarrativeError, aiNarrativeStatus, reportJobError, reportJobStatus],
  );

  const requestOutcomeReportJob = useCallback(async () => {
    if (!primaryReview || primaryReview.reportInputBlocked || reportJobPending) {
      return;
    }
    setReportJobPending(true);
    setReportJobError(null);
    try {
      const reportInput = await getDpmOutcomeReviewReportInput(primaryReview.outcomeReviewId);
      setHandoffBoundary(buildOutcomeClientCommunicationBoundaryView(reportInput.data));
      const handle = await submitDpmOutcomeReviewReportJob({
        outcomeReviewId: primaryReview.outcomeReviewId,
        outcomeReportInput: reportInput.data,
      });
      setReportJobStatus(`Report request ${businessStateLabel(handle.status)}.`);
    } catch (error) {
      setReportJobError(error instanceof Error ? error.message : "Outcome report job failed");
    } finally {
      setReportJobPending(false);
    }
  }, [primaryReview, reportJobPending]);

  const requestOutcomeAiNarrative = useCallback(async () => {
    if (!primaryReview || primaryReview.aiEvidenceBlocked || aiNarrativePending) {
      return;
    }
    setAiNarrativePending(true);
    setAiNarrativeError(null);
    try {
      const narrative = await requestDpmOutcomeReviewAiNarrative({
        outcomeReviewId: primaryReview.outcomeReviewId,
      });
      setHandoffBoundary(
        buildOutcomeClientCommunicationBoundaryView(narrative.ai_evidence_input),
      );
      setAiNarrativeStatus(describeOutcomeNarrativeRun(narrative.data));
    } catch (error) {
      setAiNarrativeError(
        error instanceof Error ? error.message : "Outcome review request failed",
      );
    } finally {
      setAiNarrativePending(false);
    }
  }, [aiNarrativePending, primaryReview]);

  return {
    clientCommunicationBoundary,
    handoffStatusMessages,
    reportJobAvailable,
    reportJobPending,
    aiNarrativeAvailable,
    aiNarrativePending,
    requestOutcomeReportJob,
    requestOutcomeAiNarrative,
  };
}
