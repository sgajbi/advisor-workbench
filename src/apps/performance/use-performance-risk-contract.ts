"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskDrawdownClient,
  getWorkbenchRiskSummaryClient,
} from "@/features/workbench/api";
import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskSummaryResponse,
} from "@/features/workbench/types";

import {
  buildUnavailableRiskConcentration,
  buildUnavailableRiskDrawdown,
  buildUnavailableRiskSummary,
} from "./risk-workspace-view-model";

type PerformanceRiskContractState = {
  riskSummary: WorkbenchRiskSummaryResponse | null;
  riskConcentration: WorkbenchRiskConcentrationResponse | null;
  riskDrawdown: WorkbenchRiskDrawdownResponse | null;
  riskDrawdownDetail: WorkbenchRiskDrawdownResponse | null;
  isLoading: boolean;
  isDrawdownDetailLoading: boolean;
  requestDrawdownDetail: () => void;
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
  const drawdownCacheRef = useRef<Map<string, WorkbenchRiskDrawdownResponse>>(new Map());
  const drawdownDetailCacheRef = useRef<Map<string, WorkbenchRiskDrawdownResponse>>(new Map());
  const requestSequenceRef = useRef(0);
  const drawdownDetailRequestSequenceRef = useRef(0);
  const [riskSummary, setRiskSummary] = useState<WorkbenchRiskSummaryResponse | null>(null);
  const [riskConcentration, setRiskConcentration] = useState<WorkbenchRiskConcentrationResponse | null>(
    null
  );
  const [riskDrawdown, setRiskDrawdown] = useState<WorkbenchRiskDrawdownResponse | null>(null);
  const [riskDrawdownDetail, setRiskDrawdownDetail] = useState<WorkbenchRiskDrawdownResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawdownDetailLoading, setIsDrawdownDetailLoading] = useState(false);

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

  const drawdownKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        asOfDate: workspace.as_of_date,
        reportingCurrency: workspace.portfolio.base_currency,
        includeUnderwaterSeries: false,
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

  const drawdownDetailKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        asOfDate: workspace.as_of_date,
        reportingCurrency: workspace.portfolio.base_currency,
        includeUnderwaterSeries: true,
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

  useEffect(() => {
    if (isDetailsPending) {
      setRiskSummary(null);
      setRiskConcentration(null);
      setRiskDrawdown(null);
      setRiskDrawdownDetail(null);
      setIsLoading(true);
      setIsDrawdownDetailLoading(false);
      return;
    }

    const cachedSummary = summaryCacheRef.current.get(summaryKey) ?? null;
    const cachedConcentration = concentrationCacheRef.current.get(concentrationKey) ?? null;
    const cachedDrawdown = drawdownCacheRef.current.get(drawdownKey) ?? null;

    setRiskSummary(cachedSummary);
    setRiskConcentration(cachedConcentration);
    setRiskDrawdown(cachedDrawdown);
    setRiskDrawdownDetail(drawdownDetailCacheRef.current.get(drawdownDetailKey) ?? null);

    const needsSummary = !cachedSummary;
    const needsConcentration = !cachedConcentration;
    const needsDrawdown = !cachedDrawdown;
    if (!needsSummary && !needsConcentration && !needsDrawdown) {
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

    const drawdownPromise = needsDrawdown
      ? getWorkbenchRiskDrawdownClient(workspace.portfolio.portfolio_id, {
          period,
          detailBasis,
          benchmark: workspace.benchmark_code ?? undefined,
          asOfDate: workspace.as_of_date,
          reportingCurrency: workspace.portfolio.base_currency,
          includeUnderwaterSeries: false,
        }).catch((error: unknown) =>
          buildUnavailableRiskDrawdown({
            workspace: workspaceRef.current,
            period,
            detailBasis,
            detail: error instanceof Error ? error.message : "Risk drawdown fetch failed.",
            includeUnderwaterSeries: false,
          })
        )
      : Promise.resolve(cachedDrawdown);

    void Promise.all([summaryPromise, concentrationPromise, drawdownPromise]).then(
      ([nextSummary, nextConcentration, nextDrawdown]) => {
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
        if (nextDrawdown) {
          drawdownCacheRef.current.set(drawdownKey, nextDrawdown);
          setRiskDrawdown(nextDrawdown);
        }
        setIsLoading(false);
      }
    );
  }, [
    concentrationKey,
    detailBasis,
    drawdownDetailKey,
    drawdownKey,
    isDetailsPending,
    period,
    summaryKey,
    workspace.as_of_date,
    workspace.benchmark_code,
    workspace.portfolio.base_currency,
    workspace.portfolio.portfolio_id,
  ]);

  const requestDrawdownDetail = () => {
    if (isDetailsPending) {
      return;
    }
    const cachedDetail = drawdownDetailCacheRef.current.get(drawdownDetailKey) ?? null;
    if (cachedDetail) {
      setRiskDrawdownDetail(cachedDetail);
      return;
    }
    const requestId = drawdownDetailRequestSequenceRef.current + 1;
    drawdownDetailRequestSequenceRef.current = requestId;
    setIsDrawdownDetailLoading(true);
    void getWorkbenchRiskDrawdownClient(workspaceRef.current.portfolio.portfolio_id, {
      period,
      detailBasis,
      benchmark: workspaceRef.current.benchmark_code ?? undefined,
      asOfDate: workspaceRef.current.as_of_date,
      reportingCurrency: workspaceRef.current.portfolio.base_currency,
      includeUnderwaterSeries: true,
    })
      .catch((error: unknown) =>
        buildUnavailableRiskDrawdown({
          workspace: workspaceRef.current,
          period,
          detailBasis,
          detail:
            error instanceof Error ? error.message : "Risk drawdown detail fetch failed.",
          includeUnderwaterSeries: true,
        })
      )
      .then((response) => {
        if (drawdownDetailRequestSequenceRef.current !== requestId) {
          return;
        }
        drawdownDetailCacheRef.current.set(drawdownDetailKey, response);
        setRiskDrawdownDetail(response);
        setIsDrawdownDetailLoading(false);
      });
  };

  return {
    riskSummary,
    riskConcentration,
    riskDrawdown,
    riskDrawdownDetail,
    isLoading,
    isDrawdownDetailLoading,
    requestDrawdownDetail,
  };
}
