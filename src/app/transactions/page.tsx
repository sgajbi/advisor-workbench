import PortfolioTransactionsRecordScreen from "@/apps/portfolio/components/portfolio-transactions-record-screen";
import { loadPortfolioRecordScreenData } from "@/apps/portfolio/portfolio-record-screen-data";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  return <PortfolioTransactionsRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
