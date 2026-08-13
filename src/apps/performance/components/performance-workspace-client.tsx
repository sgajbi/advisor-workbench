"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getWorkbenchPerformanceWorkspaceDetailsClient,
  getWorkbenchPerformanceWorkspaceSummaryClient,
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api";
import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from "@/features/workbench/types";

import { buildPerformanceHref } from "../navigation";
import type { PerformanceWorkspaceMode } from "../performance-workspace-modes";
import { assemblePerformanceWorkspace } from "../workspace-assembler";
import { getNormalizedInitialPerformanceDetailControls } from "../performance-detail-control-resolution";
import PerformanceWorkspaceView from "./performance-workspace-view";
import type {
  PerformanceWorkspaceLoadIssue,
  PerformanceWorkspaceRefreshStatus,
} from "./performance-workspace-types";

type PerformanceWorkspaceClientProps = {
  initialSummary: WorkbenchPerformanceWorkspaceSummary | null;
  initialDetails?: WorkbenchPerformanceWorkspaceDetails | null;
  initialLoadIssue?: PerformanceWorkspaceLoadIssue | null;
  initialPortfolioId: string | null;
  initialPeriod: string;
  initialDetailBasis: string;
  initialContributionDimension: string;
  initialAttributionDimension: string;
  initialChartFrequency: string;
  initialMode?: PerformanceWorkspaceMode;
  initialBenchmark?: string;
};

type PerformanceControlState = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

type PerformanceDetailsStatus = "idle" | "loading" | "ready" | "failed";

type PerformanceRefreshScope = "summary" | "details";

type PerformancePendingRefresh = {
  scope: PerformanceRefreshScope;
  requestedControls: PerformanceControlState;
  confirmedControls: PerformanceControlState;
};

type PerformanceRefreshFailure = PerformancePendingRefresh & {
  status?: number;
};

type ResolvedPerformanceDetails = {
  details: WorkbenchPerformanceWorkspaceDetails;
  controls: PerformanceControlState;
};

