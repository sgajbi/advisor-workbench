"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkbenchRiskAttributionClient,
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskDrawdownClient,
  getWorkbenchRiskRollingClient,
  getWorkbenchRiskSummaryClient,
  isWorkbenchPermissionBlockedError,
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
import {
  requireCurrentPerformanceRiskSource,
  type PerformanceRiskSourceIdentity,
} from "./performance-risk-source-identity";

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
  requestAttribution: (
    attributionType: string,
    groupingDimension: string,
  ) => void;
  requestDrawdownDetail: () => void;
  requestRollingDetail: () => void;
};

type AttributionSelectionState = {
  scopeKey: string;
  attributionType: string;
  groupingDimension: string;
};

type RiskFetchResult<Response> = Readonly<{
  value: Response | null;
  cacheable: boolean;
}>;

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
  const summaryCacheRef = useRef<Map<string, WorkbenchRiskSummaryResponse>>(
    new Map(),
  );
  const concentrationCacheRef = useRef<
    Map<string, WorkbenchRiskConcentrationResponse>
  >(new Map());
  const attributionCacheRef = useRef<
    Map<string, WorkbenchRiskAttributionResponse>
  >(new Map());
  const drawdownCacheRef = useRef<Map<string, WorkbenchRiskDrawdownResponse>>(
    new Map(),
  );
  const drawdownDetailCacheRef = useRef<
    Map<string, WorkbenchRiskDrawdownResponse>
  >(new Map());
  const rollingCacheRef = useRef<Map<string, WorkbenchRiskRollingResponse>>(
    new Map(),
  );
  const rollingDetailCacheRef = useRef<
    Map<string, WorkbenchRiskRollingResponse>
  >(new Map());
  const requestSequenceRef = useRef(0);
  const drawdownDetailRequestSequenceRef = useRef(0);
  const rollingDetailRequestSequenceRef = useRef(0);
  const attributionRequestSequenceRef = useRef(0);
  const [riskSummary, setRiskSummary] =
    useState<WorkbenchRiskSummaryResponse | null>(null);
  const [riskConcentration, setRiskConcentration] =
    useState<WorkbenchRiskConcentrationResponse | null>(null);
  const [riskAttribution, setRiskAttribution] =
    useState<WorkbenchRiskAttributionResponse | null>(null);
  const [riskDrawdown, setRiskDrawdown] =
    useState<WorkbenchRiskDrawdownResponse | null>(null);
  const [riskDrawdownDetail, setRiskDrawdownDetail] =
    useState<WorkbenchRiskDrawdownResponse | null>(null);
  const [riskRolling, setRiskRolling] =
    useState<WorkbenchRiskRollingResponse | null>(null);
  const [riskRollingDetail, setRiskRollingDetail] =
    useState<WorkbenchRiskRollingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttributionLoading, setIsAttributionLoading] = useState(false);
  const [isDrawdownDetailLoading, setIsDrawdownDetailLoading] = useState(false);
  const [isRollingDetailLoading, setIsRollingDetailLoading] = useState(false);
  const riskWindowParams = useMemo(
    () =>
      period === "EXPLICIT"
        ? {
            reportStartDate: workspace.report_start_date,
            reportEndDate: workspace.report_end_date,
          }
        : {},
    [period, workspace.report_end_date, workspace.report_start_date],
  );
  const riskAsOfDate = getRiskAsOfDate(workspace);
  const riskSourceIdentity = useMemo<PerformanceRiskSourceIdentity>(
    () => ({
      portfolioId: workspace.portfolio.portfolio_id,
      period,
      asOfDate: riskAsOfDate,
      benchmark: workspace.benchmark_code ?? null,
      ...riskWindowParams,
    }),
    [
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.portfolio_id,
    ],
  );
  const attributionScopeKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
      }),
    [
      detailBasis,
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );
  const [attributionSelection, setAttributionSelection] =
    useState<AttributionSelectionState>({
      scopeKey: attributionScopeKey,
      attributionType: "TOTAL_RISK",
      groupingDimension: "SECTOR",
    });
  const selectedAttributionType =
    attributionSelection.scopeKey === attributionScopeKey
      ? attributionSelection.attributionType
      : "TOTAL_RISK";
  const selectedGroupingDimension =
    attributionSelection.scopeKey === attributionScopeKey
      ? attributionSelection.groupingDimension
      : "SECTOR";

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
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
      }),
    [
      detailBasis,
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );

  const concentrationKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        benchmark: workspace.benchmark_code ?? null,
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
      }),
    [
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );

  const drawdownKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
        includeUnderwaterSeries: false,
      }),
    [
      detailBasis,
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );

  const drawdownDetailKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
        includeUnderwaterSeries: true,
      }),
    [
      detailBasis,
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );

  const rollingKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
        includeTimeSeries: false,
      }),
    [
      detailBasis,
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );

  const rollingDetailKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        benchmark: workspace.benchmark_code ?? null,
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
        includeTimeSeries: true,
      }),
    [
      detailBasis,
      period,
      riskWindowParams,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
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
      const cachedConcentration =
        concentrationCacheRef.current.get(concentrationKey) ?? null;
      const cachedDrawdown = drawdownCacheRef.current.get(drawdownKey) ?? null;
      const cachedRolling = rollingCacheRef.current.get(rollingKey) ?? null;

      setRiskSummary(cachedSummary);
      setRiskConcentration(cachedConcentration);
      setRiskDrawdown(cachedDrawdown);
      setRiskDrawdownDetail(
        drawdownDetailCacheRef.current.get(drawdownDetailKey) ?? null,
      );
      setRiskRolling(cachedRolling);
      setRiskRollingDetail(
        rollingDetailCacheRef.current.get(rollingDetailKey) ?? null,
      );

      const needsSummary = !cachedSummary;
      const needsConcentration = !cachedConcentration;
      const needsDrawdown = !cachedDrawdown;
      const needsRolling = !cachedRolling;
      if (
        !needsSummary &&
        !needsConcentration &&
        !needsDrawdown &&
        !needsRolling
      ) {
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
            ...riskWindowParams,
            asOfDate: riskAsOfDate,
            reportingCurrency: workspace.portfolio.base_currency,
          })
            .then<RiskFetchResult<WorkbenchRiskSummaryResponse>>((response) => ({
              value: requireCurrentPerformanceRiskSource(response, riskSourceIdentity),
              cacheable: true,
            }))
            .catch((error: unknown) => ({
              value: buildUnavailableRiskSummary({
                workspace: workspaceRef.current,
                period,
                detailBasis,
                detail: buildRiskFetchFailureDetail(error, "Risk summary"),
                permissionBlocked: isWorkbenchPermissionBlockedError(error),
              }),
              cacheable: false,
            }))
        : Promise.resolve({ value: cachedSummary, cacheable: false });

      const concentrationPromise = needsConcentration
        ? getWorkbenchRiskConcentrationClient(
            workspace.portfolio.portfolio_id,
            {
              period,
              benchmark: workspace.benchmark_code ?? undefined,
              ...riskWindowParams,
              asOfDate: riskAsOfDate,
              reportingCurrency: workspace.portfolio.base_currency,
            },
          )
            .then<RiskFetchResult<WorkbenchRiskConcentrationResponse>>((response) => ({
              value: requireCurrentPerformanceRiskSource(response, riskSourceIdentity),
              cacheable: true,
            }))
            .catch((error: unknown) => ({
              value: buildUnavailableRiskConcentration({
                workspace: workspaceRef.current,
                period,
                detail: buildRiskFetchFailureDetail(error, "Risk concentration"),
                permissionBlocked: isWorkbenchPermissionBlockedError(error),
              }),
              cacheable: false,
            }))
        : Promise.resolve({ value: cachedConcentration, cacheable: false });

      const drawdownPromise = needsDrawdown
        ? getWorkbenchRiskDrawdownClient(workspace.portfolio.portfolio_id, {
            period,
            detailBasis,
            benchmark: workspace.benchmark_code ?? undefined,
            ...riskWindowParams,
            asOfDate: riskAsOfDate,
            reportingCurrency: workspace.portfolio.base_currency,
            includeUnderwaterSeries: false,
          })
            .then<RiskFetchResult<WorkbenchRiskDrawdownResponse>>((response) => ({
              value: requireCurrentPerformanceRiskSource(response, riskSourceIdentity),
              cacheable: true,
            }))
            .catch((error: unknown) => ({
              value: buildUnavailableRiskDrawdown({
                workspace: workspaceRef.current,
                period,
                detailBasis,
                detail: buildRiskFetchFailureDetail(error, "Risk drawdown"),
                includeUnderwaterSeries: false,
                permissionBlocked: isWorkbenchPermissionBlockedError(error),
              }),
              cacheable: false,
            }))
        : Promise.resolve({ value: cachedDrawdown, cacheable: false });

      const rollingPromise = needsRolling
        ? getWorkbenchRiskRollingClient(workspace.portfolio.portfolio_id, {
            period,
            detailBasis,
            benchmark: workspace.benchmark_code ?? undefined,
            ...riskWindowParams,
            asOfDate: riskAsOfDate,
            reportingCurrency: workspace.portfolio.base_currency,
            includeTimeSeries: false,
          })
            .then<RiskFetchResult<WorkbenchRiskRollingResponse>>((response) => ({
              value: requireCurrentPerformanceRiskSource(response, riskSourceIdentity),
              cacheable: true,
            }))
            .catch((error: unknown) => ({
              value: buildUnavailableRiskRolling({
                workspace: workspaceRef.current,
                period,
                detailBasis,
                detail: buildRiskFetchFailureDetail(error, "Risk rolling"),
                includeTimeSeries: false,
                permissionBlocked: isWorkbenchPermissionBlockedError(error),
              }),
              cacheable: false,
            }))
        : Promise.resolve({ value: cachedRolling, cacheable: false });

      void Promise.all([
        summaryPromise,
        concentrationPromise,
        drawdownPromise,
        rollingPromise,
      ]).then(([nextSummary, nextConcentration, nextDrawdown, nextRolling]) => {
        if (cancelled || requestSequenceRef.current !== requestId) {
          return;
        }
        if (nextSummary.value) {
          if (nextSummary.cacheable) {
            summaryCacheRef.current.set(summaryKey, nextSummary.value);
          }
          setRiskSummary(nextSummary.value);
        }
        if (nextConcentration.value) {
          if (nextConcentration.cacheable) {
            concentrationCacheRef.current.set(
              concentrationKey,
              nextConcentration.value,
            );
          }
          setRiskConcentration(nextConcentration.value);
        }
        if (nextDrawdown.value) {
          if (nextDrawdown.cacheable) {
            drawdownCacheRef.current.set(drawdownKey, nextDrawdown.value);
          }
          setRiskDrawdown(nextDrawdown.value);
        }
        if (nextRolling.value) {
          if (nextRolling.cacheable) {
            rollingCacheRef.current.set(rollingKey, nextRolling.value);
          }
          setRiskRolling(nextRolling.value);
        }
        setIsLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    concentrationKey,
    detailBasis,
    drawdownDetailKey,
    drawdownKey,
    isDetailsPending,
    period,
    riskWindowParams,
    rollingDetailKey,
    rollingKey,
    summaryKey,
    riskAsOfDate,
    riskSourceIdentity,
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
        ...riskWindowParams,
        asOfDate: riskAsOfDate,
        reportingCurrency: workspace.portfolio.base_currency,
        attributionType: selectedAttributionType,
        groupingDimension: selectedGroupingDimension,
      }),
    [
      detailBasis,
      period,
      riskWindowParams,
      selectedAttributionType,
      selectedGroupingDimension,
      riskAsOfDate,
      workspace.benchmark_code,
      workspace.portfolio.base_currency,
      workspace.portfolio.portfolio_id,
    ],
  );

  const requestAttribution = (
    attributionType: string,
    groupingDimension: string,
  ) => {
    if (isDetailsPending) {
      return;
    }
    setAttributionSelection({
      scopeKey: attributionScopeKey,
      attributionType,
      groupingDimension,
    });
  };

  useEffect(() => {
    if (isDetailsPending) {
      return;
    }
    const cachedResponse =
      attributionCacheRef.current.get(attributionKey) ?? null;
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
      ...riskWindowParams,
      asOfDate: riskAsOfDate,
      reportingCurrency: workspace.portfolio.base_currency,
      attributionType: selectedAttributionType,
      groupingDimension: selectedGroupingDimension,
    })
      .then((response) => {
        if (attributionRequestSequenceRef.current !== requestId) {
          return;
        }
        const currentResponse = requireCurrentPerformanceRiskSource(
          response,
          riskSourceIdentity,
        );
        attributionCacheRef.current.set(attributionKey, currentResponse);
        setRiskAttribution(currentResponse);
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
        setRiskAttribution(unavailableResponse);
        setIsAttributionLoading(false);
      });
  }, [
    attributionKey,
    detailBasis,
    isDetailsPending,
    period,
    riskWindowParams,
    selectedAttributionType,
    selectedGroupingDimension,
    riskAsOfDate,
    riskSourceIdentity,
    workspace.benchmark_code,
    workspace.portfolio.base_currency,
    workspace.portfolio.portfolio_id,
  ]);

  const requestDrawdownDetail = () => {
    if (isDetailsPending) {
      return;
    }
    const cachedDetail =
      drawdownDetailCacheRef.current.get(drawdownDetailKey) ?? null;
    if (cachedDetail) {
      setRiskDrawdownDetail(cachedDetail);
      return;
    }
    const requestId = drawdownDetailRequestSequenceRef.current + 1;
    drawdownDetailRequestSequenceRef.current = requestId;
    setIsDrawdownDetailLoading(true);
    void getWorkbenchRiskDrawdownClient(
      workspaceRef.current.portfolio.portfolio_id,
      {
        period,
        detailBasis,
        benchmark: workspaceRef.current.benchmark_code ?? undefined,
        ...getRiskWindowParams(workspaceRef.current, period),
        asOfDate: getRiskAsOfDate(workspaceRef.current),
        reportingCurrency: workspaceRef.current.portfolio.base_currency,
        includeUnderwaterSeries: true,
      },
    )
      .then((response) => {
        const currentResponse = requireCurrentPerformanceRiskSource(
          response,
          buildPerformanceRiskSourceIdentity(workspaceRef.current, period),
        );
        if (drawdownDetailRequestSequenceRef.current !== requestId) {
          return;
        }
        drawdownDetailCacheRef.current.set(drawdownDetailKey, currentResponse);
        setRiskDrawdownDetail(currentResponse);
        setIsDrawdownDetailLoading(false);
      })
      .catch((error: unknown) => {
        const unavailableResponse = buildUnavailableRiskDrawdown({
          workspace: workspaceRef.current,
          period,
          detailBasis,
          detail:
            error instanceof Error
              ? error.message
              : "Risk drawdown detail fetch failed.",
          includeUnderwaterSeries: true,
        });
        if (drawdownDetailRequestSequenceRef.current !== requestId) {
          return;
        }
        setRiskDrawdownDetail(unavailableResponse);
        setIsDrawdownDetailLoading(false);
      });
  };

  const requestRollingDetail = () => {
    if (isDetailsPending) {
      return;
    }
    const cachedDetail =
      rollingDetailCacheRef.current.get(rollingDetailKey) ?? null;
    if (cachedDetail) {
      setRiskRollingDetail(cachedDetail);
      return;
    }
    const requestId = rollingDetailRequestSequenceRef.current + 1;
    rollingDetailRequestSequenceRef.current = requestId;
    setIsRollingDetailLoading(true);
    void getWorkbenchRiskRollingClient(
      workspaceRef.current.portfolio.portfolio_id,
      {
        period,
        detailBasis,
        benchmark: workspaceRef.current.benchmark_code ?? undefined,
        ...getRiskWindowParams(workspaceRef.current, period),
        asOfDate: getRiskAsOfDate(workspaceRef.current),
        reportingCurrency: workspaceRef.current.portfolio.base_currency,
        includeTimeSeries: true,
      },
    )
      .then((response) => {
        const currentResponse = requireCurrentPerformanceRiskSource(
          response,
          buildPerformanceRiskSourceIdentity(workspaceRef.current, period),
        );
        if (rollingDetailRequestSequenceRef.current !== requestId) {
          return;
        }
        rollingDetailCacheRef.current.set(rollingDetailKey, currentResponse);
        setRiskRollingDetail(currentResponse);
        setIsRollingDetailLoading(false);
      })
      .catch((error: unknown) => {
        const unavailableResponse = buildUnavailableRiskRolling({
          workspace: workspaceRef.current,
          period,
          detailBasis,
          detail:
            error instanceof Error
              ? error.message
              : "Risk rolling detail fetch failed.",
          includeTimeSeries: true,
        });
        if (rollingDetailRequestSequenceRef.current !== requestId) {
          return;
        }
        setRiskRollingDetail(unavailableResponse);
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

function getRiskWindowParams(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
) {
  return period === "EXPLICIT"
    ? {
        reportStartDate: workspace.report_start_date,
        reportEndDate: workspace.report_end_date,
      }
    : {};
}

function getRiskAsOfDate(workspace: WorkbenchPerformanceWorkspace): string {
  return workspace.report_end_date?.trim() || workspace.as_of_date;
}

function buildPerformanceRiskSourceIdentity(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
): PerformanceRiskSourceIdentity {
  return {
    portfolioId: workspace.portfolio.portfolio_id,
    period,
    asOfDate: getRiskAsOfDate(workspace),
    benchmark: workspace.benchmark_code ?? null,
    ...getRiskWindowParams(workspace, period),
  };
}

function buildRiskFetchFailureDetail(error: unknown, label: string): string {
  if (isWorkbenchPermissionBlockedError(error)) {
    return `${label} is permission-blocked for this caller context.`;
  }
  return error instanceof Error ? error.message : `${label} fetch failed.`;
}
