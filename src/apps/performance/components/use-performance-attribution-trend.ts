"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkbenchApiErrorEvidence,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api-client";
import { getWorkbenchPerformanceAttributionTrendClient } from "@/features/workbench/api";
import type { WorkbenchPerformanceAttributionTrend } from "@/features/workbench/types";

type PerformanceAttributionTrendRequest = {
  portfolioId: string;
  period: string;
  chartFrequency: string;
  attributionDimension: string;
  detailBasis: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

export type PerformanceAttributionTrendState =
  | { status: "loading"; trend: null; httpStatus: null }
  | {
      status: "ready";
      trend: WorkbenchPerformanceAttributionTrend;
      httpStatus: null;
    }
  | {
      status: "error" | "permission_blocked";
      trend: null;
      httpStatus: number | null;
    };

type RefreshRequest = {
  requestKey: string;
  sequence: number;
};

export function usePerformanceAttributionTrend(request: PerformanceAttributionTrendRequest) {
  const requestKey = useMemo(() => buildPerformanceAttributionTrendRequestKey(request), [request]);
  const [refreshRequest, setRefreshRequest] = useState<RefreshRequest>({
    requestKey: "",
    sequence: 0,
  });
  const [state, setState] = useState<PerformanceAttributionTrendState>({
    status: "loading",
    trend: null,
    httpStatus: null,
  });
  const latestRequestIdRef = useRef(0);
  const consumedRefreshSequenceRef = useRef(0);
  const cacheRef = useRef<Map<string, WorkbenchPerformanceAttributionTrend>>(new Map());

  useEffect(() => {
    const forceRefresh =
      refreshRequest.requestKey === requestKey &&
      refreshRequest.sequence > consumedRefreshSequenceRef.current;
    if (forceRefresh) {
      consumedRefreshSequenceRef.current = refreshRequest.sequence;
    }

    const cached = cacheRef.current.get(requestKey);
    if (cached && !forceRefresh) {
      setState({ status: "ready", trend: cached, httpStatus: null });
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setState({ status: "loading", trend: null, httpStatus: null });

    void getWorkbenchPerformanceAttributionTrendClient(request.portfolioId, {
      period: request.period,
      chartFrequency: request.chartFrequency,
      attributionDimension: request.attributionDimension,
      detailBasis: request.detailBasis,
      benchmark: request.benchmark,
      reportStartDate: request.reportStartDate,
      reportEndDate: request.reportEndDate,
    })
      .then((trend) => {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(requestKey, trend);
        setState({ status: "ready", trend, httpStatus: null });
      })
      .catch((error: unknown) => {
        const permissionBlocked = isWorkbenchPermissionBlockedError(error);
        if (permissionBlocked) {
          cacheRef.current.delete(requestKey);
        }
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        const errorEvidence = getWorkbenchApiErrorEvidence(error);
        setState({
          status: permissionBlocked ? "permission_blocked" : "error",
          trend: null,
          httpStatus: errorEvidence ? Number(errorEvidence.value) : null,
        });
      });

    return () => {
      if (latestRequestIdRef.current === requestId) {
        latestRequestIdRef.current += 1;
      }
    };
  }, [refreshRequest.requestKey, refreshRequest.sequence, request, requestKey]);

  const refresh = useCallback(() => {
    setRefreshRequest((current) => ({
      requestKey,
      sequence: current.sequence + 1,
    }));
  }, [requestKey]);

  return { state, refresh, requestKey };
}

export function buildPerformanceAttributionTrendRequestKey(
  request: PerformanceAttributionTrendRequest,
): string {
  return JSON.stringify({
    portfolioId: request.portfolioId,
    period: request.period,
    chartFrequency: request.chartFrequency,
    attributionDimension: request.attributionDimension,
    detailBasis: request.detailBasis,
    benchmark: request.benchmark ?? null,
    reportStartDate: request.reportStartDate ?? null,
    reportEndDate: request.reportEndDate ?? null,
  });
}
