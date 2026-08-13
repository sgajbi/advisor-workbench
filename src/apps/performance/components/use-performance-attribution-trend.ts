"use client";

import { useCallback, useMemo } from "react";

import { getWorkbenchPerformanceAttributionTrendClient } from "@/features/workbench/api";
import type { WorkbenchPerformanceAttributionTrend } from "@/features/workbench/types";
import {
  useSourceConfirmedResource,
} from "./use-source-confirmed-resource";

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

export function usePerformanceAttributionTrend(request: PerformanceAttributionTrendRequest) {
  const requestKey = useMemo(() => buildPerformanceAttributionTrendRequestKey(request), [request]);
  const load = useCallback(
    () => getWorkbenchPerformanceAttributionTrendClient(request.portfolioId, {
      period: request.period,
      chartFrequency: request.chartFrequency,
      attributionDimension: request.attributionDimension,
      detailBasis: request.detailBasis,
      benchmark: request.benchmark,
      reportStartDate: request.reportStartDate,
      reportEndDate: request.reportEndDate,
    }),
    [request],
  );
  const resource = useSourceConfirmedResource({ requestKey, load });
  const state: PerformanceAttributionTrendState =
    resource.state.status === "ready"
      ? { status: "ready", trend: resource.state.value, httpStatus: null }
      : resource.state.status === "loading"
        ? { status: "loading", trend: null, httpStatus: null }
        : {
            status: resource.state.status,
            trend: null,
            httpStatus: resource.state.httpStatus,
          };

  return { state, refresh: resource.refresh, requestKey: resource.requestKey };
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
