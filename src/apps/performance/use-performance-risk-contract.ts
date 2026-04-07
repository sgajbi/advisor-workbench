"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkbenchRiskAttributionClient,
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskDrawdownClient,
  getWorkbenchRiskRollingClient,
  getWorkbenchRiskSummaryClient,
} from "@/features/workbench/api";
import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchRiskAttributionResponse,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskRollingResponse,
  WorkbenchRiskSummaryResponse,
} from "@/features/workbench/types";

import {
  buildUnavailableRiskAttribution,
  buildUnavailableRiskConcentration,
  buildUnavailableRiskDrawdown,
  buildUnavailableRiskRolling,
  buildUnavailableRiskSummary,
} from "./risk-workspace-view-model";

type PerformanceRiskContractState = {
  riskSummary: WorkbenchRiskSummaryResponse | null;
  riskConcentration: WorkbenchRiskConcentrationResponse | null;
  riskAttribution: WorkbenchRiskAttributionResponse | null;
  riskDrawdown: WorkbenchRiskDrawdownResponse | null;
  riskDrawdownDetail: WorkbenchRiskDrawdownResponse | null;
  riskRolling: WorkbenchRiskRollingResponse | null;
  riskRollingDetail: WorkbenchRiskRollingResponse | null;
  isLoading: boolean;
  isAttributionLoading: boolean;
  isDrawdownDetailLoading: boolean;
  isRollingDetailLoading: boolean;
  requestAttribution: (attributionType: string, groupingDimension: string) => void;
  requestDrawdownDetail: () => void;
  requestRollingDetail: () => void;
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
  const attributionCacheRef = useRef<Map<string, WorkbenchRiskAttributionResponse>>(new Map());
  const drawdownCacheRef = useRef<Map<string, WorkbenchRiskDrawdownResponse>>(new Map());
  const drawdownDetailCacheRef = useRef<Map<string, WorkbenchRiskDrawdownResponse>>(new Map());
  const rollingCacheRef = useRef<Map<string, WorkbenchRiskRollingResponse>>(new Map());
  const rollingDetailCacheRef = useRef<Map<string, WorkbenchRiskRollingResponse>>(new Map());
  const requestSequenceRef = useRef(0);
  const drawdownDetailRequestSequenceRef = useRef(0);
  const rollingDetailRequestSequenceRef = useRef(0);
  const attributionRequestSequenceRef = useRef(0);
  const [riskSummary, setRiskSummary] = useState<WorkbenchRiskSummaryResponse | null>(null);
  const [riskConcentration, setRiskConcentration] = useState<WorkbenchRiskConcentrationResponse | null>(
    null
  );
  const [riskAttribution, setRiskAttribution] = useState<WorkbenchRiskAttributionResponse | null>(null);
  const [riskDrawdown, setRiskDrawdown] = useState<WorkbenchRiskDrawdownResponse | null>(null);
  const [riskDrawdownDetail, setRiskDrawdownDetail] = useState<WorkbenchRiskDrawdownResponse | null>(
    null
  );
  const [riskRolling, setRiskRolling] = useState<WorkbenchRiskRollingResponse | null>(null);
  const [riskRollingDetail, setRiskRollingDetail] = useState<WorkbenchRiskRollingResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isAttributionLoading, setIsAttributionLoading] = useState(false);
  const [isDrawdownDetailLoading, setIsDrawdownDetailLoading] = useState(false);
  const [isRollingDetailLoading, setIsRollingDetailLoading] = useState(false);
  const [selectedAttributionType, setSelectedAttributionType] = useState("TOTAL_RISK");
  const [selectedGroupingDimension, setSelectedGroupingDimension] = useState("SECTOR");

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

  const rollingKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        asOfDate: workspace.as_of_date,
        reportingCurrency: workspace.portfolio.base_currency,
        includeTimeSeries: false,
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

  const rollingDetailKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        asOfDate: workspace.as_of_date,
        reportingCurrency: workspace.portfolio.base_currency,
        includeTimeSeries: true,
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
      setRiskAttribution(null);
      setRiskDrawdown(null);
      setRiskDrawdownDetail(null);
      setRiskRolling(null);
      setRiskRollingDetail(null);
      setIsLoading(true);
      setIsAttributionLoading(false);
      setIsDrawdownDetailLoading(false);
      setIsRollingDetailLoading(false);
      return;
    }

    const cachedSummary = summaryCacheRef.current.get(summaryKey) ?? null;
    const cachedConcentration = concentrationCacheRef.current.get(concentrationKey) ?? null;
    const cachedDrawdown = drawdownCacheRef.current.get(drawdownKey) ?? null;
    const cachedRolling = rollingCacheRef.current.get(rollingKey) ?? null;

    setRiskSummary(cachedSummary);
    setRiskConcentration(cachedConcentration);
    setRiskDrawdown(cachedDrawdown);
    setRiskDrawdownDetail(drawdownDetailCacheRef.current.get(drawdownDetailKey) ?? null);
    setRiskRolling(cachedRolling);
    setRiskRollingDetail(rollingDetailCacheRef.current.get(rollingDetailKey) ?? null);

    const needsSummary = !cachedSummary;
    const needsConcentration = !cachedConcentration;
    const needsDrawdown = !cachedDrawdown;
    const needsRolling = !cachedRolling;
    if (!needsSummary && !needsConcentration && !needsDrawdown && !needsRolling) {
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

    const rollingPromise = needsRolling
      ? getWorkbenchRiskRollingClient(workspace.portfolio.portfolio_id, {
          period,
          detailBasis,
          benchmark: workspace.benchmark_code ?? undefined,
          asOfDate: workspace.as_of_date,
          reportingCurrency: workspace.portfolio.base_currency,
          includeTimeSeries: false,
        }).catch((error: unknown) =>
          buildUnavailableRiskRolling({
            workspace: workspaceRef.current,
            period,
            detailBasis,
            detail: error instanceof Error ? error.message : "Risk rolling fetch failed.",
            includeTimeSeries: false,
          })
        )
      : Promise.resolve(cachedRolling);

    void Promise.all([summaryPromise, concentrationPromise, drawdownPromise, rollingPromise]).then(
      ([nextSummary, nextConcentration, nextDrawdown, nextRolling]) => {
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
        if (nextRolling) {
          rollingCacheRef.current.set(rollingKey, nextRolling);
          setRiskRolling(nextRolling);
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
    rollingDetailKey,
    rollingKey,
    summaryKey,
    workspace.as_of_date,
    workspace.benchmark_code,
    workspace.portfolio.base_currency,
    workspace.portfolio.portfolio_id,
  ]);

  const attributionKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        asOfDate: workspace.as_of_date,
        reportingCurrency: workspace.portfolio.base_currency,
        attributionType: selectedAttributionType,
        groupingDimension: selectedGroupingDimension,
      }),
    [
      detailBasis,
      period,
      selectedAttributionType,
      selectedGroupingDimension,
      workspace.as_of_date,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ]
  );

  useEffect(() => {
    setSelectedAttributionType("TOTAL_RISK");
    setSelectedGroupingDimension("SECTOR");
    setRiskAttribution(null);
    setIsAttributionLoading(false);
  }, [detailBasis, period, workspace.as_of_date, workspace.benchmark_code, workspace.portfolio.portfolio_id]);

  const requestAttribution = (attributionType: string, groupingDimension: string) => {
    if (isDetailsPending) {
      return;
    }
    setSelectedAttributionType(attributionType);
    setSelectedGroupingDimension(groupingDimension);
  };

  useEffect(() => {
    if (isDetailsPending) {
      return;
    }
    const cachedResponse = attributionCacheRef.current.get(attributionKey) ?? null;
    if (cachedResponse) {
      setRiskAttribution(cachedResponse);
      setIsAttributionLoading(false);
      return;
    }
    const requestId = attributionRequestSequenceRef.current + 1;
    attributionRequestSequenceRef.current = requestId;
    setIsAttributionLoading(true);
    void getWorkbenchRiskAttributionClient(workspace.portfolio.portfolio_id, {
      period,
      detailBasis,
      benchmark: workspace.benchmark_code ?? undefined,
      asOfDate: workspace.as_of_date,
      reportingCurrency: workspace.portfolio.base_currency,
      attributionType: selectedAttributionType,
      groupingDimension: selectedGroupingDimension,
    })
      .then((response) => {
        if (attributionRequestSequenceRef.current !== requestId) {
          return;
        }
        attributionCacheRef.current.set(attributionKey, response);
        setRiskAttribution(response);
        setIsAttributionLoading(false);
      })
      .catch(() => {
        const unavailableResponse = buildUnavailableRiskAttribution({
          workspace: workspaceRef.current,
          period,
          detail: "Risk attribution fetch failed.",
        });
        if (attributionRequestSequenceRef.current !== requestId) {
          return;
        }
        attributionCacheRef.current.set(attributionKey, unavailableResponse);
        setRiskAttribution(unavailableResponse);
        setIsAttributionLoading(false);
      });
  }, [
    attributionKey,
    detailBasis,
    isDetailsPending,
    period,
    selectedAttributionType,
    selectedGroupingDimension,
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

  const requestRollingDetail = () => {
    if (isDetailsPending) {
      return;
    }
    const cachedDetail = rollingDetailCacheRef.current.get(rollingDetailKey) ?? null;
    if (cachedDetail) {
      setRiskRollingDetail(cachedDetail);
      return;
    }
    const requestId = rollingDetailRequestSequenceRef.current + 1;
    rollingDetailRequestSequenceRef.current = requestId;
    setIsRollingDetailLoading(true);
    void getWorkbenchRiskRollingClient(workspaceRef.current.portfolio.portfolio_id, {
      period,
      detailBasis,
      benchmark: workspaceRef.current.benchmark_code ?? undefined,
      asOfDate: workspaceRef.current.as_of_date,
      reportingCurrency: workspaceRef.current.portfolio.base_currency,
      includeTimeSeries: true,
    })
      .catch((error: unknown) =>
        buildUnavailableRiskRolling({
          workspace: workspaceRef.current,
          period,
          detailBasis,
          detail:
            error instanceof Error ? error.message : "Risk rolling detail fetch failed.",
          includeTimeSeries: true,
        })
      )
      .then((response) => {
        if (rollingDetailRequestSequenceRef.current !== requestId) {
          return;
        }
        rollingDetailCacheRef.current.set(rollingDetailKey, response);
        setRiskRollingDetail(response);
        setIsRollingDetailLoading(false);
      });
  };

  return {
    riskSummary,
    riskConcentration,
    riskAttribution,
    riskDrawdown,
    riskDrawdownDetail,
    riskRolling,
    riskRollingDetail,
    isLoading,
    isAttributionLoading,
    isDrawdownDetailLoading,
    isRollingDetailLoading,
    requestAttribution,
    requestDrawdownDetail,
    requestRollingDetail,
  };
}
