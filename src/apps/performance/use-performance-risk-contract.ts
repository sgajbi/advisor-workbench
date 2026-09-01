"use client";

import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api";
import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchRiskAttributionResponse,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskRollingResponse,
  WorkbenchRiskSummaryResponse,
} from "@/features/workbench/types";

import {
  getPerformanceRiskSourceState,
  performanceRiskAttributionQueryOptions,
  performanceRiskConcentrationQueryOptions,
  performanceRiskDrawdownQueryOptions,
  performanceRiskRollingQueryOptions,
  performanceRiskSummaryQueryOptions,
} from "./performance-risk-query-options";
import {
  buildPerformanceRiskQueryContext,
  performanceRiskQueryKeys,
} from "./performance-risk-query-keys";
import {
  buildUnavailableRiskAttribution,
  buildUnavailableRiskConcentration,
  buildUnavailableRiskDrawdown,
  buildUnavailableRiskRolling,
  buildUnavailableRiskSummary,
} from "./risk-workspace-view-model";

type PerformanceRiskResponse =
  | WorkbenchRiskSummaryResponse
  | WorkbenchRiskConcentrationResponse
  | WorkbenchRiskAttributionResponse
  | WorkbenchRiskDrawdownResponse
  | WorkbenchRiskRollingResponse;

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

