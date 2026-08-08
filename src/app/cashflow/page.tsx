import PortfolioCashflowRecordScreen from "@/apps/portfolio/components/portfolio-cashflow-record-screen";
import { loadPortfolioRecordScreenData } from "@/apps/portfolio/portfolio-record-screen-data";

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  return <PortfolioCashflowRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
