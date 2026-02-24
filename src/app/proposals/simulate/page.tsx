import Link from "next/link";

import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";
import { getWorkbenchOverview } from "@/features/workbench/api";
import { WorkbenchOverview } from "@/features/workbench/types";

function formatPct(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

async function loadOverview(portfolioId: string): Promise<WorkbenchOverview | null> {
  try {
    return await getWorkbenchOverview(portfolioId);
  } catch {
    return null;
  }
}

export default async function ProposalSimulatePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialPortfolioId = resolvedSearchParams.portfolioId?.trim() || "pf_demo_ui_1";
  const overview = await loadOverview(initialPortfolioId);

  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Advisory Proposals</h1>
        <p className="page-subtitle">Run proposal simulation and persist advisor-ready drafts.</p>
      </section>
      <div className="action-strip">
        <Link href="/proposals" className="nav-link">
          Go to Proposal Workspace
        </Link>
      </div>
      <section className="section-card">
        <h3>Selected Portfolio Baseline</h3>
        {!overview ? (
          <p className="error-text">
            Unable to load workbench overview for {initialPortfolioId}. Check BFF and upstream integrations.
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
            {overview.warnings.length ? (
              <p className="muted" style={{ marginTop: 10 }}>
                Warnings: {overview.warnings.join(", ")}
              </p>
            ) : null}
          </>
        )}
      </section>
      <ProposalSimulateForm initialPortfolioId={initialPortfolioId} />
    </main>
  );
}