export default function PerformanceWorkspaceClient({
  initialSummary,
  initialDetails,
  initialLoadIssue,
  initialPortfolioId,
  initialPeriod,
  initialDetailBasis,
  initialContributionDimension,
  initialAttributionDimension,
  initialChartFrequency,
  initialMode = "summary",
  initialBenchmark,
}: PerformanceWorkspaceClientProps) {
  const router = useRouter();
  const initialControls = useMemo<PerformanceControlState | null>(
    () =>
      initialPortfolioId
        ? resolveInitialControls({
            initialPortfolioId,
            initialPeriod,
            initialDetailBasis,
            initialContributionDimension,
            initialAttributionDimension,
            initialChartFrequency,
            initialBenchmark,
            initialSummary,
            initialDetails,
          })
        : null,
    [
      initialAttributionDimension,
      initialBenchmark,
      initialChartFrequency,
      initialContributionDimension,
      initialDetailBasis,
      initialDetails,
      initialPeriod,
      initialPortfolioId,
      initialSummary,
    ]
  );
  const initialSummaryKey = useMemo(
    () =>
      initialControls
        ? buildSummaryCacheKey({
            portfolioId: initialControls.portfolioId,
            period: initialControls.period,
            detailBasis: initialControls.detailBasis,
            chartFrequency: initialControls.chartFrequency,
            benchmark: initialControls.benchmark,
            reportStartDate: initialControls.reportStartDate,
            reportEndDate: initialControls.reportEndDate,
          })
        : null,
    [
      initialControls,
    ]
  );

  const [summary, setSummary] = useState<WorkbenchPerformanceWorkspaceSummary | null>(
    initialSummary
  );
  const [loadIssue, setLoadIssue] = useState<PerformanceWorkspaceLoadIssue | null>(
    initialSummary ? null : initialLoadIssue ?? null
  );
  const [details, setDetails] = useState<WorkbenchPerformanceWorkspaceDetails | null>(
    initialDetails ?? null
  );
  const [mode, setMode] = useState<PerformanceWorkspaceMode>(initialMode);
  const modeRef = useRef<PerformanceWorkspaceMode>(initialMode);
  const [controls, setControls] = useState<PerformanceControlState | null>(
    initialControls
  );
  const [pendingRefresh, setPendingRefresh] = useState<PerformancePendingRefresh | null>(null);
  const [refreshFailure, setRefreshFailure] = useState<PerformanceRefreshFailure | null>(null);
  const [refreshConfirmation, setRefreshConfirmation] = useState<PerformancePendingRefresh | null>(
    null
  );
  const requestSequenceRef = useRef(0);
  const initialDetailsRequestedRef = useRef(false);

  const initialDetailsKey = useMemo(
    () => (initialControls && initialDetails ? buildDetailsCacheKey(initialControls) : null),
    [
      initialDetails,
      initialControls,
    ]
  );
  const [detailsStatus, setDetailsStatus] = useState<PerformanceDetailsStatus>(
    initialDetails ? "ready" : initialSummary ? "idle" : "failed"
  );

  const summaryCacheRef = useRef<Map<string, WorkbenchPerformanceWorkspaceSummary | null>>(
    initialSummaryKey ? new Map([[initialSummaryKey, initialSummary]]) : new Map()
  );
  const detailsCacheRef = useRef<Map<string, WorkbenchPerformanceWorkspaceDetails>>(
    initialDetailsKey && initialDetails ? new Map([[initialDetailsKey, initialDetails]]) : new Map()
  );

  const workspace = useMemo<WorkbenchPerformanceWorkspace | null>(() => {
    if (!summary) {
      return null;
    }
    return assemblePerformanceWorkspace(summary, details);
  }, [details, summary]);
  const isUpdating = pendingRefresh !== null;
  const isDetailsPending =
    Boolean(summary) &&
    (pendingRefresh !== null || detailsStatus === "idle" || detailsStatus === "loading");
  const refreshStatus = buildRefreshStatus(
    pendingRefresh,
    refreshFailure,
    refreshConfirmation
  );

  useEffect(() => {
    if (!initialControls || !initialPortfolioId) {
      return;
    }
    const requestedControls: PerformanceControlState = {
      portfolioId: initialPortfolioId,
      period: initialPeriod,
      detailBasis: initialDetailBasis,
      contributionDimension: initialContributionDimension,
      attributionDimension: initialAttributionDimension,
      chartFrequency: initialChartFrequency,
      benchmark: initialBenchmark,
      reportStartDate: initialSummary?.report_start_date,
      reportEndDate: initialSummary?.report_end_date,
    };
    if (
      buildPerformanceHref(requestedControls) === buildPerformanceHref(initialControls)
    ) {
      return;
    }
    startTransition(() => {
      router.replace(buildPerformanceHref({ ...initialControls, mode }), { scroll: false });
    });
  }, [
    initialAttributionDimension,
    initialBenchmark,
    initialChartFrequency,
    initialContributionDimension,
    initialControls,
    initialDetailBasis,
    initialPeriod,
    initialPortfolioId,
    initialSummary?.report_end_date,
    initialSummary?.report_start_date,
    mode,
    router,
  ]);

  const resolveDetailsForControls = useCallback(async (
    nextControls: PerformanceControlState,
    options: { allowInitialFallback?: boolean } = {}
  ): Promise<ResolvedPerformanceDetails> => {
    const detailsKey = buildDetailsCacheKey(nextControls);
    const cachedDetails = detailsCacheRef.current.get(detailsKey);
    if (cachedDetails !== undefined) {
      return {
        details: cachedDetails,
        controls: nextControls,
      };
    }

    let resolvedDetails = await getWorkbenchPerformanceWorkspaceDetailsClient(
      nextControls.portfolioId,
      buildDetailsRequest(nextControls)
    );
    let resolvedControls = buildResolvedDetailControls(nextControls, resolvedDetails);

    if (options.allowInitialFallback) {
      const normalizedInitialControls = getNormalizedInitialPerformanceDetailControls(
        resolvedDetails,
        {
          contributionDimension: nextControls.contributionDimension,
          attributionDimension: nextControls.attributionDimension,
        }
      );
      const requiresInitialFallback =
        normalizedInitialControls.contributionDimension !==
          resolvedDetails.contribution_dimension ||
        normalizedInitialControls.attributionDimension !==
          resolvedDetails.attribution_dimension;

      if (requiresInitialFallback) {
        resolvedControls = {
          ...resolvedControls,
          contributionDimension: normalizedInitialControls.contributionDimension,
          attributionDimension: normalizedInitialControls.attributionDimension,
        };
        const normalizedDetailsKey = buildDetailsCacheKey(resolvedControls);
        const cachedNormalizedDetails = detailsCacheRef.current.get(normalizedDetailsKey);
        resolvedDetails =
          cachedNormalizedDetails ??
          (await getWorkbenchPerformanceWorkspaceDetailsClient(
            resolvedControls.portfolioId,
            buildDetailsRequest(resolvedControls)
          ));
      }
    }

    const resolvedDetailsKey = buildDetailsCacheKey(resolvedControls);
    detailsCacheRef.current.set(resolvedDetailsKey, resolvedDetails);
    return {
      details: resolvedDetails,
      controls: resolvedControls,
    };
  }, []);

  async function handleRequestChange(patch: Partial<PerformanceControlState>) {
    if (!controls) {
      return;
    }
    const nextControls = applyPerformanceControlPatch(controls, patch);
    const sameSummary = buildSummaryCacheKey(nextControls) === buildSummaryCacheKey(controls);
    const sameDetails = buildDetailsCacheKey(nextControls) === buildDetailsCacheKey(controls);
    if (pendingRefresh) {
      const repeatsPendingRequest =
        buildSummaryCacheKey(nextControls) ===
          buildSummaryCacheKey(pendingRefresh.requestedControls) &&
        buildDetailsCacheKey(nextControls) ===
          buildDetailsCacheKey(pendingRefresh.requestedControls);
      if (repeatsPendingRequest) {
        return;
      }
      if (sameSummary && sameDetails) {
        requestSequenceRef.current += 1;
        setPendingRefresh(null);
        setRefreshFailure(null);
        setRefreshConfirmation(null);
        return;
      }
    }
    if (sameSummary && sameDetails && detailsStatus === "ready" && !refreshFailure) {
      return;
    }

    await runRefresh(nextControls, controls);
  }

  async function runRefresh(
    requestedControls: PerformanceControlState,
    confirmedControls: PerformanceControlState
  ) {
    const refreshesSummary = shouldRefreshSummary(confirmedControls, requestedControls);
    const initialScope: PerformanceRefreshScope = refreshesSummary ? "summary" : "details";
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    setRefreshFailure(null);
    setRefreshConfirmation(null);
    setPendingRefresh({
      scope: initialScope,
      requestedControls,
      confirmedControls,
    });

    let failureScope = initialScope;
    try {
      let resolvedSummary = summary;
      let detailRequestControls = requestedControls;

      if (refreshesSummary) {
        const summaryKey = buildSummaryCacheKey(requestedControls);
        const cachedSummary = summaryCacheRef.current.get(summaryKey) ?? null;
        resolvedSummary =
          cachedSummary ??
          (await getWorkbenchPerformanceWorkspaceSummaryClient(
            requestedControls.portfolioId,
            buildSummaryRequest(requestedControls)
          ));
        summaryCacheRef.current.set(summaryKey, resolvedSummary);
        detailRequestControls = buildResolvedSummaryControls(requestedControls, resolvedSummary);
      }

      if (!resolvedSummary) {
        throw new Error("Performance summary is unavailable for the selected controls.");
      }

      failureScope = "details";
      const resolvedDetails = await resolveDetailsForControls(detailRequestControls);
      if (requestSequenceRef.current !== requestId) {
        return;
      }

      setSummary(resolvedSummary);
      setDetails(resolvedDetails.details);
      setDetailsStatus("ready");
      setControls(resolvedDetails.controls);
      setLoadIssue(null);
      setRefreshFailure(null);
      setRefreshConfirmation({
        scope: initialScope,
        requestedControls,
        confirmedControls: resolvedDetails.controls,
      });
      startTransition(() => {
        router.replace(buildPerformanceHref({ ...resolvedDetails.controls, mode: modeRef.current }), {
          scroll: false,
        });
      });
    } catch (error) {
      if (requestSequenceRef.current !== requestId) {
        return;
      }

      if (isWorkbenchPermissionBlockedError(error)) {
        setSummary(null);
        setDetails(null);
        setDetailsStatus("failed");
        setRefreshFailure(null);
        setLoadIssue({
          state: "permission_blocked",
          status: getWorkbenchApiErrorStatus(error) ?? undefined,
        });
      } else {
        if (!details) {
          setDetailsStatus("failed");
        }
        setRefreshFailure({
          scope: failureScope,
          requestedControls,
          confirmedControls,
          status: getWorkbenchApiErrorStatus(error) ?? undefined,
        });
      }
    } finally {
      if (requestSequenceRef.current === requestId) {
        setPendingRefresh(null);
      }
    }
  }

  useEffect(() => {
    if (!controls || !summary || details || initialDetailsRequestedRef.current) {
      return;
    }

    initialDetailsRequestedRef.current = true;
    const requestId = requestSequenceRef.current;
    setDetailsStatus("loading");
    void resolveDetailsForControls(controls, { allowInitialFallback: true })
      .then((resolvedDetails) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        setDetails(resolvedDetails.details);
        setDetailsStatus("ready");
        setControls(resolvedDetails.controls);
        if (buildPerformanceHref(resolvedDetails.controls) !== buildPerformanceHref(controls)) {
          startTransition(() => {
            router.replace(
              buildPerformanceHref({ ...resolvedDetails.controls, mode: modeRef.current }),
              {
                scroll: false,
              }
            );
          });
        }
      })
      .catch((error: unknown) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        if (isWorkbenchPermissionBlockedError(error)) {
          setSummary(null);
          setDetails(null);
          setDetailsStatus("failed");
          setLoadIssue({
            state: "permission_blocked",
            status: getWorkbenchApiErrorStatus(error) ?? undefined,
          });
          return;
        }
        setDetailsStatus("failed");
        setRefreshFailure({
          scope: "details",
          requestedControls: controls,
          confirmedControls: controls,
          status: getWorkbenchApiErrorStatus(error) ?? undefined,
        });
      });
  }, [controls, details, mode, resolveDetailsForControls, router, summary]);

  return (
    <PerformanceWorkspaceView
      workspace={workspace}
      loadIssue={loadIssue}
      refreshStatus={refreshStatus}
      mode={mode}
      period={controls?.period ?? initialPeriod}
      detailBasis={controls?.detailBasis ?? initialDetailBasis}
      contributionDimension={controls?.contributionDimension ?? initialContributionDimension}
      attributionDimension={controls?.attributionDimension ?? initialAttributionDimension}
      chartFrequency={controls?.chartFrequency ?? initialChartFrequency}
      benchmark={controls?.benchmark}
      onModeChange={(nextMode) => {
        setRefreshConfirmation(null);
        modeRef.current = nextMode;
        setMode(nextMode);
        if (!controls) {
          return;
        }
        startTransition(() => {
          router.replace(buildPerformanceHref({ ...controls, mode: nextMode }), {
            scroll: false,
          });
        });
      }}
      onRequestChange={handleRequestChange}
      onRetryRefresh={() => {
        if (!refreshFailure || !controls) {
          return;
        }
        void runRefresh(refreshFailure.requestedControls, controls);
      }}
      isUpdating={isUpdating}
      isDetailsPending={isDetailsPending}
    />
  );
}

