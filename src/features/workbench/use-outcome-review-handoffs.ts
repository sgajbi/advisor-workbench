"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getDpmOutcomeReviewReportInput,
  requestDpmOutcomeReviewAiNarrative,
  submitDpmOutcomeReviewReportJob,
} from "@/features/workbench/outcome-review-api";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import {
  buildDpmAiWorkflowOutcome,
  type DpmAiWorkflowOutcome,
} from "@/features/workbench/dpm-ai-workflow-disclosure";
import {
  buildOutcomeClientCommunicationBoundaryView,
  type OutcomeReviewClientCommunicationBoundaryView,
  type OutcomeReviewListItem,
} from "@/features/workbench/outcome-review-view-model";
import {
  buildOutcomeReviewHandoffMessages,
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
  aiNarrativeOutcome: DpmAiWorkflowOutcome | null;
  requestOutcomeReportJob: () => Promise<void>;
  requestOutcomeAiNarrative: () => Promise<void>;
};

export function useOutcomeReviewHandoffs({
  primaryReview,
}: Params): OutcomeReviewHandoffActions {
  const [reportJobStatus, setReportJobStatus] = useState<string | null>(null);
  const [reportJobError, setReportJobError] = useState<string | null>(null);
  const [reportJobPending, setReportJobPending] = useState(false);
  const [aiNarrativeError, setAiNarrativeError] = useState<string | null>(null);
  const [aiNarrativePending, setAiNarrativePending] = useState(false);
  const [aiNarrativeOutcome, setAiNarrativeOutcome] =
    useState<DpmAiWorkflowOutcome | null>(null);
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
        aiNarrativeError,
      ),
    [aiNarrativeError, reportJobError, reportJobStatus],
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
    setAiNarrativeOutcome(null);
    try {
      const narrative = await requestDpmOutcomeReviewAiNarrative({
        outcomeReviewId: primaryReview.outcomeReviewId,
      });
      setHandoffBoundary(
        buildOutcomeClientCommunicationBoundaryView(narrative.ai_evidence_input),
      );
      setAiNarrativeOutcome(buildDpmAiWorkflowOutcome("outcome-narrative", narrative));
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
    aiNarrativeOutcome,
    requestOutcomeReportJob,
    requestOutcomeAiNarrative,
  };
}
