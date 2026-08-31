"use client";

import { useCallback, useMemo } from "react";

import { getWorkbenchPerformanceAttributionTrendClient } from "@/features/workbench/api";
import type { WorkbenchPerformanceAttributionTrend } from "@/features/workbench/types";
import {
  arePerformanceReviewContextsCoherent,
  type PerformanceReviewContextSource,
} from "../performance-review-context";
import {
  arePerformanceObservationWindowsCurrent,
  isPerformanceAnalyticalSourceCurrent,
} from "../performance-source-identity";
import {
  SourceEvidenceMismatchError,
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
  asOfDate?: string;
  reportingCurrency?: string;
};

export type PerformanceAttributionTrendState =
  | { status: "loading"; trend: null; httpStatus: null }
  | {
      status: "ready";
      trend: WorkbenchPerformanceAttributionTrend;
      httpStatus: null;
    }
  | {
      status: "context_mismatch" | "error" | "permission_blocked";
      trend: null;
      httpStatus: number | null;
    };

export function usePerformanceAttributionTrend(
  request: PerformanceAttributionTrendRequest,
  sourceContext: PerformanceReviewContextSource,
) {
  const requestKey = useMemo(
    () => buildPerformanceAttributionTrendRequestKey(request, sourceContext),
    [request, sourceContext],
  );
  const load = useCallback(async () => {
    const trend = await getWorkbenchPerformanceAttributionTrendClient(request.portfolioId, {
      period: request.period,
      chartFrequency: request.chartFrequency,
      attributionDimension: request.attributionDimension,
      detailBasis: request.detailBasis,
      benchmark: request.benchmark,
      reportStartDate: request.reportStartDate,
      reportEndDate: request.reportEndDate,
      asOfDate: request.asOfDate,
      reportingCurrency: request.reportingCurrency
    });

    if (
      !isPerformanceAnalyticalSourceCurrent(trend, {
        ...request,
        benchmark: request.benchmark ?? null,
      }) ||
      !arePerformanceObservationWindowsCurrent(trend.rows, trend) ||
      !arePerformanceReviewContextsCoherent(trend, sourceContext)
    ) {
      throw new SourceEvidenceMismatchError(
        "Performance attribution history does not confirm the requested review context."
      );
    }

    return trend;
  }, [request, sourceContext]);
  const resource = useSourceConfirmedResource({ requestKey, load });
  const state: PerformanceAttributionTrendState =
    resource.state.status === "ready"
      ? { status: "ready", trend: resource.state.value, httpStatus: null }
      : resource.state.status === "loading"
        ? { status: "loading", trend: null, httpStatus: null }
        : {
            status:
              resource.state.status === "source_mismatch"
                ? "context_mismatch"
                : resource.state.status,
            trend: null,
            httpStatus: resource.state.httpStatus
          };

  return { state, refresh: resource.refresh, requestKey: resource.requestKey };
}

export function buildPerformanceAttributionTrendRequestKey(
  request: PerformanceAttributionTrendRequest,
  sourceContext: PerformanceReviewContextSource,
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
    asOfDate: request.asOfDate ?? null,
    reportingCurrency: request.reportingCurrency ?? null,
    sourceContext: {
      asOfDate: sourceContext.as_of_date,
      requestedAsOfDate: sourceContext.requested_as_of_date,
      effectiveAsOfDate: sourceContext.effective_as_of_date,
      requestedReportingCurrency: sourceContext.requested_reporting_currency,
      effectiveReportingCurrency: sourceContext.effective_reporting_currency,
      reportingCurrencyState: sourceContext.reporting_currency_state,
    },
  });
}
