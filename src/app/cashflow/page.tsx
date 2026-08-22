import PortfolioCashflowRecordScreen from "@/apps/portfolio/components/portfolio-cashflow-record-screen";
import {
  loadPortfolioRecordScreenData,
  type PortfolioRecordScreenSearchParams,
} from "@/apps/portfolio/portfolio-record-screen-data";

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<PortfolioRecordScreenSearchParams>;
}) {
  return <PortfolioCashflowRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