function applyPerformanceControlPatch(
  controls: PerformanceControlState,
  patch: Partial<PerformanceControlState>
): PerformanceControlState {
  const normalizedPatch = { ...patch };
  if (patch.period && patch.period !== "EXPLICIT") {
    normalizedPatch.reportStartDate = undefined;
    normalizedPatch.reportEndDate = undefined;
  }
  return {
    ...controls,
    ...normalizedPatch,
  };
}

function buildSummaryRequest(controls: PerformanceControlState) {
  return {
    period: controls.period,
    chartFrequency: controls.chartFrequency,
    contributionDimension: controls.contributionDimension,
    attributionDimension: controls.attributionDimension,
    detailBasis: controls.detailBasis,
    benchmark: controls.benchmark,
    reportStartDate: controls.reportStartDate,
    reportEndDate: controls.reportEndDate,
  };
}

function buildDetailsRequest(controls: PerformanceControlState) {
  return buildSummaryRequest(controls);
}

function buildResolvedSummaryControls(
  requestedControls: PerformanceControlState,
  resolvedSummary: WorkbenchPerformanceWorkspaceSummary
): PerformanceControlState {
  return {
    ...requestedControls,
    period: resolvedSummary.period,
    detailBasis: resolvedSummary.detail_basis,
    chartFrequency: resolvedSummary.chart_frequency,
    benchmark: resolvedSummary.benchmark_code ?? undefined,
    reportStartDate: resolvedSummary.report_start_date,
    reportEndDate: resolvedSummary.report_end_date,
  };
}

