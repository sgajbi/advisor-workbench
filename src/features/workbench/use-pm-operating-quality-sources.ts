"use client";

import { useEffect, useMemo } from "react";
import {
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  buildPmQualityActionError,
  readPmQualityFairnessAnalysisId,
  readPmQualityReviewActionId,
  type PmQualityActionError,
} from "@/features/workbench/pm-operating-quality-actions";
import {
  buildPmOperatingQualityListContext,
  pmOperatingQualityFairnessAnalysesQueryOptions,
  pmOperatingQualityFairnessAnalysisQueryOptions,
  pmOperatingQualityReviewActionsQueryOptions,
  pmOperatingQualityReviewActionQueryOptions,
  pmOperatingQualitySummaryInvocationsQueryOptions,
} from "@/features/workbench/pm-operating-quality-query-options";
import {
  pmOperatingQualityMutationKeys,
  pmOperatingQualityQueryKeys,
} from "@/features/workbench/pm-operating-quality-query-keys";
import {
  hasPmOperatingQualityFairnessAnalysis,
  hasPmOperatingQualityReviewAction,
} from "@/features/workbench/pm-operating-quality-view-model";
import type { DpmPmOperatingQualityGatewayResponse } from "@/features/workbench/types";

export type PmQualityPersistedRecord = {
  response: DpmPmOperatingQualityGatewayResponse;
  detail: DpmPmOperatingQualityGatewayResponse | null;
};

type UsePmOperatingQualitySourcesInput = {
  fairnessAnalyses: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetail: DpmPmOperatingQualityGatewayResponse | null;
  reviewActions: DpmPmOperatingQualityGatewayResponse | null;
  reviewActionDetail: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocations: DpmPmOperatingQualityGatewayResponse | null;
  selectedFairnessAnalysisId: string | null;
  selectedReviewActionId: string | null;
};

/**
 * The source-evidence half of the PM operating-quality workflow (#989): governed list
 * and selected-detail reads on the root Query client, server-provided evidence seeded
 * under the exact Query identities it answers for, and persisted-record retention read
 * from the mutation cache. Command lifecycles live with the actions hook; this module
 * owns only what the sources say.
 */
