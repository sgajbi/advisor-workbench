"use client";

import { startTransition, useState } from "react";
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
  initialDetailDimension: string;
  initialChartFrequency: string;
  initialBenchmark?: string;
};

type PerformanceControlState = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  detailDimension: string;
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
  initialDetailDimension,
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
          detailDimension: initialWorkspace?.detail_dimension ?? initialDetailDimension,
          chartFrequency: initialWorkspace?.chart_frequency ?? initialChartFrequency,
          benchmark: initialWorkspace?.benchmark_code ?? initialBenchmark,
          reportStartDate: initialWorkspace?.report_start_date,
          reportEndDate: initialWorkspace?.report_end_date,
        }
      : null
  );

  async function handleRequestChange(patch: Partial<PerformanceControlState>) {
    if (!controls) {
      return;
    }
    const nextControls: PerformanceControlState = {
      ...controls,
      ...patch,
    };
    setControls(nextControls);
    setIsUpdating(true);
    startTransition(() => {
      router.replace(buildPerformanceHref(nextControls), { scroll: false });
    });
    try {
      const nextWorkspace = await getWorkbenchPerformanceWorkspaceClient(
        nextControls.portfolioId,
        {
          period: nextControls.period,
          chartFrequency: nextControls.chartFrequency,
          detailDimension: nextControls.detailDimension,
          detailBasis: nextControls.detailBasis,
          benchmark: nextControls.benchmark,
          reportStartDate: nextControls.reportStartDate,
          reportEndDate: nextControls.reportEndDate,
        }
      );
      setWorkspace(nextWorkspace);
      setControls({
        ...nextControls,
        period: nextWorkspace.period,
        detailBasis: nextWorkspace.detail_basis,
        detailDimension: nextWorkspace.detail_dimension,
        chartFrequency: nextWorkspace.chart_frequency,
        benchmark: nextWorkspace.benchmark_code ?? undefined,
        reportStartDate: nextWorkspace.report_start_date,
        reportEndDate: nextWorkspace.report_end_date,
      });
    } catch {
      setWorkspace((currentWorkspace) => currentWorkspace);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <PerformanceWorkspaceView
      workspace={workspace}
      period={controls?.period ?? initialPeriod}
      detailBasis={controls?.detailBasis ?? initialDetailBasis}
      detailDimension={controls?.detailDimension ?? initialDetailDimension}
      chartFrequency={controls?.chartFrequency ?? initialChartFrequency}
      benchmark={controls?.benchmark}
      onRequestChange={handleRequestChange}
      isUpdating={isUpdating}
    />
  );
}
