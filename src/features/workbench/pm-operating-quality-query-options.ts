import { queryOptions } from "@tanstack/react-query";

import { resolveDefaultDpmContext } from "@/features/workbench/caller-context";
import {
  getDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityReviewAction,
  getDpmPmOperatingQualitySummaryInvocation,
  listDpmPmOperatingQualityFairnessAnalyses,
  listDpmPmOperatingQualityReviewActions,
  listDpmPmOperatingQualitySummaryInvocations,
} from "@/features/workbench/pm-operating-quality-api";
import {
  pmOperatingQualityQueryKeys,
  type PmOperatingQualityListContext,
} from "@/features/workbench/pm-operating-quality-query-keys";
import type { DpmPmOperatingQualityGatewayResponse } from "@/features/workbench/types";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

export const PM_OPERATING_QUALITY_LIST_LIMIT = 10;

export function buildPmOperatingQualityListContext(): PmOperatingQualityListContext {
  const dpmContext = resolveDefaultDpmContext();
  return {
    asOfDate: dpmContext.commandCenterAsOfDate,
    limit: PM_OPERATING_QUALITY_LIST_LIMIT,
    offset: 0,
  };
}

export function pmOperatingQualityFairnessAnalysesQueryOptions(
  context: PmOperatingQualityListContext,
  initialData?: DpmPmOperatingQualityGatewayResponse,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: pmOperatingQualityQueryKeys.fairnessAnalyses(context),
    queryFn: async () =>
      await listDpmPmOperatingQualityFairnessAnalyses(context, "client"),
    initialData,
  });
}

export function pmOperatingQualityReviewActionsQueryOptions(
  context: PmOperatingQualityListContext,
  initialData?: DpmPmOperatingQualityGatewayResponse,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: pmOperatingQualityQueryKeys.reviewActions(context),
    queryFn: async () =>
      await listDpmPmOperatingQualityReviewActions(context, "client"),
    initialData,
  });
}

export function pmOperatingQualitySummaryInvocationsQueryOptions(
  context: PmOperatingQualityListContext,
  initialData?: DpmPmOperatingQualityGatewayResponse,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: pmOperatingQualityQueryKeys.summaryInvocations(context),
    queryFn: async () =>
      await listDpmPmOperatingQualitySummaryInvocations(context, "client"),
    initialData,
  });
}

export function pmOperatingQualityFairnessAnalysisQueryOptions(
  fairnessAnalysisId: string,
  initialData?: DpmPmOperatingQualityGatewayResponse,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: pmOperatingQualityQueryKeys.fairnessAnalysis(fairnessAnalysisId),
    queryFn: async () =>
      await getDpmPmOperatingQualityFairnessAnalysis(fairnessAnalysisId, "client"),
    initialData,
  });
}

export function pmOperatingQualityReviewActionQueryOptions(
  reviewActionId: string,
  initialData?: DpmPmOperatingQualityGatewayResponse,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: pmOperatingQualityQueryKeys.reviewAction(reviewActionId),
    queryFn: async () =>
      await getDpmPmOperatingQualityReviewAction(reviewActionId, "client"),
    initialData,
  });
}

export function pmOperatingQualitySummaryInvocationQueryOptions(
  summaryInvocationId: string,
  initialData?: DpmPmOperatingQualityGatewayResponse,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: pmOperatingQualityQueryKeys.summaryInvocation(summaryInvocationId),
    queryFn: async () =>
      await getDpmPmOperatingQualitySummaryInvocation(summaryInvocationId, "client"),
    initialData,
  });
}
