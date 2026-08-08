import PortfolioPositionsRecordScreen from "@/apps/portfolio/components/portfolio-positions-record-screen";
import { loadPortfolioRecordScreenData } from "@/apps/portfolio/portfolio-record-screen-data";

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  return <PortfolioPositionsRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