export function usePmOperatingQualitySources({
  fairnessAnalyses,
  fairnessAnalysisDetail,
  reviewActions,
  reviewActionDetail,
  summaryInvocations,
  selectedFairnessAnalysisId,
  selectedReviewActionId,
}: UsePmOperatingQualitySourcesInput) {
  const queryClient = useQueryClient();
  const listContext = useMemo(() => buildPmOperatingQualityListContext(), []);
  const fairnessListOptions = useMemo(
    () =>
      pmOperatingQualityFairnessAnalysesQueryOptions(
        listContext,
        fairnessAnalyses ?? undefined,
      ),
    [fairnessAnalyses, listContext],
  );
  const reviewActionListOptions = useMemo(
    () =>
      pmOperatingQualityReviewActionsQueryOptions(
        listContext,
        reviewActions ?? undefined,
      ),
    [listContext, reviewActions],
  );
  const summaryInvocationListOptions = useMemo(
    () =>
      pmOperatingQualitySummaryInvocationsQueryOptions(
        listContext,
        summaryInvocations ?? undefined,
      ),
    [listContext, summaryInvocations],
  );
  const fairnessListQuery = useQuery({
    ...fairnessListOptions,
    enabled: fairnessAnalyses !== null,
  });
  const reviewActionListQuery = useQuery({
    ...reviewActionListOptions,
    enabled: reviewActions !== null,
  });
  const summaryInvocationListQuery = useQuery({
    ...summaryInvocationListOptions,
    enabled: summaryInvocations !== null,
  });
  // Server-provided source evidence seeds the exact Query identities it answers for --
  // lists and selected details alike -- so re-selecting a record the server already
  // supplied never repays the source read.
  useEffect(() => {
    if (fairnessAnalyses) {
      queryClient.setQueryData(fairnessListOptions.queryKey, fairnessAnalyses);
    }
  }, [fairnessAnalyses, fairnessListOptions.queryKey, queryClient]);
  useEffect(() => {
    if (reviewActions) {
      queryClient.setQueryData(reviewActionListOptions.queryKey, reviewActions);
    }
  }, [queryClient, reviewActionListOptions.queryKey, reviewActions]);
  useEffect(() => {
    if (summaryInvocations) {
      queryClient.setQueryData(
        summaryInvocationListOptions.queryKey,
        summaryInvocations,
      );
    }
  }, [queryClient, summaryInvocationListOptions.queryKey, summaryInvocations]);
  useEffect(() => {
    const fairnessAnalysisId = fairnessAnalysisDetail
      ? readPmQualityFairnessAnalysisId(fairnessAnalysisDetail)
      : null;
    if (fairnessAnalysisDetail && fairnessAnalysisId) {
      queryClient.setQueryData(
        pmOperatingQualityQueryKeys.fairnessAnalysis(fairnessAnalysisId),
        fairnessAnalysisDetail,
      );
    }
  }, [fairnessAnalysisDetail, queryClient]);
  useEffect(() => {
    const reviewActionId = reviewActionDetail
      ? readPmQualityReviewActionId(reviewActionDetail)
      : null;
    if (reviewActionDetail && reviewActionId) {
      queryClient.setQueryData(
        pmOperatingQualityQueryKeys.reviewAction(reviewActionId),
        reviewActionDetail,
      );
    }
  }, [queryClient, reviewActionDetail]);
  const fairnessSource = preferCurrentServerSource(
    fairnessAnalyses,
    fairnessListQuery.data,
  );
  const reviewActionSource = preferCurrentServerSource(
    reviewActions,
    reviewActionListQuery.data,
  );
  const summaryInvocationSource = preferCurrentServerSource(
    summaryInvocations,
    summaryInvocationListQuery.data,
  );
  // One-shot retention handoff: once the canonical source has carried a persisted
  // record, its mutation leaves the cache -- retention never resurrects a record on a
  // stale or reverted list.
  useEffect(() => {
    releaseArrivedRecords(
      queryClient,
      pmOperatingQualityMutationKeys.fairnessCreate(),
      (response) => {
        const fairnessAnalysisId = readPmQualityFairnessAnalysisId(response);
        return Boolean(
          fairnessAnalysisId &&
            hasPmOperatingQualityFairnessAnalysis(fairnessSource, fairnessAnalysisId),
        );
      },
    );
    releaseArrivedRecords(
      queryClient,
      pmOperatingQualityMutationKeys.reviewActionCreate(),
      (response) => {
        const reviewActionId = readPmQualityReviewActionId(response);
        return Boolean(
          reviewActionId &&
            hasPmOperatingQualityReviewAction(reviewActionSource, reviewActionId),
        );
      },
    );
  }, [fairnessSource, queryClient, reviewActionSource]);
  // Persisted source records stay selectable until the canonical list carries them.
  // The mutation cache is the retention: every successful create is a record, and one
  // that has arrived in the refreshed source list stops being retained above.
  const persistedFairnessResults = useMutationState({
    filters: {
      mutationKey: pmOperatingQualityMutationKeys.fairnessCreate(),
      status: "success",
    },
    select: (mutation) => mutation.state.data as PmQualityPersistedRecord,
  });
  const persistedReviewActionResults = useMutationState({
    filters: {
      mutationKey: pmOperatingQualityMutationKeys.reviewActionCreate(),
      status: "success",
    },
    select: (mutation) => mutation.state.data as PmQualityPersistedRecord,
  });
  const retainedFairnessAnalysisResponses = persistedFairnessResults
    .map((result) => result.detail ?? result.response)
    .filter((response) => {
      const fairnessAnalysisId = readPmQualityFairnessAnalysisId(response);
      return Boolean(
        fairnessAnalysisId &&
          !hasPmOperatingQualityFairnessAnalysis(fairnessSource, fairnessAnalysisId),
      );
    });
  const retainedReviewActionResponses = persistedReviewActionResults
    .map((result) => result.detail ?? result.response)
    .filter((response) => {
      const reviewActionId = readPmQualityReviewActionId(response);
      return Boolean(
        reviewActionId &&
          !hasPmOperatingQualityReviewAction(reviewActionSource, reviewActionId),
      );
    });
  const fairnessDetailOptions = useMemo(
    () =>
      pmOperatingQualityFairnessAnalysisQueryOptions(
        selectedFairnessAnalysisId ?? "",
        selectedFairnessAnalysisId &&
          fairnessAnalysisDetail &&
          readPmQualityFairnessAnalysisId(fairnessAnalysisDetail) ===
            selectedFairnessAnalysisId
          ? fairnessAnalysisDetail
          : undefined,
      ),
    [fairnessAnalysisDetail, selectedFairnessAnalysisId],
  );
  const reviewActionDetailOptions = useMemo(
    () =>
      pmOperatingQualityReviewActionQueryOptions(
        selectedReviewActionId ?? "",
        selectedReviewActionId &&
          reviewActionDetail &&
          readPmQualityReviewActionId(reviewActionDetail) === selectedReviewActionId
          ? reviewActionDetail
          : undefined,
      ),
    [reviewActionDetail, selectedReviewActionId],
  );
  const selectedFairnessDetailQuery = useQuery({
    ...fairnessDetailOptions,
    enabled: Boolean(selectedFairnessAnalysisId),
  });
  const selectedReviewActionDetailQuery = useQuery({
    ...reviewActionDetailOptions,
    enabled: Boolean(selectedReviewActionId),
  });
  const selectedDetailError: PmQualityActionError | null =
    selectedFairnessDetailQuery.error
      ? buildPmQualityActionError(
          selectedFairnessDetailQuery.error,
          "PM operating quality fairness detail load failed",
        )
      : selectedReviewActionDetailQuery.error
        ? buildPmQualityActionError(
            selectedReviewActionDetailQuery.error,
            "PM operating quality review-action detail load failed",
          )
        : null;

  return {
    fairnessListQueryKey: fairnessListOptions.queryKey,
    reviewActionListQueryKey: reviewActionListOptions.queryKey,
    summaryInvocationListQueryKey: summaryInvocationListOptions.queryKey,
    fairnessSource,
    reviewActionSource,
    summaryInvocationSource,
    retainedFairnessAnalysisResponses,
    retainedReviewActionResponses,
    selectedFairnessDetailResponse: selectedFairnessDetailQuery.data ?? null,
    selectedReviewActionDetailResponse: selectedReviewActionDetailQuery.data ?? null,
    fairnessDetailFetching: selectedFairnessDetailQuery.isFetching,
    reviewActionDetailFetching: selectedReviewActionDetailQuery.isFetching,
    selectedDetailError,
  };
}

function releaseArrivedRecords(
  queryClient: QueryClient,
  mutationKey: readonly unknown[],
  hasArrived: (response: DpmPmOperatingQualityGatewayResponse) => boolean,
): void {
  const cache = queryClient.getMutationCache();
  for (const mutation of cache.findAll({
    mutationKey: mutationKey as unknown[],
    status: "success",
  })) {
    const data = mutation.state.data as PmQualityPersistedRecord;
    if (hasArrived(data.detail ?? data.response)) {
      cache.remove(mutation);
    }
  }
}

function preferCurrentServerSource(
  serverSource: DpmPmOperatingQualityGatewayResponse | null,
  querySource: DpmPmOperatingQualityGatewayResponse | undefined,
): DpmPmOperatingQualityGatewayResponse | null {
  if (
    serverSource &&
    serverSource.correlation_id !== querySource?.correlation_id
  ) {
    return serverSource;
  }
  return querySource ?? serverSource;
}
