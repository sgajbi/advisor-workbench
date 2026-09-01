import { queryOptions } from "@tanstack/react-query";

import {
  getWorkbenchRiskAttributionClient,
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskDrawdownClient,
  getWorkbenchRiskRollingClient,
  getWorkbenchRiskSummaryClient,
} from "@/features/workbench/api";
import type {
  WorkbenchRiskAttributionResponse,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskModuleState,
  WorkbenchRiskRollingResponse,
  WorkbenchRiskSummaryResponse,
} from "@/features/workbench/types";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import {
  performanceRiskQueryKeys,
  type PerformanceRiskQueryContext,
} from "./performance-risk-query-keys";
import {
  requireCurrentPerformanceRiskSource,
  type PerformanceRiskSourceIdentity,
} from "./performance-risk-source-identity";

type PerformanceRiskResponse =
  | WorkbenchRiskSummaryResponse
  | WorkbenchRiskConcentrationResponse
  | WorkbenchRiskAttributionResponse
  | WorkbenchRiskDrawdownResponse
  | WorkbenchRiskRollingResponse;

class PerformanceRiskSourceStateError extends Error {
  readonly response: PerformanceRiskResponse;

  constructor(response: PerformanceRiskResponse) {
    super("Risk source returned a non-reusable evidence state.");
    this.name = "PerformanceRiskSourceStateError";
    this.response = response;
  }
}

export function performanceRiskSummaryQueryOptions(
  context: PerformanceRiskQueryContext,
  detailBasis: string,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: performanceRiskQueryKeys.riskSummary(context, detailBasis),
    queryFn: async () =>
      admitPerformanceRiskResponse(
        await getWorkbenchRiskSummaryClient(context.portfolioId, {
          ...buildRiskRequest(context),
          detailBasis,
        }),
        buildRiskIdentity(context, { detailBasis }),
      ),
  });
}

export function performanceRiskConcentrationQueryOptions(
  context: PerformanceRiskQueryContext,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: performanceRiskQueryKeys.concentration(context),
    queryFn: async () =>
      admitPerformanceRiskResponse(
        await getWorkbenchRiskConcentrationClient(
          context.portfolioId,
          buildRiskRequest(context),
        ),
        buildRiskIdentity(context, { windowEvidence: "point_in_time" }),
      ),
  });
}

export function performanceRiskDrawdownQueryOptions(
  context: PerformanceRiskQueryContext,
  detailBasis: string,
  includeUnderwaterSeries: boolean,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: performanceRiskQueryKeys.drawdown(
      context,
      detailBasis,
      includeUnderwaterSeries,
    ),
    queryFn: async () =>
      admitPerformanceRiskResponse(
        await getWorkbenchRiskDrawdownClient(context.portfolioId, {
          ...buildRiskRequest(context),
          detailBasis,
          includeUnderwaterSeries,
        }),
        buildRiskIdentity(context, {
          detailBasis,
          includeUnderwaterSeries,
        }),
      ),
  });
}

export function performanceRiskRollingQueryOptions(
  context: PerformanceRiskQueryContext,
  detailBasis: string,
  includeTimeSeries: boolean,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: performanceRiskQueryKeys.rolling(
      context,
      detailBasis,
      includeTimeSeries,
    ),
    queryFn: async () =>
      admitPerformanceRiskResponse(
        await getWorkbenchRiskRollingClient(context.portfolioId, {
          ...buildRiskRequest(context),
          detailBasis,
          includeTimeSeries,
        }),
        buildRiskIdentity(context, { detailBasis, includeTimeSeries }),
      ),
  });
}

export function performanceRiskAttributionQueryOptions(
  context: PerformanceRiskQueryContext,
  detailBasis: string,
  attributionType: string,
  groupingDimension: string,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: performanceRiskQueryKeys.attribution(
      context,
      detailBasis,
      attributionType,
      groupingDimension,
    ),
    queryFn: async () =>
      admitPerformanceRiskResponse(
        await getWorkbenchRiskAttributionClient(context.portfolioId, {
          ...buildRiskRequest(context),
          detailBasis,
          attributionType,
          groupingDimension,
        }),
        buildRiskIdentity(context, {
          detailBasis,
          attributionType,
          groupingDimension,
        }),
      ),
  });
}

export function getPerformanceRiskSourceState<
  Response extends PerformanceRiskResponse,
>(error: unknown): Response | null {
  return error instanceof PerformanceRiskSourceStateError
    ? (error.response as Response)
    : null;
}

function buildRiskRequest(context: PerformanceRiskQueryContext) {
  return {
    period: context.period,
    benchmark: context.benchmark ?? undefined,
    reportStartDate: context.reportStartDate ?? undefined,
    reportEndDate: context.reportEndDate ?? undefined,
    asOfDate: context.asOfDate,
    reportingCurrency: context.reportingCurrency,
  };
}

function buildRiskIdentity(
  context: PerformanceRiskQueryContext,
  options: {
    detailBasis?: string;
    includeUnderwaterSeries?: boolean;
    includeTimeSeries?: boolean;
    attributionType?: string;
    groupingDimension?: string;
    windowEvidence?: "periods" | "point_in_time";
  } = {},
): PerformanceRiskSourceIdentity {
  return {
    portfolioId: context.portfolioId,
    period: context.period,
    detailBasis: options.detailBasis,
    asOfDate: context.asOfDate,
    benchmark: context.benchmark,
    reportStartDate: context.reportStartDate ?? undefined,
    reportEndDate: context.reportEndDate ?? undefined,
    attributionType: options.attributionType,
    groupingDimension: options.groupingDimension,
    includeUnderwaterSeries: options.includeUnderwaterSeries,
    includeTimeSeries: options.includeTimeSeries,
    windowEvidence: options.windowEvidence,
  };
}

function admitPerformanceRiskResponse<Response extends PerformanceRiskResponse>(
  response: Response,
  identity: PerformanceRiskSourceIdentity,
): Response {
  const currentResponse = requireCurrentPerformanceRiskSource(
    response,
    identity,
  );
  if (!isReusablePerformanceRiskResponse(currentResponse)) {
    throw new PerformanceRiskSourceStateError(currentResponse);
  }
  return currentResponse;
}

function isReusablePerformanceRiskResponse(response: {
  state: WorkbenchRiskModuleState;
  payload: unknown;
}): boolean {
  return (
    (response.state === "ready" || response.state === "partial") &&
    response.payload !== null
  );
}
