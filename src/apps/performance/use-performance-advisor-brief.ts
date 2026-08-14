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
}: {
  request: PerformanceAdvisorBriefRequest;
  isDetailsPending: boolean;
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
  } = request;
  const [advisorBrief, setAdvisorBrief] = useState<WorkbenchPerformanceAdvisorBrief | null>(null);
  const [advisorBriefUnavailable, setAdvisorBriefUnavailable] = useState(false);
  const [advisorBriefPermissionBlocked, setAdvisorBriefPermissionBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyingReviewAction, setIsApplyingReviewAction] = useState(false);
  const [reviewActionFeedback, setReviewActionFeedback] =
    useState<AdvisorBriefReviewFeedback>(IDLE_REVIEW_FEEDBACK);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const requestSequenceRef = useRef(0);
  const reviewActionSequenceRef = useRef(0);
  const activeRequestKeyRef = useRef("");
  const cacheRef = useRef<Map<string, WorkbenchPerformanceAdvisorBrief>>(new Map());
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId,
        period,
        detailBasis,
        contributionDimension,
        attributionDimension,
        chartFrequency,
        benchmark,
        reportStartDate,
        reportEndDate,
        refreshSequence,
      }),
    [
      attributionDimension,
      benchmark,
      chartFrequency,
      contributionDimension,
      detailBasis,
      period,
      portfolioId,
      refreshSequence,
      reportEndDate,
      reportStartDate,
    ]
  );
  activeRequestKeyRef.current = requestKey;

  useEffect(() => {
    reviewActionSequenceRef.current += 1;
    setIsApplyingReviewAction(false);
    const cachedResponse = cacheRef.current.get(requestKey) ?? null;
    setAdvisorBrief(cachedResponse);
    setAdvisorBriefUnavailable(false);
    setAdvisorBriefPermissionBlocked(false);
    setReviewActionFeedback(IDLE_REVIEW_FEEDBACK);

    if (cachedResponse) {
      setIsLoading(false);
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    setIsLoading(true);

    void getWorkbenchPerformanceAdvisorBriefClient(portfolioId, {
      period,
      chartFrequency,
      contributionDimension,
      attributionDimension,
      detailBasis,
      benchmark: benchmark ?? undefined,
      reportStartDate,
      reportEndDate,
    })
      .then((response) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(requestKey, response);
        setAdvisorBrief(response);
        setAdvisorBriefUnavailable(false);
        setAdvisorBriefPermissionBlocked(false);
      })
      .catch((error: unknown) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        setAdvisorBrief(null);
        setAdvisorBriefUnavailable(!isWorkbenchPermissionBlockedError(error));
        setAdvisorBriefPermissionBlocked(isWorkbenchPermissionBlockedError(error));
      })
      .finally(() => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        setIsLoading(false);
      });
  }, [
    attributionDimension,
    benchmark,
    chartFrequency,
    contributionDimension,
    detailBasis,
    period,
    portfolioId,
    requestKey,
    reportEndDate,
    reportStartDate,
  ]);

  const refresh = useCallback(() => {
    setRefreshSequence((current) => current + 1);
  }, []);

  const applyReviewAction = useCallback(
    async (payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest) => {
      const actionRequestKey = requestKey;
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
          },
          payload
        );

        if (
          reviewActionSequenceRef.current !== actionRequestId ||
          activeRequestKeyRef.current !== actionRequestKey
        ) {
          return response;
        }

        cacheRef.current.set(requestKey, response);
        setAdvisorBrief(response);
        setAdvisorBriefUnavailable(false);
        setAdvisorBriefPermissionBlocked(false);
        setReviewActionFeedback({
          state: "success",
          message: getReviewActionSuccessMessage(payload.action_type),
        });
        return response;
      } catch (error: unknown) {
        if (
          reviewActionSequenceRef.current === actionRequestId &&
          activeRequestKeyRef.current === actionRequestKey
        ) {
          setReviewActionFeedback({
            state: "failed",
            message: isWorkbenchPermissionBlockedError(error)
              ? "This review decision is not permitted for the current access context."
              : "The review decision was not recorded. Keep the rationale in place and try again.",
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
      attributionDimension,
      benchmark,
      chartFrequency,
      contributionDimension,
      detailBasis,
      period,
      portfolioId,
      requestKey,
      reportEndDate,
      reportStartDate,
    ]
  );

  return {
    advisorBrief,
    advisorBriefUnavailable,
    advisorBriefPermissionBlocked,
    isLoading,
    isApplyingReviewAction,
    reviewActionFeedback,
    applyReviewAction,
    refresh,
  };
}

function getReviewActionSuccessMessage(
  actionType: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest["action_type"]
): string {
  switch (actionType) {
    case "ACCEPT":
      return "The brief was accepted for its permitted internal workflow use.";
    case "REJECT":
      return "The brief was rejected and the source review record was updated.";
    case "REVISE":
      return "Revision was requested and the replacement brief reference was recorded.";
    case "SUPERSEDE":
      return "The brief was marked as superseded by the replacement brief.";
    case "ABANDON":
      return "The brief was withdrawn from further internal use.";
  }
}
