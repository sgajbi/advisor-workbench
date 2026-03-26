import type { PortfolioCatalogResponse, PortfolioWorkspace } from "./types";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

export async function getPortfolioCatalog(): Promise<PortfolioCatalogResponse["items"]> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/foundation/portfolios`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as PortfolioCatalogResponse;
    return payload.items ?? [];
  } catch {
    return [];
  }
}

export async function getPortfolioWorkspace(
  portfolioId: string
): Promise<PortfolioWorkspace | null> {
  try {
    const response = await fetch(
      `${BFF_BASE_URL}/api/v1/foundation/portfolios/${encodeURIComponent(portfolioId)}/workspace`,
      {
        cache: "no-store",
      }
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PortfolioWorkspace;
  } catch {
    return null;
  }
}
