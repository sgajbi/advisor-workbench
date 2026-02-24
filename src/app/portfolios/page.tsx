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

function formatPct(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
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

  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Portfolio Foundation</h1>
        <p className="page-subtitle">
          Review live portfolios, composition, and health before entering advisory or DPM workflows.
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
                Unable to load detailed portfolio context for {selectedId}. Validate upstream PAS/PA/DPM services.
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
              </>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
