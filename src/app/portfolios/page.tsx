import Link from "next/link";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

type LookupItem = {
  id: string;
  label: string;
};

type LookupEnvelope = {
  items?: LookupItem[];
};

type WorkbenchOverview = {
  as_of_date: string;
  portfolio: {
    portfolio_id: string;
    base_currency: string;
    booking_center_code: string | null;
  };
  overview: {
    market_value_base: number;
    cash_weight_pct: number;
    position_count: number;
  };
  performance_snapshot: {
    period: string;
    return_pct: number | null;
    benchmark_return_pct: number | null;
  } | null;
  rebalance_snapshot: {
    status: string;
    last_rebalance_run_id: string | null;
  } | null;
};

type ReportingSnapshot = {
  rows: Array<{ bucket?: string; metric?: string; value?: number | string | null }>;
};

type Portfolio360Snapshot = {
  current_positions: Array<{
    security_id: string;
    instrument_name: string;
    asset_class: string | null;
    quantity: number;
    market_value_base: number | null;
    weight_pct: number | null;
  }>;
};

type PortfolioCatalogRow = {
  portfolioId: string;
  asOfDate: string | null;
  marketValueBase: number | null;
  positionCount: number | null;
  performanceYtdPct: number | null;
  reportingYtdPct: number | null;
  rebalanceStatus: string | null;
};

type AllocationBucket = {
  assetClass: string;
  weightPct: number;
  marketValueBase: number;
};

async function getPortfolios(): Promise<LookupItem[]> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/lookups/portfolios?limit=100`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as LookupEnvelope;
    return payload.items ?? [];
  } catch {
    return [];
  }
}

async function getOverview(portfolioId: string): Promise<WorkbenchOverview | null> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/overview`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as WorkbenchOverview;
  } catch {
    return null;
  }
}

