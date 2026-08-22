import PortfolioIncomeRecordScreen from "@/apps/portfolio/components/portfolio-income-record-screen";
import {
  loadPortfolioRecordScreenData,
  type PortfolioRecordScreenSearchParams,
} from "@/apps/portfolio/portfolio-record-screen-data";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<PortfolioRecordScreenSearchParams>;
}) {
  return <PortfolioIncomeRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
