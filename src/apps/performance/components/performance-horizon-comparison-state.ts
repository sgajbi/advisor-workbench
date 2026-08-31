"use client";

import { useCallback, useMemo } from "react";

import { getWorkbenchPerformanceHorizonComparisonClient } from "@/features/workbench/api";
import type { WorkbenchPerformanceHorizonComparison } from "@/features/workbench/types";
import { isPerformanceRequestedValueCurrent } from "../performance-source-identity";
import {
  SourceEvidenceMismatchError,
  useSourceConfirmedResource,
} from "./use-source-confirmed-resource";

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
    async () => {
      const response = await getWorkbenchPerformanceHorizonComparisonClient(
        request.portfolioId,
        {
          period: request.period,
          detailBasis: request.detailBasis,
          benchmark: request.benchmark,
          chartFrequency: request.chartFrequency,
          reportStartDate: request.reportStartDate,
          reportEndDate: request.reportEndDate,
          asOfDate: request.asOfDate,
          reportingCurrency: request.reportingCurrency,
        },
      );
      if (!isHorizonComparisonCurrent(response, request)) {
        throw new SourceEvidenceMismatchError(
          "Horizon comparison does not confirm the requested review window.",
        );
      }
      return response;
    },
    [request],
  );
  const resource = useSourceConfirmedResource({ requestKey, load });
  const state: PerformanceHorizonComparisonState =
    resource.state.status === "ready"
      ? { status: "ready", comparison: resource.state.value, httpStatus: null }
      : resource.state.status === "loading"
        ? { status: "loading", comparison: null, httpStatus: null }
        : {
            status:
              resource.state.status === "source_mismatch"
                ? "context_mismatch"
                : resource.state.status,
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

export function isHorizonComparisonCurrent(
  response: WorkbenchPerformanceHorizonComparison,
  request: PerformanceHorizonComparisonRequest,
): boolean {
  return (
    response.portfolio_id === request.portfolioId &&
    response.period === request.period &&
    response.detail_basis === request.detailBasis &&
    (request.benchmark === undefined ||
      response.benchmark_code === request.benchmark) &&
    isPerformanceRequestedValueCurrent(
      response.chart_frequency,
      request.chartFrequency,
      response.requested_chart_frequency_supported,
    ) &&
    (!request.reportStartDate ||
      response.report_start_date === request.reportStartDate) &&
    (!request.reportEndDate ||
      response.report_end_date === request.reportEndDate) &&
    (!request.asOfDate || response.as_of_date === request.asOfDate) &&
    (!request.reportingCurrency ||
      response.reporting_currency?.toUpperCase() ===
        request.reportingCurrency.toUpperCase())
  );
}
