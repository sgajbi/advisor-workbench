import { redirect } from "next/navigation";

import { resolvePreferredPortfolioId } from "@/features/canonical-portfolio-selection";
import { getPortfolioCatalog } from "@/apps/portfolio/api";

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const portfolios = await getPortfolioCatalog();
  const resolvedSearch = await searchParams;
  const selectedPortfolioId =
    portfolios.find((item) => item.portfolio_id === resolvedSearch.portfolioId)?.portfolio_id ??
    resolvePreferredPortfolioId(portfolios, (item) => item.portfolio_id);

  redirect(selectedPortfolioId ? `/workbench/${encodeURIComponent(selectedPortfolioId)}` : "/workbench");
}
