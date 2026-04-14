"use client";

import { useEffect, useRef, useState } from "react";

import { getWorkbenchPerformanceHorizonComparisonClient } from "@/features/workbench/api";
import type {
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceHorizonComparison,
} from "@/features/workbench/types";

type PerformanceHorizonComparisonStateArgs = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  benchmark?: string;
  chartFrequency: string;
  reportStartDate?: string;
  reportEndDate?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
};

export function usePerformanceHorizonComparison({
  portfolioId,
  period,
  detailBasis,
  benchmark,
  chartFrequency,
  reportStartDate,
  reportEndDate,
  benchmarkOptions = [],
}: PerformanceHorizonComparisonStateArgs) {
  const [comparison, setComparison] = useState<WorkbenchPerformanceHorizonComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, WorkbenchPerformanceHorizonComparison>>(new Map());

  useEffect(() => {
    const cacheKey = buildPerformanceHorizonComparisonCacheKey({
      portfolioId,
      period,
      detailBasis,
      benchmark,
      chartFrequency,
      reportStartDate,
      reportEndDate,
    });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setComparison(cached);
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    void getWorkbenchPerformanceHorizonComparisonClient(portfolioId, {
      period,
      detailBasis,
      benchmark,
      chartFrequency,
      reportStartDate,
      reportEndDate,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(cacheKey, result);
        setComparison(result);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setComparison(
          buildEmptyPerformanceHorizonComparison({
            portfolioId,
            period,
            detailBasis,
            benchmark,
            chartFrequency,
            reportStartDate,
            reportEndDate,
            benchmarkOptions,
          })
        );
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [
    benchmark,
    benchmarkOptions,
    chartFrequency,
    detailBasis,
    period,
    portfolioId,
    reportEndDate,
    reportStartDate,
  ]);

  return { comparison, isLoading };
}

export function buildPerformanceHorizonComparisonCacheKey({
  portfolioId,
  period,
  detailBasis,
  benchmark,
  chartFrequency,
  reportStartDate,
  reportEndDate,
}: Omit<PerformanceHorizonComparisonStateArgs, "benchmarkOptions">): string {
  return JSON.stringify({
    portfolioId,
    period,
    detailBasis,
    benchmark: benchmark ?? null,
    chartFrequency,
    reportStartDate: reportStartDate ?? null,
    reportEndDate: reportEndDate ?? null,
  });
}

export function buildEmptyPerformanceHorizonComparison({
  portfolioId,
  period,
  detailBasis,
  benchmark,
  chartFrequency,
  reportStartDate,
  reportEndDate,
  benchmarkOptions = [],
}: PerformanceHorizonComparisonStateArgs): WorkbenchPerformanceHorizonComparison {
  return {
    correlation_id: "",
    contract_version: "v1",
    portfolio_id: portfolioId,
    as_of_date: "",
    period,
    report_start_date: reportStartDate ?? "",
    report_end_date: reportEndDate ?? "",
    reporting_currency: null,
    detail_basis: detailBasis,
    chart_frequency: chartFrequency,
    requested_chart_frequency_supported: true,
    benchmark_code: benchmark ?? null,
    benchmark_options: benchmarkOptions,
    rows: [],
    warnings: [],
    partial_failures: [],
  };
}
