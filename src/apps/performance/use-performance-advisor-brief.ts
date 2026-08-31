"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkbenchPerformanceAdvisorBriefClient,
  postWorkbenchPerformanceAdvisorBriefReviewActionClient,
} from "@/features/workbench/performance-api";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";
import type {
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest,
  WorkbenchPerformanceAdvisorBrief,
} from "@/features/workbench/types";

import { isConfirmedAdvisorBriefReviewTransition } from "./advisor-brief/advisor-brief-review-transition";
import {
  arePerformanceReviewContextsCoherent,
  type PerformanceReviewContextSource,
} from "./performance-review-context";
import {
  isPerformanceAnalyticalSourceCurrent,
  type PerformanceSourceIdentity,
} from "./performance-source-identity";

type PerformanceAdvisorBriefRequest = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string | null;
  reportStartDate?: string;
  reportEndDate?: string;
  asOfDate?: string;
  reportingCurrency?: string;
};

export type AdvisorBriefReviewFeedback = {
  state: "idle" | "pending" | "success" | "failed";
  message: string;
};

const IDLE_REVIEW_FEEDBACK: AdvisorBriefReviewFeedback = {
  state: "idle",
  message: "",
};

export function usePerformanceAdvisorBrief({
  request,
  sourceContext,
}: {
  request: PerformanceAdvisorBriefRequest;
  isDetailsPending: boolean;
  sourceContext: PerformanceReviewContextSource;
}) {
  const {
    portfolioId,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    reportStartDate,
    reportEndDate,
    asOfDate,
    reportingCurrency,
  } = request;
  const [advisorBrief, setAdvisorBrief] = useState<WorkbenchPerformanceAdvisorBrief | null>(null);
  const [advisorBriefUnavailable, setAdvisorBriefUnavailable] = useState(false);
  const [advisorBriefPermissionBlocked, setAdvisorBriefPermissionBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyingReviewAction, setIsApplyingReviewAction] = useState(false);
  const [reviewActionFeedback, setReviewActionFeedback] =
    useState<AdvisorBriefReviewFeedback>(IDLE_REVIEW_FEEDBACK);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const [settledRequestContextKey, setSettledRequestContextKey] = useState<string | null>(null);
  const requestSequenceRef = useRef(0);
  const reviewActionSequenceRef = useRef(0);
  const requestIdentity = useMemo<PerformanceSourceIdentity>(
    () => ({
      portfolioId,
      period,
      reportStartDate,
      reportEndDate,
      asOfDate,
      reportingCurrency,
      detailBasis,
      contributionDimension,
      attributionDimension,
      chartFrequency,
      benchmark: benchmark ?? null,
    }),
    [
      asOfDate,
      attributionDimension,
      benchmark,
      chartFrequency,
      contributionDimension,
      detailBasis,
      period,
      portfolioId,
      reportEndDate,
      reportStartDate,
      reportingCurrency,
    ],
  );
  const advisorBriefIsCurrent = Boolean(
    advisorBrief &&
      isPerformanceAnalyticalSourceCurrent(advisorBrief, requestIdentity) &&
      arePerformanceReviewContextsCoherent(advisorBrief, sourceContext),
  );
  const requestContextKey = useMemo(
    () =>
      JSON.stringify([
        requestIdentity,
        sourceContext.as_of_date,
        sourceContext.requested_as_of_date,
        sourceContext.effective_as_of_date,
        sourceContext.requested_reporting_currency,
        sourceContext.effective_reporting_currency,
        sourceContext.reporting_currency_state,
      ]),
    [requestIdentity, sourceContext]
  );
  const requestContextIsSettled = settledRequestContextKey === requestContextKey;
  const currentAdvisorBrief = advisorBriefIsCurrent ? advisorBrief : null;
  const activeRunId = currentAdvisorBrief?.workflow_pack_run?.run_id ?? null;

  useEffect(() => {
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;

    void getWorkbenchPerformanceAdvisorBriefClient(portfolioId, {
      period,
      chartFrequency,
      contributionDimension,
      attributionDimension,
      detailBasis,
      benchmark: benchmark ?? undefined,
      reportStartDate,
      reportEndDate,
      asOfDate,
      reportingCurrency,
    })
      .then((response) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        if (
          !isPerformanceAnalyticalSourceCurrent(response, requestIdentity) ||
          !arePerformanceReviewContextsCoherent(response, sourceContext)
        ) {
          throw new TypeError(
            "Performance adviser brief does not confirm the requested review context.",
          );
        }
        setAdvisorBrief(response);
        setAdvisorBriefUnavailable(false);
        setAdvisorBriefPermissionBlocked(false);
        setIsApplyingReviewAction(false);
        setReviewActionFeedback(IDLE_REVIEW_FEEDBACK);
        setSettledRequestContextKey(requestContextKey);
      })
      .catch((error: unknown) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        setAdvisorBrief(null);
        setAdvisorBriefUnavailable(!isWorkbenchPermissionBlockedError(error));
        setAdvisorBriefPermissionBlocked(isWorkbenchPermissionBlockedError(error));
        setIsApplyingReviewAction(false);
        setReviewActionFeedback(IDLE_REVIEW_FEEDBACK);
        setSettledRequestContextKey(requestContextKey);
      })
      .finally(() => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      requestSequenceRef.current += 1;
      reviewActionSequenceRef.current += 1;
    };
  }, [
    attributionDimension,
    asOfDate,
    benchmark,
    chartFrequency,
    contributionDimension,
    detailBasis,
    period,
    portfolioId,
    refreshSequence,
    reportEndDate,
    reportStartDate,
    reportingCurrency,
    requestIdentity,
    requestContextKey,
    sourceContext,
  ]);

  const refresh = useCallback(() => {
    requestSequenceRef.current += 1;
    reviewActionSequenceRef.current += 1;
    setAdvisorBrief(null);
    setAdvisorBriefUnavailable(false);
    setAdvisorBriefPermissionBlocked(false);
    setIsLoading(true);
    setIsApplyingReviewAction(false);
    setReviewActionFeedback(IDLE_REVIEW_FEEDBACK);
    setSettledRequestContextKey(null);
    setRefreshSequence((current) => current + 1);
  }, []);

  const applyReviewAction = useCallback(
    async (payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest) => {
      const actionRequestId = reviewActionSequenceRef.current + 1;
      reviewActionSequenceRef.current = actionRequestId;
      setIsApplyingReviewAction(true);
      setReviewActionFeedback({
        state: "pending",
        message: "Recording the human-review decision.",
      });

      try {
        const response = await postWorkbenchPerformanceAdvisorBriefReviewActionClient(
          portfolioId,
          {
            period,
            chartFrequency,
            contributionDimension,
            attributionDimension,
            detailBasis,
            benchmark: benchmark ?? undefined,
            reportStartDate,
            reportEndDate,
            asOfDate,
            reportingCurrency,
          },
          payload
        );

        if (reviewActionSequenceRef.current !== actionRequestId) {
          return response;
        }

        if (
          !isPerformanceAnalyticalSourceCurrent(response, requestIdentity) ||
          !arePerformanceReviewContextsCoherent(response, sourceContext) ||
          !isConfirmedAdvisorBriefReviewTransition({
            response,
            payload,
            expectedPortfolioId: portfolioId,
            expectedRunId: activeRunId,
            previousRun: currentAdvisorBrief?.workflow_pack_run ?? null,
          })
        ) {
          throw new Error("Gateway did not confirm the requested advisor-brief review transition.");
        }

        setAdvisorBrief(response);
        setAdvisorBriefUnavailable(false);
        setAdvisorBriefPermissionBlocked(false);
        setReviewActionFeedback(getReviewActionSuccessFeedback(payload.action_type));
        return response;
      } catch (error: unknown) {
        if (reviewActionSequenceRef.current === actionRequestId) {
          setReviewActionFeedback({
            state: "failed",
            message: isWorkbenchPermissionBlockedError(error)
              ? "This review decision is not permitted for the current access context."
              : "The review decision could not be confirmed. Refresh the brief to reconcile the latest source status before retrying.",
          });
        }
        throw error;
      } finally {
        if (reviewActionSequenceRef.current === actionRequestId) {
          setIsApplyingReviewAction(false);
        }
      }
    },
    [
      activeRunId,
      attributionDimension,
      asOfDate,
      benchmark,
      chartFrequency,
      contributionDimension,
      detailBasis,
      period,
      portfolioId,
      reportEndDate,
      reportStartDate,
      reportingCurrency,
      requestIdentity,
      sourceContext,
      currentAdvisorBrief,
    ]
  );

  return {
    advisorBrief: currentAdvisorBrief,
    advisorBriefUnavailable: requestContextIsSettled && advisorBriefUnavailable,
    advisorBriefPermissionBlocked:
      requestContextIsSettled && advisorBriefPermissionBlocked,
    isLoading:
      isLoading || !requestContextIsSettled || (advisorBrief !== null && !advisorBriefIsCurrent),
    isApplyingReviewAction: requestContextIsSettled && isApplyingReviewAction,
    reviewActionFeedback: requestContextIsSettled
      ? reviewActionFeedback
      : IDLE_REVIEW_FEEDBACK,
    applyReviewAction,
    refresh,
  };
}

function getReviewActionSuccessFeedback(
  actionType: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest["action_type"]
): AdvisorBriefReviewFeedback {
  switch (actionType) {
    case "ACCEPT":
      return {
        state: "success",
        message: "The brief was accepted for its permitted internal workflow use.",
      };
    case "REJECT":
      return {
        state: "success",
        message: "The brief was rejected and the source review record was updated.",
      };
    case "REVISE":
      return {
        state: "success",
        message: "Revision was requested and the replacement brief reference was recorded.",
      };
    case "SUPERSEDE":
      return {
        state: "success",
        message: "The brief was marked as superseded by the replacement brief.",
      };
    case "ABANDON":
      return {
        state: "success",
        message: "The brief was withdrawn from further internal use.",
      };
  }
}