function buildResolvedDetailControls(
  requestedControls: PerformanceControlState,
  resolvedDetails: WorkbenchPerformanceWorkspaceDetails
): PerformanceControlState {
  return {
    ...requestedControls,
    contributionDimension: resolvedDetails.contribution_dimension,
    attributionDimension: resolvedDetails.attribution_dimension,
    detailBasis: resolvedDetails.detail_basis,
    chartFrequency: resolvedDetails.chart_frequency,
    benchmark: resolvedDetails.benchmark_code ?? requestedControls.benchmark,
    reportStartDate: resolvedDetails.report_start_date,
    reportEndDate: resolvedDetails.report_end_date,
  };
}

function buildRefreshStatus(
  pendingRefresh: PerformancePendingRefresh | null,
  refreshFailure: PerformanceRefreshFailure | null,
  refreshConfirmation: PerformancePendingRefresh | null
): PerformanceWorkspaceRefreshStatus | null {
  const refresh = pendingRefresh ?? refreshFailure ?? refreshConfirmation;
  if (!refresh) {
    return null;
  }

  return {
    kind: pendingRefresh ? "pending" : refreshFailure ? "failed" : "confirmed",
    scope: refresh.scope,
    requestedContext: describeRequestedContext(
      refresh.confirmedControls,
      refresh.requestedControls,
      refresh.scope
    ),
    confirmedContext: describeConfirmedContext(
      refresh.confirmedControls,
      refresh.scope
    ),
    status: refreshFailure?.status,
  };
}