type RiskQueryResult<Response> = {
  data: Response | undefined;
  error: Error | null;
  isFetching: boolean;
  isPending: boolean;
  isStale: boolean;
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
  const queryClient = useQueryClient();
  const context = useMemo(
    () => buildPerformanceRiskQueryContext(workspace, period),
    [period, workspace],
  );
  const queriesEnabled = !isDetailsPending;
  const attributionScopeKey = hashKey([
    ...performanceRiskQueryKeys.review(context),
    detailBasis,
  ]);
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

  const summaryQuery = useQuery({
    ...performanceRiskSummaryQueryOptions(context, detailBasis),
    enabled: queriesEnabled,
  });
  const concentrationQuery = useQuery({
    ...performanceRiskConcentrationQueryOptions(context),
    enabled: queriesEnabled,
  });
  const drawdownQuery = useQuery({
    ...performanceRiskDrawdownQueryOptions(context, detailBasis, false),
    enabled: queriesEnabled,
  });
  const rollingQuery = useQuery({
    ...performanceRiskRollingQueryOptions(context, detailBasis, false),
    enabled: queriesEnabled,
  });
  const attributionQuery = useQuery({
    ...performanceRiskAttributionQueryOptions(
      context,
      detailBasis,
      selectedAttributionType,
      selectedGroupingDimension,
    ),
    enabled: queriesEnabled,
  });
  const drawdownDetailOptions = performanceRiskDrawdownQueryOptions(
    context,
    detailBasis,
    true,
  );
  const drawdownDetailQuery = useQuery({
    ...drawdownDetailOptions,
    enabled: false,
  });
  const rollingDetailOptions = performanceRiskRollingQueryOptions(
    context,
    detailBasis,
    true,
  );
  const rollingDetailQuery = useQuery({
    ...rollingDetailOptions,
    enabled: false,
  });

  const riskSummary = currentRiskResponse(
    summaryQuery,
    isDetailsPending,
    (error) =>
      buildUnavailableRiskSummary({
        workspace,
        period,
        detailBasis,
        detail: buildRiskFetchFailureDetail(error, "Risk summary"),
        permissionBlocked: isWorkbenchPermissionBlockedError(error),
      }),
  );
  const riskConcentration = currentRiskResponse(
    concentrationQuery,
    isDetailsPending,
    (error) =>
      buildUnavailableRiskConcentration({
        workspace,
        period,
        detail: buildRiskFetchFailureDetail(error, "Risk concentration"),
        permissionBlocked: isWorkbenchPermissionBlockedError(error),
      }),
  );
  const riskDrawdown = currentRiskResponse(
    drawdownQuery,
    isDetailsPending,
    (error) =>
      buildUnavailableRiskDrawdown({
        workspace,
        period,
        detailBasis,
        detail: buildRiskFetchFailureDetail(error, "Risk drawdown"),
        includeUnderwaterSeries: false,
        permissionBlocked: isWorkbenchPermissionBlockedError(error),
      }),
  );
  const riskRolling = currentRiskResponse(
    rollingQuery,
    isDetailsPending,
    (error) =>
      buildUnavailableRiskRolling({
        workspace,
        period,
        detailBasis,
        detail: buildRiskFetchFailureDetail(error, "Risk rolling"),
        includeTimeSeries: false,
        permissionBlocked: isWorkbenchPermissionBlockedError(error),
      }),
  );
  const riskAttribution = currentRiskResponse(
    attributionQuery,
    isDetailsPending,
    (error) =>
      buildUnavailableRiskAttribution({
        workspace,
        period,
        detailBasis,
        detail: buildRiskFetchFailureDetail(error, "Risk attribution"),
      }),
  );
  const riskDrawdownDetail = currentRiskResponse(
    drawdownDetailQuery,
    isDetailsPending,
    (error) =>
      buildUnavailableRiskDrawdown({
        workspace,
        period,
        detailBasis,
        detail: buildRiskFetchFailureDetail(error, "Risk drawdown detail"),
        includeUnderwaterSeries: true,
        permissionBlocked: isWorkbenchPermissionBlockedError(error),
      }),
  );
  const riskRollingDetail = currentRiskResponse(
    rollingDetailQuery,
    isDetailsPending,
    (error) =>
      buildUnavailableRiskRolling({
        workspace,
        period,
        detailBasis,
        detail: buildRiskFetchFailureDetail(error, "Risk rolling detail"),
        includeTimeSeries: true,
        permissionBlocked: isWorkbenchPermissionBlockedError(error),
      }),
  );

  const requestAttribution = (
    attributionType: string,
    groupingDimension: string,
  ) => {
    if (!isDetailsPending) {
      setAttributionSelection({
        scopeKey: attributionScopeKey,
        attributionType,
        groupingDimension,
      });
    }
  };
  const requestDrawdownDetail = () => {
    if (!isDetailsPending) {
      void queryClient.fetchQuery(drawdownDetailOptions).catch(() => undefined);
    }
  };
  const requestRollingDetail = () => {
    if (!isDetailsPending) {
      void queryClient.fetchQuery(rollingDetailOptions).catch(() => undefined);
    }
  };

  return {
    riskSummary,
    riskConcentration,
    riskAttribution,
    riskDrawdown,
    riskDrawdownDetail,
    riskRolling,
    riskRollingDetail,
    isLoading:
      isDetailsPending ||
      isQueryAwaitingCurrentSource(summaryQuery) ||
      isQueryAwaitingCurrentSource(concentrationQuery) ||
      isQueryAwaitingCurrentSource(drawdownQuery) ||
      isQueryAwaitingCurrentSource(rollingQuery),
    isAttributionLoading:
      isDetailsPending || isQueryAwaitingCurrentSource(attributionQuery),
    isDrawdownDetailLoading: drawdownDetailQuery.isFetching,
    isRollingDetailLoading: rollingDetailQuery.isFetching,
    requestAttribution,
    requestDrawdownDetail,
    requestRollingDetail,
  };
}

function currentRiskResponse<Response extends PerformanceRiskResponse>(
  query: RiskQueryResult<Response>,
  isDetailsPending: boolean,
  buildUnavailable: (error: unknown) => Response,
): Response | null {
  if (isDetailsPending) {
    return null;
  }
  if (query.error) {
    return (
      getPerformanceRiskSourceState<Response>(query.error) ??
      buildUnavailable(query.error)
    );
  }
  return isQueryAwaitingCurrentSource(query) ? null : (query.data ?? null);
}

function isQueryAwaitingCurrentSource<Response>(
  query: RiskQueryResult<Response>,
): boolean {
  return query.isPending || (query.isFetching && query.isStale);
}

function buildRiskFetchFailureDetail(error: unknown, label: string): string {
  if (isWorkbenchPermissionBlockedError(error)) {
    return `${label} is permission-blocked for this caller context.`;
  }
  return error instanceof Error ? error.message : `${label} fetch failed.`;
}
