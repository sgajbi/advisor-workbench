import PortfolioIncomeRecordScreen from "@/apps/portfolio/components/portfolio-income-record-screen";
import { loadPortfolioRecordScreenData } from "@/apps/portfolio/portfolio-record-screen-data";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  return <PortfolioIncomeRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