function describeRequestedContext(
  confirmedControls: PerformanceControlState,
  requestedControls: PerformanceControlState,
  scope?: PerformanceRefreshScope
): string {
  const changedContext: string[] = [];
  if (
    requestedControls.period !== confirmedControls.period ||
    requestedControls.reportStartDate !== confirmedControls.reportStartDate ||
    requestedControls.reportEndDate !== confirmedControls.reportEndDate
  ) {
    changedContext.push(describeWindow(requestedControls));
  }
  if (requestedControls.detailBasis !== confirmedControls.detailBasis) {
    changedContext.push(`${formatControlLabel(requestedControls.detailBasis)} returns`);
  }
  if (requestedControls.chartFrequency !== confirmedControls.chartFrequency) {
    changedContext.push(`${formatControlLabel(requestedControls.chartFrequency)} observations`);
  }
  if (requestedControls.benchmark !== confirmedControls.benchmark) {
    changedContext.push(
      requestedControls.benchmark
        ? `Benchmark ${formatControlLabel(requestedControls.benchmark)}`
        : "No benchmark"
    );
  }
  if (requestedControls.contributionDimension !== confirmedControls.contributionDimension) {
    changedContext.push(
      `${formatControlLabel(requestedControls.contributionDimension)} contribution`
    );
  }
  if (requestedControls.attributionDimension !== confirmedControls.attributionDimension) {
    changedContext.push(
      `${formatControlLabel(requestedControls.attributionDimension)} attribution`
    );
  }
  return changedContext.join(" · ") || describeConfirmedContext(requestedControls, scope);
}

function describeConfirmedContext(
  controls: PerformanceControlState,
  scope?: PerformanceRefreshScope
): string {
  const context = [
    describeWindow(controls),
    `${formatControlLabel(controls.detailBasis)} returns`,
    `${formatControlLabel(controls.chartFrequency)} observations`,
  ];
  if (scope === "summary" && controls.benchmark) {
    context.push(`Benchmark ${formatControlLabel(controls.benchmark)}`);
  }
  if (scope === "details") {
    context.push(`${formatControlLabel(controls.contributionDimension)} contribution`);
    context.push(`${formatControlLabel(controls.attributionDimension)} attribution`);
  }
  return context.join(" · ");
}

