import Link from "next/link";

import {
  getReportingSnapshot,
  getWorkbenchAnalytics,
  getWorkbenchOverview,
} from "@/features/workbench/api";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

type LookupEnvelope = {
  items?: Array<{ id: string; label: string }>;
};

function formatPct(value: number | null): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "N/A";
  }
  return JSON.stringify(value);
}

async function getDefaultPortfolioId(): Promise<string | null> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/lookups/portfolios?limit=1`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as LookupEnvelope;
    return payload.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function listPortfolioIds(limit = 8): Promise<string[]> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/lookups/portfolios?limit=${limit}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as LookupEnvelope;
    return (payload.items ?? []).map((item) => item.id).filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

export default async function PaAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    portfolioId?: string;
    period?: string;
    benchmark?: string;
  }>;
}) {
  const resolvedSearch = await searchParams;
  const portfolioId = resolvedSearch.portfolioId?.trim() || (await getDefaultPortfolioId());

  if (!portfolioId) {
    return (
      <main className="page-container">
        <section className="page-header">
          <h1 className="page-title">Analytics Studio</h1>
          <p className="page-subtitle">
            No portfolio is currently available from platform lookups. Seed demo portfolios to activate
            analytics views.
          </p>
        </section>
      </main>
    );
  }

  const period = resolvedSearch.period?.trim() || "YTD";
  const benchmark = resolvedSearch.benchmark?.trim() || "MODEL_60_40";
  const portfolioOptions = await listPortfolioIds();
  const periodOptions = ["YTD", "1M", "3M", "1Y"];
  const benchmarkOptions = ["MODEL_60_40", "MSCI_ACWI", "CUSTOM"];

  let overview: Awaited<ReturnType<typeof getWorkbenchOverview>> | null = null;
  let analytics: Awaited<ReturnType<typeof getWorkbenchAnalytics>> | null = null;
  let reporting: Awaited<ReturnType<typeof getReportingSnapshot>> | null = null;

  try {
    overview = await getWorkbenchOverview(portfolioId);
  } catch {
    overview = null;
  }

  try {
    analytics = await getWorkbenchAnalytics(portfolioId, {
      period,
      groupBy: "ASSET_CLASS",
      benchmark,
    });
  } catch {
    analytics = null;
  }

  try {
    reporting = await getReportingSnapshot(
      portfolioId,
      overview?.as_of_date ?? new Date().toISOString().slice(0, 10)
    );
  } catch {
    reporting = null;
  }

  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Analytics Studio: {portfolioId}</h1>
        <p className="page-subtitle">
          Backend-driven analytics from PA with reporting-ready rows from the aggregation service.
        </p>
      </section>

      <section className="section-card">
        <h2>Analytics Context</h2>
        <div className="suite-row">
          <span>As Of Date</span>
          <strong>{overview?.as_of_date ?? "N/A"}</strong>
        </div>
        <div className="suite-row">
          <span>Selected Period</span>
          <strong>{period}</strong>
        </div>
        <div className="suite-row">
          <span>Selected Benchmark</span>
          <strong>{benchmark}</strong>
        </div>
        <div className="toolbar">
          {portfolioOptions.map((candidatePortfolioId) => (
            <Link
              className="nav-link"
              key={candidatePortfolioId}
              href={`/pa/analytics?portfolioId=${encodeURIComponent(
                candidatePortfolioId
              )}&period=${encodeURIComponent(period)}&benchmark=${encodeURIComponent(benchmark)}`}
            >
              {candidatePortfolioId}
            </Link>
          ))}
        </div>
        <div className="toolbar">
          {periodOptions.map((candidatePeriod) => (
            <Link
              className="nav-link"
              key={candidatePeriod}
              href={`/pa/analytics?portfolioId=${encodeURIComponent(
                portfolioId
              )}&period=${encodeURIComponent(candidatePeriod)}&benchmark=${encodeURIComponent(
                benchmark
              )}`}
            >
              Period: {candidatePeriod}
            </Link>
          ))}
          {benchmarkOptions.map((candidateBenchmark) => (
            <Link
              className="nav-link"
              key={candidateBenchmark}
              href={`/pa/analytics?portfolioId=${encodeURIComponent(
                portfolioId
              )}&period=${encodeURIComponent(period)}&benchmark=${encodeURIComponent(
                candidateBenchmark
              )}`}
            >
              Benchmark: {candidateBenchmark}
            </Link>
          ))}
        </div>
      </section>

      {analytics ? (
        <section className="section-card">
          <h2>Performance Snapshot ({analytics.period})</h2>
          <div className="kpi-grid">
            <div className="kpi-box">
              <p className="kpi-label">Portfolio Return</p>
              <p className="kpi-value">{formatPct(analytics.portfolio_return_pct)}</p>
            </div>
            <div className="kpi-box">
              <p className="kpi-label">Benchmark Return</p>
              <p className="kpi-value">{formatPct(analytics.benchmark_return_pct)}</p>
            </div>
            <div className="kpi-box">
              <p className="kpi-label">Active Return</p>
              <p className="kpi-value">{formatPct(analytics.active_return_pct)}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="section-card">
          <p className="muted">PA analytics are unavailable right now. Retry once PA is online.</p>
        </section>
      )}

      <section className="workbench-split">
        <div className="workbench-col">
          <section className="section-card">
            <h3>Allocation Buckets</h3>
            {analytics && analytics.allocation_buckets.length > 0 ? (
              <div className="table-wrap">
                <table className="position-table">
                  <thead>
                    <tr>
                      <th align="left">Bucket</th>
                      <th align="right">Current Wgt</th>
                      <th align="right">Proposed Wgt</th>
                      <th align="right">Delta Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.allocation_buckets.map((bucket) => (
                      <tr key={bucket.bucket_key}>
                        <td>{bucket.bucket_label}</td>
                        <td align="right">{bucket.current_weight_pct.toFixed(2)}%</td>
                        <td align="right">{bucket.proposed_weight_pct.toFixed(2)}%</td>
                        <td align="right">{bucket.delta_quantity.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No allocation rows returned from analytics API.</p>
            )}
          </section>
        </div>

        <div className="workbench-col">
          <section className="section-card">
            <h3>Reporting Rows</h3>
            {reporting && reporting.rows.length > 0 ? (
              <div className="table-wrap">
                <table className="position-table">
                  <thead>
                    <tr>
                      <th align="left">Bucket</th>
                      <th align="left">Metric</th>
                      <th align="right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporting.rows.map((row, index) => (
                      <tr key={`${String(row.bucket ?? "row")}-${String(row.metric ?? index)}-${index}`}>
                        <td>{formatNumber(row.bucket ?? "TOTAL")}</td>
                        <td>{formatNumber(row.metric ?? "value")}</td>
                        <td align="right">{formatNumber(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Reporting aggregation rows are unavailable right now.</p>
            )}
          </section>
        </div>
      </section>

      <section className="toolbar">
        <Link className="nav-link" href={`/workbench/${portfolioId}`}>
          Open Decision Console
        </Link>
      </section>
    </main>
  );
}