async function getReportingSnapshot(
  portfolioId: string,
  asOfDate: string
): Promise<ReportingSnapshot | null> {
  try {
    const response = await fetch(
      `${BFF_BASE_URL}/api/v1/reports/${portfolioId}/snapshot?asOfDate=${encodeURIComponent(asOfDate)}`,
      {
        cache: "no-store",
      }
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ReportingSnapshot;
  } catch {
    return null;
  }
}

async function getPortfolio360Snapshot(
  portfolioId: string
): Promise<Portfolio360Snapshot | null> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/portfolio-360`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Portfolio360Snapshot;
  } catch {
    return null;
  }
}

function formatPct(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function extractMetricValue(
  snapshot: ReportingSnapshot | null,
  metric: string
): number | null {
  const row = snapshot?.rows.find((item) => item.metric === metric);
  if (!row) {
    return null;
  }
  return typeof row.value === "number" ? row.value : null;
}

function buildAllocationBuckets(snapshot: Portfolio360Snapshot | null): AllocationBucket[] {
  if (!snapshot) {
    return [];
  }

  const grouped = new Map<string, { marketValueBase: number; weightPct: number }>();
  for (const row of snapshot.current_positions) {
    const key = row.asset_class ?? "UNCLASSIFIED";
    const current = grouped.get(key) ?? { marketValueBase: 0, weightPct: 0 };
    grouped.set(key, {
      marketValueBase: current.marketValueBase + (row.market_value_base ?? 0),
      weightPct: current.weightPct + (row.weight_pct ?? 0),
    });
  }

  return Array.from(grouped.entries())
    .map(([assetClass, values]) => ({
      assetClass,
      marketValueBase: values.marketValueBase,
      weightPct: values.weightPct,
    }))
    .sort((left, right) => right.marketValueBase - left.marketValueBase)
    .slice(0, 5);
}

export default async function PortfolioFoundationPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const portfolios = await getPortfolios();
  const resolvedSearch = await searchParams;
  const selectedId =
    portfolios.find((item) => item.id === resolvedSearch.portfolioId)?.id ?? portfolios[0]?.id ?? null;
  const overview = selectedId ? await getOverview(selectedId) : null;
  const reportingSnapshot =
    overview && selectedId ? await getReportingSnapshot(selectedId, overview.as_of_date) : null;
  const portfolio360 = selectedId ? await getPortfolio360Snapshot(selectedId) : null;
  const reportingYtd = extractMetricValue(reportingSnapshot, "return_ytd_pct");
  const reportingMarketValue = extractMetricValue(reportingSnapshot, "market_value_base");
  const topPositions =
    portfolio360?.current_positions
      ?.slice()
      .sort((left, right) => (right.market_value_base ?? 0) - (left.market_value_base ?? 0))
      .slice(0, 5) ?? [];
  const topAllocations = buildAllocationBuckets(portfolio360);
  const catalogRows = await Promise.all(
    portfolios.slice(0, 12).map(async (portfolio) => {
      const portfolioOverview = await getOverview(portfolio.id);
      if (!portfolioOverview) {
        return {
          portfolioId: portfolio.id,
          asOfDate: null,
          marketValueBase: null,
          positionCount: null,
          performanceYtdPct: null,
          reportingYtdPct: null,
          rebalanceStatus: null,
        } satisfies PortfolioCatalogRow;
      }

      const snapshot = await getReportingSnapshot(portfolio.id, portfolioOverview.as_of_date);
      return {
        portfolioId: portfolio.id,
        asOfDate: portfolioOverview.as_of_date,
        marketValueBase: portfolioOverview.overview.market_value_base,
        positionCount: portfolioOverview.overview.position_count,
        performanceYtdPct: portfolioOverview.performance_snapshot?.return_pct ?? null,
        reportingYtdPct: extractMetricValue(snapshot, "return_ytd_pct"),
        rebalanceStatus: portfolioOverview.rebalance_snapshot?.status ?? null,
      } satisfies PortfolioCatalogRow;
    })
  );

  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Portfolio Foundation</h1>
        <p className="page-subtitle">
          Review live portfolios, composition, and health before entering advisory or lotus-manage workflows.
        </p>
      </section>

      {portfolios.length === 0 ? (
        <section className="section-card">
          <p className="muted">No portfolios are currently available. Start by creating or ingesting portfolio data.</p>
          <div className="toolbar">
            <Link href="/pas/intake" className="nav-link">
              Open Portfolio Intake
            </Link>
            <Link href="/proposals/simulate" className="nav-link">
              Open Advisory Simulation
            </Link>
          </div>
        </section>
      ) : (
        <section className="suite-grid">
          <article className="section-card suite-panel">
            <h3>Existing Portfolios</h3>
            <p className="muted">Select a portfolio to inspect current positions, performance, and decision readiness.</p>
            <div className="toolbar" style={{ flexDirection: "column", alignItems: "stretch" }}>
              {portfolios.map((item) => (
                <Link
                  key={item.id}
                  href={`/portfolios?portfolioId=${encodeURIComponent(item.id)}`}
                  className="nav-link"
                  style={{
                    fontWeight: item.id === selectedId ? 700 : 500,
                    textDecoration: item.id === selectedId ? "underline" : "none",
                  }}
                >
                  {item.id}
                </Link>
              ))}
            </div>
          </article>

          <article className="section-card suite-panel">
            <h3>Portfolio Health and Composition</h3>
            {!overview ? (
              <p className="error-text">
                Unable to load detailed portfolio context for {selectedId}. Validate upstream lotus-core/lotus-performance/lotus-manage services.
              </p>
            ) : (
              <>
                <div className="suite-row">
                  <span>Portfolio ID</span>
                  <strong>{overview.portfolio.portfolio_id}</strong>
                </div>
                <div className="suite-row">
                  <span>As Of Date</span>
                  <strong>{overview.as_of_date}</strong>
                </div>
                <div className="suite-row">
                  <span>Market Value</span>
                  <strong>{formatCurrency(overview.overview.market_value_base, overview.portfolio.base_currency)}</strong>
                </div>
                <div className="suite-row">
                  <span>Position Count</span>
                  <strong>{overview.overview.position_count}</strong>
                </div>
                <div className="suite-row">
                  <span>Cash Weight</span>
                  <strong>{overview.overview.cash_weight_pct.toFixed(2)}%</strong>
                </div>
                <div className="suite-row">
                  <span>Performance ({overview.performance_snapshot?.period ?? "N/A"})</span>
                  <strong>{formatPct(overview.performance_snapshot?.return_pct ?? null)}</strong>
                </div>
                <div className="suite-row">
                  <span>Benchmark Return</span>
                  <strong>{formatPct(overview.performance_snapshot?.benchmark_return_pct ?? null)}</strong>
                </div>
                <div className="suite-row">
                  <span>Reporting YTD Return</span>
                  <strong>{reportingYtd === null ? "N/A" : `${reportingYtd.toFixed(2)}%`}</strong>
                </div>
                <div className="suite-row">
                  <span>Reporting Market Value</span>
                  <strong>
                    {typeof reportingMarketValue === "number"
                      ? formatCurrency(reportingMarketValue, overview.portfolio.base_currency)
                      : "N/A"}
                  </strong>
                </div>
                <div className="suite-row">
                  <span>Rebalance Status</span>
                  <strong>{overview.rebalance_snapshot?.status ?? "UNKNOWN"}</strong>
                </div>
                <div className="toolbar">
                  <Link href={`/workbench/${overview.portfolio.portfolio_id}`} className="nav-link">
                    Open Decision Console
                  </Link>
                  <Link
                    href={`/proposals/simulate?portfolioId=${encodeURIComponent(overview.portfolio.portfolio_id)}`}
                    className="nav-link"
                  >
                    Start Advisory Iteration
                  </Link>
                </div>
                <hr style={{ border: "0", borderTop: "1px solid var(--border-color)", margin: "12px 0" }} />
                <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Top Holdings Snapshot</h4>
                {topPositions.length ? (
                  <div className="table-wrap">
                    <table className="position-table">
                      <thead>
                        <tr>
                          <th align="left">Security</th>
                          <th align="left">Instrument</th>
                          <th align="left">Asset Class</th>
                          <th align="right">Quantity</th>
                          <th align="right">Market Value</th>
                          <th align="right">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPositions.map((row) => (
                          <tr key={row.security_id}>
                            <td>{row.security_id}</td>
                            <td>{row.instrument_name}</td>
                            <td>{row.asset_class ?? "N/A"}</td>
                            <td align="right">{row.quantity.toFixed(4)}</td>
                            <td align="right">
                              {row.market_value_base === null
                                ? "N/A"
                                : formatCurrency(row.market_value_base, overview.portfolio.base_currency)}
                            </td>
                            <td align="right">{row.weight_pct === null ? "N/A" : `${row.weight_pct.toFixed(2)}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">Portfolio 360 positions are unavailable for this portfolio.</p>
                )}
                <h4 style={{ margin: "12px 0 8px", fontSize: "0.95rem" }}>Asset Class Allocation Snapshot</h4>
                {topAllocations.length ? (
                  <div className="table-wrap">
                    <table className="position-table">
                      <thead>
                        <tr>
                          <th align="left">Asset Class</th>
                          <th align="right">Market Value</th>
                          <th align="right">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topAllocations.map((bucket) => (
                          <tr key={bucket.assetClass}>
                            <td>{bucket.assetClass}</td>
                            <td align="right">
                              {formatCurrency(bucket.marketValueBase, overview.portfolio.base_currency)}
                            </td>
                            <td align="right">{bucket.weightPct.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">Asset-class allocation is unavailable until positions are loaded.</p>
                )}
              </>
            )}
          </article>
        </section>
      )}

      {catalogRows.length > 0 ? (
        <section className="section-card">
          <h3>Portfolio Catalog Snapshot</h3>
          <p className="muted">
            Cross-portfolio summary from lotus-core/lotus-performance/lotus-gateway and reporting aggregation outputs.
          </p>
          <div className="table-wrap">
            <table className="position-table">
              <thead>
                <tr>
                  <th align="left">Portfolio</th>
                  <th align="left">As Of Date</th>
                  <th align="right">Market Value</th>
                  <th align="right">Positions</th>
                  <th align="right">lotus-performance Return YTD</th>
                  <th align="right">Reporting Return YTD</th>
                  <th align="left">Rebalance</th>
                </tr>
              </thead>
              <tbody>
                {catalogRows.map((row) => (
                  <tr key={row.portfolioId}>
                    <td>
                      <Link
                        href={`/portfolios?portfolioId=${encodeURIComponent(row.portfolioId)}`}
                        className="nav-link"
                      >
                        {row.portfolioId}
                      </Link>
                    </td>
                    <td>{row.asOfDate ?? "N/A"}</td>
                    <td align="right">
                      {row.marketValueBase === null ? "N/A" : formatCurrency(row.marketValueBase, "USD")}
                    </td>
                    <td align="right">{row.positionCount ?? "N/A"}</td>
                    <td align="right">{row.performanceYtdPct === null ? "N/A" : `${row.performanceYtdPct.toFixed(2)}%`}</td>
                    <td align="right">{row.reportingYtdPct === null ? "N/A" : `${row.reportingYtdPct.toFixed(2)}%`}</td>
                    <td>{row.rebalanceStatus ?? "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
