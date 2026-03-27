"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
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
import { assemblePerformanceWorkspace } from "../workspace-assembler";
import PerformanceWorkspaceView from "./performance-workspace-view";

type PerformanceWorkspaceClientProps = {
  initialSummary: WorkbenchPerformanceWorkspaceSummary | null;
  initialPortfolioId: string | null;
  initialPeriod: string;
  initialDetailBasis: string;
  initialContributionDimension: string;
  initialAttributionDimension: string;
  initialChartFrequency: string;
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

export default function PerformanceWorkspaceClient({
  initialSummary,
  initialPortfolioId,
  initialPeriod,
  initialDetailBasis,
  initialContributionDimension,
  initialAttributionDimension,
  initialChartFrequency,
  initialBenchmark,
}: PerformanceWorkspaceClientProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<WorkbenchPerformanceWorkspaceSummary | null>(
    initialSummary
  );
  const [details, setDetails] = useState<WorkbenchPerformanceWorkspaceDetails | null>(null);
  const [isSummaryUpdating, setIsSummaryUpdating] = useState(false);
  const [isDetailsUpdating, setIsDetailsUpdating] = useState(false);
  const [controls, setControls] = useState<PerformanceControlState | null>(
    initialPortfolioId
      ? {
          portfolioId: initialPortfolioId,
          period: initialSummary?.period ?? initialPeriod,
          detailBasis: initialSummary?.detail_basis ?? initialDetailBasis,
          contributionDimension: initialContributionDimension,
          attributionDimension: initialAttributionDimension,
          chartFrequency: initialSummary?.chart_frequency ?? initialChartFrequency,
          benchmark: initialSummary?.benchmark_code ?? initialBenchmark,
          reportStartDate: initialSummary?.report_start_date,
          reportEndDate: initialSummary?.report_end_date,
        }
      : null
  );
  const requestSequenceRef = useRef(0);
  const initialDetailsRequestedRef = useRef(false);

  const initialSummaryKey = useMemo(
    () =>
      initialPortfolioId
        ? buildSummaryCacheKey({
            portfolioId: initialPortfolioId,
            period: initialSummary?.period ?? initialPeriod,
            detailBasis: initialSummary?.detail_basis ?? initialDetailBasis,
            chartFrequency: initialSummary?.chart_frequency ?? initialChartFrequency,
            benchmark: initialSummary?.benchmark_code ?? initialBenchmark,
            reportStartDate: initialSummary?.report_start_date,
            reportEndDate: initialSummary?.report_end_date,
          })
        : null,
    [
      initialBenchmark,
      initialChartFrequency,
      initialDetailBasis,
      initialPeriod,
      initialPortfolioId,
      initialSummary,
    ]
  );

  const initialDetailsKey = useMemo(
    () =>
      initialPortfolioId
        ? buildDetailsCacheKey({
            portfolioId: initialPortfolioId,
            period: initialSummary?.period ?? initialPeriod,
            detailBasis: initialSummary?.detail_basis ?? initialDetailBasis,
            contributionDimension: initialContributionDimension,
            attributionDimension: initialAttributionDimension,
            chartFrequency: initialSummary?.chart_frequency ?? initialChartFrequency,
            benchmark: initialSummary?.benchmark_code ?? initialBenchmark,
            reportStartDate: initialSummary?.report_start_date,
            reportEndDate: initialSummary?.report_end_date,
          })
        : null,
    [
      initialAttributionDimension,
      initialBenchmark,
      initialChartFrequency,
      initialContributionDimension,
      initialDetailBasis,
      initialPeriod,
      initialPortfolioId,
      initialSummary,
    ]
  );

  const summaryCacheRef = useRef<Map<string, WorkbenchPerformanceWorkspaceSummary | null>>(
    initialSummaryKey ? new Map([[initialSummaryKey, initialSummary]]) : new Map()
  );
  const detailsCacheRef = useRef<Map<string, WorkbenchPerformanceWorkspaceDetails | null>>(
    initialDetailsKey ? new Map([[initialDetailsKey, null]]) : new Map()
  );

  const workspace = useMemo<WorkbenchPerformanceWorkspace | null>(() => {
    if (!summary) {
      return null;
    }
    return assemblePerformanceWorkspace(summary, details);
  }, [details, summary]);
  const isUpdating = isSummaryUpdating || isDetailsUpdating;
  const isDetailsPending = Boolean(summary) && !details && isDetailsUpdating;

  useEffect(() => {
    if (!controls || !summary || details || initialDetailsRequestedRef.current) {
      return;
    }

    initialDetailsRequestedRef.current = true;
    void fetchDetailsForControls(controls, {
      requestId: requestSequenceRef.current,
      markLoading: true,
    });
  }, [controls, details, summary]);

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
      router.replace(buildPerformanceHref(nextControls), { scroll: false });
    });

    if (!shouldRefreshSummary(controls, nextControls)) {
      setDetails(cachedDetails);
      await fetchDetailsForControls(nextControls, {
        requestId,
        markLoading: true,
      });
      return;
    }

    const summaryKey = buildSummaryCacheKey(nextControls);
    const cachedSummary = summaryCacheRef.current.get(summaryKey) ?? null;

    if (cachedSummary) {
      setSummary(cachedSummary);
    }
    setDetails(cachedDetails);
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
          markLoading: true,
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

  async function fetchDetailsForControls(
    nextControls: PerformanceControlState,
    options: { requestId: number; markLoading: boolean }
  ) {
    const detailsKey = buildDetailsCacheKey(nextControls);
    const cachedDetails = detailsCacheRef.current.get(detailsKey);
    if (cachedDetails) {
      if (requestSequenceRef.current === options.requestId) {
        setDetails(cachedDetails);
      }
      return;
    }

    if (options.markLoading) {
      setIsDetailsUpdating(true);
    }

    try {
      const resolvedDetails = await getWorkbenchPerformanceWorkspaceDetailsClient(
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

      detailsCacheRef.current.set(detailsKey, resolvedDetails);
      if (requestSequenceRef.current !== options.requestId) {
        return;
      }
      setDetails(resolvedDetails);
      setControls((current) =>
        current
          ? {
              ...current,
              contributionDimension: resolvedDetails.contribution_dimension,
              attributionDimension: resolvedDetails.attribution_dimension,
              detailBasis: resolvedDetails.detail_basis,
              chartFrequency: resolvedDetails.chart_frequency,
              benchmark: resolvedDetails.benchmark_code ?? current.benchmark,
              reportStartDate: resolvedDetails.report_start_date,
              reportEndDate: resolvedDetails.report_end_date,
            }
          : current
      );
    } catch {
      if (requestSequenceRef.current === options.requestId) {
        setDetails((currentDetails) => currentDetails);
      }
    } finally {
      if (options.markLoading && requestSequenceRef.current === options.requestId) {
        setIsDetailsUpdating(false);
      }
    }
  }

  return (
    <PerformanceWorkspaceView
      workspace={workspace}
      period={controls?.period ?? initialPeriod}
      detailBasis={controls?.detailBasis ?? initialDetailBasis}
      contributionDimension={controls?.contributionDimension ?? initialContributionDimension}
      attributionDimension={controls?.attributionDimension ?? initialAttributionDimension}
      chartFrequency={controls?.chartFrequency ?? initialChartFrequency}
      benchmark={controls?.benchmark}
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
