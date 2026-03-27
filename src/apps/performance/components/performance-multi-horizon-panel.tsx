"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Panel } from "@/design-system";
import { getWorkbenchPerformanceWorkspaceSummaryClient } from "@/features/workbench/api";
import type { PerformanceBenchmarkOptionView } from "@/features/workbench/types";

import { formatLabel, formatPct } from "../formatters";

type MultiHorizonSummary = {
  period: string;
  portfolioReturnPct: number | null;
  benchmarkReturnPct: number | null;
};

const HORIZONS = ["MTD", "QTD", "YTD", "1Y"] as const;

export default function PerformanceMultiHorizonPanel({
  portfolioId,
  detailBasis,
  benchmark,
  chartFrequency,
  contributionDimension,
  attributionDimension,
  benchmarkOptions = [],
}: {
  portfolioId: string;
  detailBasis: string;
  benchmark?: string;
  chartFrequency: string;
  contributionDimension: string;
  attributionDimension: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
}) {
  const [rows, setRows] = useState<MultiHorizonSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, MultiHorizonSummary[]>>(new Map());

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
      contributionDimension,
      attributionDimension,
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

    void Promise.all(
      HORIZONS.map(async (period) => {
        const summary = await getWorkbenchPerformanceWorkspaceSummaryClient(portfolioId, {
          period,
          chartFrequency,
          contributionDimension,
          attributionDimension,
          detailBasis,
          benchmark,
        });
        const performance =
          detailBasis === "GROSS" ? summary.gross_performance : summary.net_performance;
        return {
          period,
          portfolioReturnPct: performance.portfolio_return_pct,
          benchmarkReturnPct: performance.benchmark_return_pct,
        } satisfies MultiHorizonSummary;
      })
    )
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(cacheKey, result);
        setRows(result);
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
    attributionDimension,
    benchmark,
    chartFrequency,
    contributionDimension,
    detailBasis,
    portfolioId,
  ]);

  const scale = Math.max(
    1,
    ...(rows ?? []).flatMap((row) => [
      Math.abs(row.portfolioReturnPct ?? 0),
      Math.abs(row.benchmarkReturnPct ?? 0),
    ])
  );

  return (
    <Panel className="performance-detail-panel-compact performance-multi-horizon-panel">
      <div className="performance-section-heading">
        <h3>Multi-Horizon Returns</h3>
        <span>{detailBasis} basis</span>
      </div>
      {isLoading ? (
        <p className="muted">Loading comparative horizon summaries.</p>
      ) : rows && rows.length > 0 ? (
        <>
          <div className="performance-mini-legend">
            <span className="performance-mini-legend-item performance-mini-legend-portfolio">
              Portfolio
            </span>
            <span className="performance-mini-legend-item performance-mini-legend-benchmark">
              {benchmarkLabel}
            </span>
          </div>
          <div className="performance-horizon-bars" aria-label="Multi-horizon returns">
            {rows.map((row) => (
              <div key={row.period} className="performance-horizon-bar-group">
                <div className="performance-horizon-bar-values">
                  <span>{formatPct(row.portfolioReturnPct)}</span>
                  <span>{formatPct(row.benchmarkReturnPct)}</span>
                </div>
                <div className="performance-horizon-bar-track">
                  <div
                    className="performance-horizon-bar performance-horizon-bar-portfolio"
                    style={{
                      height: `${(Math.abs(row.portfolioReturnPct ?? 0) / scale) * 120}px`,
                    }}
                  />
                  <div
                    className="performance-horizon-bar performance-horizon-bar-benchmark"
                    style={{
                      height: `${(Math.abs(row.benchmarkReturnPct ?? 0) / scale) * 120}px`,
                    }}
                  />
                </div>
                <strong>{row.period}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Comparative horizon summaries are not available for this mandate.</p>
      )}
    </Panel>
  );
}
