"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskSummaryClient,
} from "@/features/workbench/api";
import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskSummaryResponse,
} from "@/features/workbench/types";

import {
  buildUnavailableRiskConcentration,
  buildUnavailableRiskSummary,
} from "./risk-workspace-view-model";

type PerformanceRiskContractState = {
  riskSummary: WorkbenchRiskSummaryResponse | null;
  riskConcentration: WorkbenchRiskConcentrationResponse | null;
  isLoading: boolean;
};

export function usePerformanceRiskContract({
  workspace,
  period,
  detailBasis,
  isDetailsPending,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detailBasis: string;
  isDetailsPending: boolean;
}): PerformanceRiskContractState {
  const workspaceRef = useRef(workspace);
  const summaryCacheRef = useRef<Map<string, WorkbenchRiskSummaryResponse>>(new Map());
  const concentrationCacheRef = useRef<Map<string, WorkbenchRiskConcentrationResponse>>(new Map());
  const requestSequenceRef = useRef(0);
  const [riskSummary, setRiskSummary] = useState<WorkbenchRiskSummaryResponse | null>(null);
  const [riskConcentration, setRiskConcentration] = useState<WorkbenchRiskConcentrationResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const summaryKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        asOfDate: workspace.as_of_date,
        reportingCurrency: workspace.portfolio.base_currency,
      }),
    [
      detailBasis,
      period,
      workspace.as_of_date,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ]
  );

  const concentrationKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        benchmark: workspace.benchmark_code ?? null,
        asOfDate: workspace.as_of_date,
        reportingCurrency: workspace.portfolio.base_currency,
      }),
    [
      period,
      workspace.as_of_date,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ]
  );

  useEffect(() => {
    if (isDetailsPending) {
      setRiskSummary(null);
      setRiskConcentration(null);
      setIsLoading(true);
      return;
    }

    const cachedSummary = summaryCacheRef.current.get(summaryKey) ?? null;
    const cachedConcentration = concentrationCacheRef.current.get(concentrationKey) ?? null;

    setRiskSummary(cachedSummary);
    setRiskConcentration(cachedConcentration);

    const needsSummary = !cachedSummary;
    const needsConcentration = !cachedConcentration;
    if (!needsSummary && !needsConcentration) {
      setIsLoading(false);
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    setIsLoading(true);

    const summaryPromise = needsSummary
      ? getWorkbenchRiskSummaryClient(workspace.portfolio.portfolio_id, {
          period,
          detailBasis,
          benchmark: workspace.benchmark_code ?? undefined,
          asOfDate: workspace.as_of_date,
          reportingCurrency: workspace.portfolio.base_currency,
        }).catch((error: unknown) =>
          buildUnavailableRiskSummary({
            workspace: workspaceRef.current,
            period,
            detailBasis,
            detail: error instanceof Error ? error.message : "Risk summary fetch failed.",
          })
        )
      : Promise.resolve(cachedSummary);

    const concentrationPromise = needsConcentration
      ? getWorkbenchRiskConcentrationClient(workspace.portfolio.portfolio_id, {
          period,
          benchmark: workspace.benchmark_code ?? undefined,
          asOfDate: workspace.as_of_date,
          reportingCurrency: workspace.portfolio.base_currency,
        }).catch((error: unknown) =>
          buildUnavailableRiskConcentration({
            workspace: workspaceRef.current,
            period,
            detail: error instanceof Error ? error.message : "Risk concentration fetch failed.",
          })
        )
      : Promise.resolve(cachedConcentration);

    void Promise.all([summaryPromise, concentrationPromise]).then(
      ([nextSummary, nextConcentration]) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        if (nextSummary) {
          summaryCacheRef.current.set(summaryKey, nextSummary);
          setRiskSummary(nextSummary);
        }
        if (nextConcentration) {
          concentrationCacheRef.current.set(concentrationKey, nextConcentration);
          setRiskConcentration(nextConcentration);
        }
        setIsLoading(false);
      }
    );
  }, [
    concentrationKey,
    detailBasis,
    isDetailsPending,
    period,
    summaryKey,
    workspace.as_of_date,
    workspace.benchmark_code,
    workspace.portfolio.base_currency,
    workspace.portfolio.portfolio_id,
  ]);

  return { riskSummary, riskConcentration, isLoading };
}
