"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type ContextBoundValue<T> = {
  contextKey: string;
  value: T;
};

type ContextBoundActionState<T> = {
  pendingRequest: ContextBoundRequest | null;
  result: ContextBoundValue<T> | null;
  error: ContextBoundValue<string> | null;
};

type ContextBoundRequest = {
  contextKey: string;
  sequence: number;
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
  const [reportJobState, setReportJobState] = useState<
    ContextBoundActionState<string>
  >({ pendingRequest: null, result: null, error: null });
  const [aiNarrativeState, setAiNarrativeState] = useState<
    ContextBoundActionState<DpmAiWorkflowOutcome>
  >({ pendingRequest: null, result: null, error: null });
  const [handoffBoundaries, setHandoffBoundaries] = useState<
    Record<string, OutcomeReviewClientCommunicationBoundaryView>
  >({});
  const reportRequestSequenceRef = useRef(0);
  const aiRequestSequenceRef = useRef(0);
  const currentContextKey = primaryReview
    ? outcomeReviewSourceContextKey(primaryReview)
    : null;
  const committedContextKeyRef = useRef(currentContextKey);

  useLayoutEffect(() => {
    if (committedContextKeyRef.current === currentContextKey) {
      return;
    }
    const previousContextKey = committedContextKeyRef.current;
    const previousReportSequence = reportRequestSequenceRef.current;
    const previousAiSequence = aiRequestSequenceRef.current;
    committedContextKeyRef.current = currentContextKey;
    reportRequestSequenceRef.current = previousReportSequence + 1;
    aiRequestSequenceRef.current = previousAiSequence + 1;
    clearSupersededPendingRequest(
      setReportJobState,
      previousContextKey,
      previousReportSequence,
    );
    clearSupersededPendingRequest(
      setAiNarrativeState,
      previousContextKey,
      previousAiSequence,
    );
  }, [currentContextKey]);

  const reportJobStatus = valueForContext(reportJobState.result, currentContextKey);
  const reportJobError = valueForContext(reportJobState.error, currentContextKey);
  const reportJobPending =
    reportJobState.pendingRequest?.contextKey === currentContextKey;
  const aiNarrativeError = valueForContext(aiNarrativeState.error, currentContextKey);
  const aiNarrativePending =
    aiNarrativeState.pendingRequest?.contextKey === currentContextKey;
  const aiNarrativeOutcome = valueForContext(aiNarrativeState.result, currentContextKey);

  const reportJobAvailable = Boolean(primaryReview && !primaryReview.reportInputBlocked);
  const aiNarrativeAvailable = Boolean(primaryReview && !primaryReview.aiEvidenceBlocked);
  const clientCommunicationBoundary =
    (currentContextKey ? handoffBoundaries[currentContextKey] : null) ??
    primaryReview?.clientCommunicationBoundary ??
    null;

  const handoffStatusMessages = useMemo(
    () =>
      buildOutcomeReviewHandoffMessages(
        reportJobError ?? reportJobStatus,
        aiNarrativeError,
      ),
    [aiNarrativeError, reportJobError, reportJobStatus],
  );

  const requestOutcomeReportJob = useCallback(async () => {
    if (
      !primaryReview ||
      !currentContextKey ||
      primaryReview.reportInputBlocked ||
      reportJobPending
    ) {
      return;
    }
    const requestSequence = reportRequestSequenceRef.current + 1;
    reportRequestSequenceRef.current = requestSequence;
    const requestIsCurrent = () =>
      requestSequence === reportRequestSequenceRef.current &&
      currentContextKey === committedContextKeyRef.current;
    const clearPendingRequest = () =>
      clearSupersededPendingRequest(
        setReportJobState,
        currentContextKey,
        requestSequence,
      );
    const outcomeReviewId = primaryReview.outcomeReviewId;
    setReportJobState({
      pendingRequest: {
        contextKey: currentContextKey,
        sequence: requestSequence,
      },
      result: null,
      error: null,
    });
    try {
      const reportInput = await getDpmOutcomeReviewReportInput(outcomeReviewId);
      assertOutcomeReviewIdentity(outcomeReviewId, reportInput.data);
      if (!requestIsCurrent()) {
        clearPendingRequest();
        return;
      }
      const handle = await submitDpmOutcomeReviewReportJob({
        outcomeReviewId,
        outcomeReportInput: reportInput.data,
      });
      if (!requestIsCurrent()) {
        clearPendingRequest();
        return;
      }
      const boundary = buildOutcomeClientCommunicationBoundaryView(reportInput.data);
      if (boundary) {
        setHandoffBoundaries((current) => ({
          ...current,
          [currentContextKey]: boundary,
        }));
      }
      setReportJobState({
        pendingRequest: null,
        result: bindToContext(
          currentContextKey,
          `Report request ${businessStateLabel(handle.status)}.`,
        ),
        error: null,
      });
    } catch (error) {
      if (!requestIsCurrent()) {
        clearPendingRequest();
        return;
      }
      setReportJobState({
        pendingRequest: null,
        result: null,
        error: bindToContext(
          currentContextKey,
          error instanceof Error ? error.message : "Outcome report job failed",
        ),
      });
    }
  }, [currentContextKey, primaryReview, reportJobPending]);

  const requestOutcomeAiNarrative = useCallback(async () => {
    if (
      !primaryReview ||
      !currentContextKey ||
      primaryReview.aiEvidenceBlocked ||
      aiNarrativePending
    ) {
      return;
    }
    const requestSequence = aiRequestSequenceRef.current + 1;
    aiRequestSequenceRef.current = requestSequence;
    const requestIsCurrent = () =>
      requestSequence === aiRequestSequenceRef.current &&
      currentContextKey === committedContextKeyRef.current;
    const clearPendingRequest = () =>
      clearSupersededPendingRequest(
        setAiNarrativeState,
        currentContextKey,
        requestSequence,
      );
    const outcomeReviewId = primaryReview.outcomeReviewId;
    setAiNarrativeState({
      pendingRequest: {
        contextKey: currentContextKey,
        sequence: requestSequence,
      },
      result: null,
      error: null,
    });
    try {
      const narrative = await requestDpmOutcomeReviewAiNarrative({
        outcomeReviewId,
      });
      assertOutcomeReviewIdentity(
        outcomeReviewId,
        narrative.ai_evidence_input,
      );
      if (!requestIsCurrent()) {
        clearPendingRequest();
        return;
      }
      const boundary = buildOutcomeClientCommunicationBoundaryView(
        narrative.ai_evidence_input,
      );
      if (boundary) {
        setHandoffBoundaries((current) => ({
          ...current,
          [currentContextKey]: boundary,
        }));
      }
      setAiNarrativeState({
        pendingRequest: null,
        result: bindToContext(
          currentContextKey,
          buildDpmAiWorkflowOutcome(
            "outcome-narrative",
            narrative,
            outcomeReviewId,
          ),
        ),
        error: null,
      });
    } catch (error) {
      if (!requestIsCurrent()) {
        clearPendingRequest();
        return;
      }
      setAiNarrativeState({
        pendingRequest: null,
        result: null,
        error: bindToContext(
          currentContextKey,
          error instanceof Error ? error.message : "Outcome review request failed",
        ),
      });
    }
  }, [aiNarrativePending, currentContextKey, primaryReview]);

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

function outcomeReviewSourceContextKey(review: OutcomeReviewListItem): string {
  return JSON.stringify([
    review.portfolioId,
    review.outcomeReviewId,
    review.rebalanceRunId,
    review.waveId,
    review.proofPackId,
    review.expectedSnapshotHash,
    review.realizedSnapshotHash,
    review.sourceUpdatedAt,
  ]);
}

function bindToContext<T>(contextKey: string, value: T): ContextBoundValue<T> {
  return { contextKey, value };
}

function valueForContext<T>(
  boundValue: ContextBoundValue<T> | null,
  contextKey: string | null,
): T | null {
  return boundValue?.contextKey === contextKey ? boundValue.value : null;
}

function clearSupersededPendingRequest<T>(
  setState: Dispatch<SetStateAction<ContextBoundActionState<T>>>,
  contextKey: string | null,
  sequence: number,
): void {
  setState((current) =>
    current.pendingRequest?.contextKey === contextKey &&
    current.pendingRequest.sequence === sequence
      ? { ...current, pendingRequest: null }
      : current,
  );
}

function assertOutcomeReviewIdentity(
  expected: string,
  payload: Record<string, unknown>,
): void {
  if (payload.outcome_review_id !== expected) {
    throw new Error(
      "The returned evidence belongs to a different outcome review. Refresh this review before continuing.",
    );
  }
}
