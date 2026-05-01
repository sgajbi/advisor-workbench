"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkbenchPerformanceAdvisorBriefClient,
  isWorkbenchPermissionBlockedError,
  postWorkbenchPerformanceAdvisorBriefReviewActionClient,
} from "@/features/workbench/api";
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
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const requestSequenceRef = useRef(0);
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

  useEffect(() => {
    const cachedResponse = cacheRef.current.get(requestKey) ?? null;
    setAdvisorBrief(cachedResponse);
    setAdvisorBriefUnavailable(false);
    setAdvisorBriefPermissionBlocked(false);
    setReviewActionError(null);

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
      setIsApplyingReviewAction(true);
      setReviewActionError(null);

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

        cacheRef.current.set(requestKey, response);
        setAdvisorBrief(response);
        setAdvisorBriefUnavailable(false);
        setAdvisorBriefPermissionBlocked(false);
        return response;
      } catch (error) {
        setReviewActionError(
          "Gateway could not record the bounded review action. Refresh the brief and try again."
        );
        throw error;
      } finally {
        setIsApplyingReviewAction(false);
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
    reviewActionError,
    applyReviewAction,
    refresh,
  };
}
