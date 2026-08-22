import PortfolioTransactionsRecordScreen from "@/apps/portfolio/components/portfolio-transactions-record-screen";
import {
  loadPortfolioRecordScreenData,
  type PortfolioRecordScreenSearchParams,
} from "@/apps/portfolio/portfolio-record-screen-data";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<PortfolioRecordScreenSearchParams>;
}) {
  return <PortfolioTransactionsRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
