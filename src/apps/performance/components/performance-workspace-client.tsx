"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getWorkbenchPerformanceWorkspaceDetailsClient,
  getWorkbenchPerformanceWorkspaceSummaryClient,
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

type PerformanceWorkspaceClientProps = {
  initialSummary: WorkbenchPerformanceWorkspaceSummary | null;
  initialDetails?: WorkbenchPerformanceWorkspaceDetails | null;
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

export default function PerformanceWorkspaceClient({
  initialSummary,
  initialDetails,
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
  const [details, setDetails] = useState<WorkbenchPerformanceWorkspaceDetails | null>(
    initialDetails ?? null
  );
  const [isSummaryUpdating, setIsSummaryUpdating] = useState(false);
  const [mode, setMode] = useState<PerformanceWorkspaceMode>(initialMode);
  const [controls, setControls] = useState<PerformanceControlState | null>(
    initialControls
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
  const [detailsKey, setDetailsKey] = useState<string | null>(initialDetailsKey ?? null);
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
  const isUpdating = isSummaryUpdating;
  const expectedDetailsKey = controls ? buildDetailsCacheKey(controls) : null;
  const hasExpectedDetails =
    Boolean(details) && detailsStatus === "ready" && detailsKey === expectedDetailsKey;
  const isDetailsPending =
    Boolean(summary) &&
    Boolean(expectedDetailsKey) &&
    !hasExpectedDetails &&
    (detailsStatus === "idle" || detailsStatus === "loading" || detailsKey !== expectedDetailsKey);

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

  async function handleRequestChange(patch: Partial<PerformanceControlState>) {
    if (!controls) {
      return;
    }
    const normalizedPatch =
      patch.period && patch.period !== "EXPLICIT"
        ? {
            ...patch,
            reportStartDate: patch.reportStartDate,
            reportEndDate: patch.reportEndDate,
          }
        : patch;
    if (patch.period && patch.period !== "EXPLICIT") {
      normalizedPatch.reportStartDate = undefined;
      normalizedPatch.reportEndDate = undefined;
    }

    const nextControls: PerformanceControlState = {
      ...controls,
      ...normalizedPatch,
    };

    if (
      buildSummaryCacheKey(nextControls) === buildSummaryCacheKey(controls) &&
      buildDetailsCacheKey(nextControls) === buildDetailsCacheKey(controls)
    ) {
      return;
    }

    setControls(nextControls);
    const detailsKey = buildDetailsCacheKey(nextControls);
    const cachedDetails = detailsCacheRef.current.get(detailsKey) ?? null;

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;

    startTransition(() => {
      router.replace(buildPerformanceHref({ ...nextControls, mode }), { scroll: false });
    });

    if (!shouldRefreshSummary(controls, nextControls)) {
      if (cachedDetails) {
        setDetails(cachedDetails);
        setDetailsKey(detailsKey);
        setDetailsStatus("ready");
      }
      await fetchDetailsForControls(nextControls, {
        requestId,
      });
      return;
    }

    const summaryKey = buildSummaryCacheKey(nextControls);
    const cachedSummary = summaryCacheRef.current.get(summaryKey) ?? null;

    if (cachedSummary) {
      setSummary(cachedSummary);
    }
    if (cachedDetails) {
      setDetails(cachedDetails);
      setDetailsKey(detailsKey);
      setDetailsStatus("ready");
    }
    setIsSummaryUpdating(true);

    try {
      const resolvedSummary =
        cachedSummary ??
        (await getWorkbenchPerformanceWorkspaceSummaryClient(nextControls.portfolioId, {
          period: nextControls.period,
          chartFrequency: nextControls.chartFrequency,
          contributionDimension: nextControls.contributionDimension,
          attributionDimension: nextControls.attributionDimension,
          detailBasis: nextControls.detailBasis,
          benchmark: nextControls.benchmark,
          reportStartDate: nextControls.reportStartDate,
          reportEndDate: nextControls.reportEndDate,
        }));

      summaryCacheRef.current.set(summaryKey, resolvedSummary);
      if (requestSequenceRef.current !== requestId) {
        return;
      }

      setSummary(resolvedSummary);
      setControls((current) =>
        current
          ? {
              ...current,
              period: resolvedSummary.period,
              detailBasis: resolvedSummary.detail_basis,
              chartFrequency: resolvedSummary.chart_frequency,
              benchmark: resolvedSummary.benchmark_code ?? undefined,
              reportStartDate: resolvedSummary.report_start_date,
              reportEndDate: resolvedSummary.report_end_date,
            }
          : current
      );

      await fetchDetailsForControls(
        {
          ...nextControls,
          period: resolvedSummary.period,
          detailBasis: resolvedSummary.detail_basis,
          chartFrequency: resolvedSummary.chart_frequency,
          benchmark: resolvedSummary.benchmark_code ?? undefined,
          reportStartDate: resolvedSummary.report_start_date,
          reportEndDate: resolvedSummary.report_end_date,
        },
        {
          requestId,
        }
      );
    } catch {
      if (requestSequenceRef.current === requestId) {
        setSummary((currentSummary) => currentSummary);
      }
    } finally {
      if (requestSequenceRef.current === requestId) {
        setIsSummaryUpdating(false);
      }
    }
  }

  const fetchDetailsForControls = useCallback(async (
    nextControls: PerformanceControlState,
    options: { requestId: number; allowInitialFallback?: boolean }
  ) => {
    const detailsKey = buildDetailsCacheKey(nextControls);
    const cachedDetails = detailsCacheRef.current.get(detailsKey);
    if (cachedDetails !== undefined) {
      if (requestSequenceRef.current === options.requestId) {
        setDetails(cachedDetails);
        setDetailsKey(detailsKey);
        setDetailsStatus("ready");
      }
      return;
    }

    if (requestSequenceRef.current === options.requestId) {
      setDetailsStatus("loading");
    }

    try {
      let resolvedDetails = await getWorkbenchPerformanceWorkspaceDetailsClient(
        nextControls.portfolioId,
        {
          period: nextControls.period,
          chartFrequency: nextControls.chartFrequency,
          contributionDimension: nextControls.contributionDimension,
          attributionDimension: nextControls.attributionDimension,
          detailBasis: nextControls.detailBasis,
          benchmark: nextControls.benchmark,
          reportStartDate: nextControls.reportStartDate,
          reportEndDate: nextControls.reportEndDate,
        }
      );
      let resolvedControls: PerformanceControlState = {
        ...nextControls,
        contributionDimension: resolvedDetails.contribution_dimension,
        attributionDimension: resolvedDetails.attribution_dimension,
        detailBasis: resolvedDetails.detail_basis,
        chartFrequency: resolvedDetails.chart_frequency,
        benchmark: resolvedDetails.benchmark_code ?? nextControls.benchmark,
        reportStartDate: resolvedDetails.report_start_date,
        reportEndDate: resolvedDetails.report_end_date,
      };

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
          if (cachedNormalizedDetails) {
            resolvedDetails = cachedNormalizedDetails;
          } else {
            resolvedDetails = await getWorkbenchPerformanceWorkspaceDetailsClient(
              resolvedControls.portfolioId,
              {
                period: resolvedControls.period,
                chartFrequency: resolvedControls.chartFrequency,
                contributionDimension: resolvedControls.contributionDimension,
                attributionDimension: resolvedControls.attributionDimension,
                detailBasis: resolvedControls.detailBasis,
                benchmark: resolvedControls.benchmark,
                reportStartDate: resolvedControls.reportStartDate,
                reportEndDate: resolvedControls.reportEndDate,
              }
            );
            detailsCacheRef.current.set(normalizedDetailsKey, resolvedDetails);
          }
          if (requestSequenceRef.current === options.requestId) {
            startTransition(() => {
              router.replace(buildPerformanceHref({ ...resolvedControls, mode }), {
                scroll: false,
              });
            });
          }
        }
      }

      const resolvedDetailsKey = buildDetailsCacheKey(resolvedControls);
      detailsCacheRef.current.set(resolvedDetailsKey, resolvedDetails);
      if (requestSequenceRef.current !== options.requestId) {
        return;
      }
      setDetails(resolvedDetails);
      setDetailsKey(resolvedDetailsKey);
      setDetailsStatus("ready");
      setControls((current) =>
        current
          ? {
              ...current,
              contributionDimension: resolvedControls.contributionDimension,
              attributionDimension: resolvedControls.attributionDimension,
              detailBasis: resolvedControls.detailBasis,
              chartFrequency: resolvedControls.chartFrequency,
              benchmark: resolvedControls.benchmark ?? current.benchmark,
              reportStartDate: resolvedControls.reportStartDate,
              reportEndDate: resolvedControls.reportEndDate,
            }
          : current
      );
    } catch {
      if (requestSequenceRef.current === options.requestId) {
        setDetailsStatus("failed");
      }
    } finally {
    }
  }, [mode, router]);

  useEffect(() => {
    if (!controls || !summary || details || initialDetailsRequestedRef.current) {
      return;
    }

    initialDetailsRequestedRef.current = true;
    setDetailsStatus("loading");
    void fetchDetailsForControls(controls, {
      requestId: requestSequenceRef.current,
      allowInitialFallback: true,
    });
  }, [controls, details, fetchDetailsForControls, summary]);

  return (
    <PerformanceWorkspaceView
      workspace={workspace}
      mode={mode}
      period={controls?.period ?? initialPeriod}
      detailBasis={controls?.detailBasis ?? initialDetailBasis}
      contributionDimension={controls?.contributionDimension ?? initialContributionDimension}
      attributionDimension={controls?.attributionDimension ?? initialAttributionDimension}
      chartFrequency={controls?.chartFrequency ?? initialChartFrequency}
      benchmark={controls?.benchmark}
      onModeChange={(nextMode) => {
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
      isUpdating={isUpdating}
      isDetailsPending={isDetailsPending}
    />
  );
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
