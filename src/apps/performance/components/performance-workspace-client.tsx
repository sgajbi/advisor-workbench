"use client";

import { startTransition, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getWorkbenchPerformanceWorkspaceClient,
} from "@/features/workbench/api";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import PerformanceWorkspaceView from "./performance-workspace-view";
import { buildPerformanceHref } from "../navigation";

type PerformanceWorkspaceClientProps = {
  initialWorkspace: WorkbenchPerformanceWorkspace | null;
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
  initialWorkspace,
  initialPortfolioId,
  initialPeriod,
  initialDetailBasis,
  initialContributionDimension,
  initialAttributionDimension,
  initialChartFrequency,
  initialBenchmark,
}: PerformanceWorkspaceClientProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkbenchPerformanceWorkspace | null>(initialWorkspace);
  const [isUpdating, setIsUpdating] = useState(false);
  const [controls, setControls] = useState<PerformanceControlState | null>(
    initialPortfolioId
      ? {
          portfolioId: initialPortfolioId,
          period: initialWorkspace?.period ?? initialPeriod,
          detailBasis: initialWorkspace?.detail_basis ?? initialDetailBasis,
          contributionDimension:
            initialWorkspace?.contribution_dimension ?? initialContributionDimension,
          attributionDimension:
            initialWorkspace?.attribution_dimension ?? initialAttributionDimension,
          chartFrequency: initialWorkspace?.chart_frequency ?? initialChartFrequency,
          benchmark: initialWorkspace?.benchmark_code ?? initialBenchmark,
          reportStartDate: initialWorkspace?.report_start_date,
          reportEndDate: initialWorkspace?.report_end_date,
        }
      : null
  );
  const requestSequenceRef = useRef(0);

  const initialCacheKey = useMemo(
    () =>
      initialPortfolioId
        ? buildWorkspaceCacheKey({
            portfolioId: initialPortfolioId,
            period: initialWorkspace?.period ?? initialPeriod,
            detailBasis: initialWorkspace?.detail_basis ?? initialDetailBasis,
            contributionDimension:
              initialWorkspace?.contribution_dimension ?? initialContributionDimension,
            attributionDimension:
              initialWorkspace?.attribution_dimension ?? initialAttributionDimension,
            chartFrequency: initialWorkspace?.chart_frequency ?? initialChartFrequency,
            benchmark: initialWorkspace?.benchmark_code ?? initialBenchmark,
            reportStartDate: initialWorkspace?.report_start_date,
            reportEndDate: initialWorkspace?.report_end_date,
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
      initialWorkspace,
    ]
  );

  const workspaceCacheRef = useRef<Map<string, WorkbenchPerformanceWorkspace | null>>(
    initialCacheKey ? new Map([[initialCacheKey, initialWorkspace]]) : new Map()
  );

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
    const currentKey = buildWorkspaceCacheKey(controls);
    const nextKey = buildWorkspaceCacheKey(nextControls);
    if (nextKey === currentKey) {
      return;
    }

    setControls(nextControls);
    const cachedWorkspace = workspaceCacheRef.current.get(nextKey);
    if (cachedWorkspace) {
      setWorkspace(cachedWorkspace);
    }
    setIsUpdating(true);
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    startTransition(() => {
      router.replace(buildPerformanceHref(nextControls), { scroll: false });
    });

    try {
      if (cachedWorkspace) {
        if (requestSequenceRef.current === requestId) {
          setIsUpdating(false);
        }
        return;
      }

      const nextWorkspace = await getWorkbenchPerformanceWorkspaceClient(
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
      workspaceCacheRef.current.set(nextKey, nextWorkspace);
      if (requestSequenceRef.current !== requestId) {
        return;
      }
      const normalizedControls = {
        ...nextControls,
        period: nextWorkspace.period,
        detailBasis: nextWorkspace.detail_basis,
        contributionDimension: nextWorkspace.contribution_dimension,
        attributionDimension: nextWorkspace.attribution_dimension,
        chartFrequency: nextWorkspace.chart_frequency,
        benchmark: nextWorkspace.benchmark_code ?? undefined,
        reportStartDate: nextWorkspace.report_start_date,
        reportEndDate: nextWorkspace.report_end_date,
      };
      setWorkspace(nextWorkspace);
      setControls(normalizedControls);
    } catch {
      if (requestSequenceRef.current === requestId) {
        setWorkspace((currentWorkspace) => currentWorkspace);
      }
    } finally {
      if (requestSequenceRef.current === requestId) {
        setIsUpdating(false);
      }
    }
  }

  return (
    <PerformanceWorkspaceView
      workspace={workspace}
      period={controls?.period ?? initialPeriod}
      detailBasis={controls?.detailBasis ?? initialDetailBasis}
      contributionDimension={
        controls?.contributionDimension ?? initialContributionDimension
      }
      attributionDimension={
        controls?.attributionDimension ?? initialAttributionDimension
      }
      chartFrequency={controls?.chartFrequency ?? initialChartFrequency}
      benchmark={controls?.benchmark}
      onRequestChange={handleRequestChange}
      isUpdating={isUpdating}
    />
  );
}

function buildWorkspaceCacheKey(controls: PerformanceControlState): string {
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
