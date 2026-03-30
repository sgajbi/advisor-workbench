"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Typography } from "@mui/material";

import {
  AnalyticsModule,
  WorkbenchSummaryToolbar,
  WorkbenchSummaryVisualCard,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualValue,
} from "@/design-system";
import { getWorkbenchPerformanceHorizonComparisonClient } from "@/features/workbench/api";
import type {
  PerformanceBenchmarkOptionView,
  PerformanceHorizonComparisonRow,
} from "@/features/workbench/types";

import { formatLabel, formatPct } from "../formatters";

export default function PerformanceMultiHorizonPanel({
  portfolioId,
  detailBasis,
  benchmark,
  chartFrequency,
  benchmarkOptions = [],
}: {
  portfolioId: string;
  detailBasis: string;
  benchmark?: string;
  chartFrequency: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
}) {
  const [rows, setRows] = useState<PerformanceHorizonComparisonRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, PerformanceHorizonComparisonRow[]>>(new Map());

  const benchmarkLabel = useMemo(() => {
    if (!benchmark) {
      return "Benchmark";
    }
    return (
      benchmarkOptions.find((option) => option.benchmark_code === benchmark)?.benchmark_name ??
      formatLabel(benchmark)
    );
  }, [benchmark, benchmarkOptions]);

  useEffect(() => {
    const cacheKey = JSON.stringify({
      portfolioId,
      detailBasis,
      benchmark: benchmark ?? null,
      chartFrequency,
    });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setRows(cached);
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    void getWorkbenchPerformanceHorizonComparisonClient(portfolioId, {
      detailBasis,
      benchmark,
      chartFrequency,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(cacheKey, result.rows);
        setRows(result.rows);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setRows([]);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [
    benchmark,
    chartFrequency,
    detailBasis,
    portfolioId,
  ]);

  const scale = Math.max(
    1,
    ...(rows ?? []).flatMap((row) => [
      Math.abs(row.portfolio_return_pct ?? 0),
      Math.abs(row.benchmark_return_pct ?? 0),
    ])
  );

  return (
    <AnalyticsModule
      className="workbench-summary-module-card performance-summary-module-card"
      compact
      title="Multi-Horizon Returns"
      subtitle={`${detailBasis} basis comparative view`}
      actions={
        <Typography
          component="span"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {detailBasis}
        </Typography>
      }
    >
      {isLoading ? (
        <p className="muted">Loading comparative horizon summaries.</p>
      ) : rows && rows.length > 0 ? (
        <>
          <WorkbenchSummaryToolbar className="performance-mini-legend">
            <span className="performance-mini-legend-item performance-mini-legend-portfolio">
              Portfolio
            </span>
            <span className="performance-mini-legend-item performance-mini-legend-benchmark">
              {benchmarkLabel}
            </span>
          </WorkbenchSummaryToolbar>
          <div
            className="performance-horizon-bars workbench-summary-visual-grid"
            aria-label="Multi-horizon returns"
          >
            {rows.map((row) => (
              <WorkbenchSummaryVisualCard
                key={row.period}
                className="performance-horizon-bar-group workbench-summary-visual-card"
              >
                <div className="performance-horizon-bar-values">
                  <WorkbenchSummaryVisualMeta>{formatPct(row.portfolio_return_pct)}</WorkbenchSummaryVisualMeta>
                  <WorkbenchSummaryVisualMeta>{formatPct(row.benchmark_return_pct)}</WorkbenchSummaryVisualMeta>
                </div>
                <div className="performance-horizon-bar-track">
                  <div
                    className="performance-horizon-bar performance-horizon-bar-portfolio"
                    style={{
                      height: `${(Math.abs(row.portfolio_return_pct ?? 0) / scale) * 120}px`,
                    }}
                  />
                  <div
                    className="performance-horizon-bar performance-horizon-bar-benchmark"
                    style={{
                      height: `${(Math.abs(row.benchmark_return_pct ?? 0) / scale) * 120}px`,
                    }}
                  />
                </div>
                <WorkbenchSummaryVisualValue>{row.period}</WorkbenchSummaryVisualValue>
              </WorkbenchSummaryVisualCard>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Comparative horizon summaries are not available for this mandate.</p>
      )}
    </AnalyticsModule>
  );
}