function describeWindow(controls: PerformanceControlState): string {
  if (controls.period === "EXPLICIT" && controls.reportStartDate && controls.reportEndDate) {
    return `${controls.reportStartDate} to ${controls.reportEndDate}`;
  }
  return formatControlLabel(controls.period);
}

function formatControlLabel(value: string): string {
  return value
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) =>
      part.length <= 4 && part === part.toUpperCase()
        ? part
        : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`
    )
    .join(" ");
}

function shouldRefreshSummary(
  currentControls: PerformanceControlState,
  nextControls: PerformanceControlState
): boolean {
  return (
    currentControls.portfolioId !== nextControls.portfolioId ||
    currentControls.period !== nextControls.period ||
    currentControls.benchmark !== nextControls.benchmark ||
    currentControls.reportStartDate !== nextControls.reportStartDate ||
    currentControls.reportEndDate !== nextControls.reportEndDate
  );
}

function buildSummaryCacheKey(
  controls: Pick<
    PerformanceControlState,
    | "portfolioId"
    | "period"
    | "detailBasis"
    | "chartFrequency"
    | "benchmark"
    | "reportStartDate"
    | "reportEndDate"
  >
): string {
  const isExplicitWindow = controls.period === "EXPLICIT";
  return JSON.stringify({
    portfolioId: controls.portfolioId,
    period: controls.period,
    detailBasis: controls.detailBasis,
    chartFrequency: controls.chartFrequency,
    benchmark: controls.benchmark ?? null,
    reportStartDate: isExplicitWindow ? controls.reportStartDate ?? null : null,
    reportEndDate: isExplicitWindow ? controls.reportEndDate ?? null : null,
  });
}

function buildDetailsCacheKey(controls: PerformanceControlState): string {
  const isExplicitWindow = controls.period === "EXPLICIT";
  return JSON.stringify({
    portfolioId: controls.portfolioId,
    period: controls.period,
    detailBasis: controls.detailBasis,
    contributionDimension: controls.contributionDimension,
    attributionDimension: controls.attributionDimension,
    chartFrequency: controls.chartFrequency,
    benchmark: controls.benchmark ?? null,
    reportStartDate: isExplicitWindow ? controls.reportStartDate ?? null : null,
    reportEndDate: isExplicitWindow ? controls.reportEndDate ?? null : null,
  });
}

function resolveInitialControls({
  initialPortfolioId,
  initialPeriod,
  initialDetailBasis,
  initialContributionDimension,
  initialAttributionDimension,
  initialChartFrequency,
  initialBenchmark,
  initialSummary,
  initialDetails,
}: {
  initialPortfolioId: string;
  initialPeriod: string;
  initialDetailBasis: string;
  initialContributionDimension: string;
  initialAttributionDimension: string;
  initialChartFrequency: string;
  initialBenchmark?: string;
  initialSummary: WorkbenchPerformanceWorkspaceSummary | null;
  initialDetails?: WorkbenchPerformanceWorkspaceDetails | null;
}): PerformanceControlState {
  return {
    portfolioId: initialPortfolioId,
    period: initialSummary?.period ?? initialPeriod,
    detailBasis: initialDetails?.detail_basis ?? initialSummary?.detail_basis ?? initialDetailBasis,
    contributionDimension:
      initialDetails?.contribution_dimension ?? initialContributionDimension,
    attributionDimension:
      initialDetails?.attribution_dimension ?? initialAttributionDimension,
    chartFrequency: initialDetails?.chart_frequency ?? initialSummary?.chart_frequency ?? initialChartFrequency,
    benchmark:
      initialDetails?.benchmark_code ??
      initialSummary?.benchmark_code ??
      initialBenchmark,
    reportStartDate: initialDetails?.report_start_date ?? initialSummary?.report_start_date,
    reportEndDate: initialDetails?.report_end_date ?? initialSummary?.report_end_date,
  };
}
