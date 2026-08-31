"use client";

import { useCallback, useMemo } from "react";

import { getWorkbenchPerformanceHorizonComparisonClient } from "@/features/workbench/api";
import type { WorkbenchPerformanceHorizonComparison } from "@/features/workbench/types";
import { useSourceConfirmedResource } from "./use-source-confirmed-resource";

type PerformanceHorizonComparisonRequest = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  benchmark?: string;
  chartFrequency: string;
  reportStartDate?: string;
  reportEndDate?: string;
  asOfDate?: string;
  reportingCurrency?: string;
};

export type PerformanceHorizonComparisonState =
  | { status: "loading"; comparison: null; httpStatus: null }
  | {
      status: "ready";
      comparison: WorkbenchPerformanceHorizonComparison;
      httpStatus: null;
    }
  | {
      status: "error" | "permission_blocked" | "context_mismatch";
      comparison: null;
      httpStatus: number | null;
    };

export function usePerformanceHorizonComparison(
  request: PerformanceHorizonComparisonRequest,
) {
  const requestKey = useMemo(
    () => buildPerformanceHorizonComparisonCacheKey(request),
    [request],
  );
  const load = useCallback(
    () => getWorkbenchPerformanceHorizonComparisonClient(request.portfolioId, {
      period: request.period,
      detailBasis: request.detailBasis,
      benchmark: request.benchmark,
      chartFrequency: request.chartFrequency,
      reportStartDate: request.reportStartDate,
      reportEndDate: request.reportEndDate,
      asOfDate: request.asOfDate,
      reportingCurrency: request.reportingCurrency,
    }),
    [request],
  );
  const resource = useSourceConfirmedResource({ requestKey, load });
  const contextMatches =
    resource.state.status === "ready" &&
    (!request.asOfDate || resource.state.value.as_of_date === request.asOfDate) &&
    (!request.reportingCurrency ||
      resource.state.value.reporting_currency?.toUpperCase() ===
        request.reportingCurrency.toUpperCase());
  const state: PerformanceHorizonComparisonState =
    resource.state.status === "ready"
      ? contextMatches
        ? { status: "ready", comparison: resource.state.value, httpStatus: null }
        : { status: "context_mismatch", comparison: null, httpStatus: null }
      : resource.state.status === "loading"
        ? { status: "loading", comparison: null, httpStatus: null }
        : {
            status: resource.state.status,
            comparison: null,
            httpStatus: resource.state.httpStatus,
          };

  return { state, refresh: resource.refresh, requestKey: resource.requestKey };
}

export function buildPerformanceHorizonComparisonCacheKey(
  request: PerformanceHorizonComparisonRequest,
): string {
  return JSON.stringify({
    portfolioId: request.portfolioId,
    period: request.period,
    detailBasis: request.detailBasis,
    benchmark: request.benchmark ?? null,
    chartFrequency: request.chartFrequency,
    reportStartDate: request.reportStartDate ?? null,
    reportEndDate: request.reportEndDate ?? null,
    asOfDate: request.asOfDate ?? null,
    reportingCurrency: request.reportingCurrency?.toUpperCase() ?? null,
  });
}
