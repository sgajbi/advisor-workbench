import PortfolioPositionsRecordScreen from "@/apps/portfolio/components/portfolio-positions-record-screen";
import {
  loadPortfolioRecordScreenData,
  type PortfolioRecordScreenSearchParams,
} from "@/apps/portfolio/portfolio-record-screen-data";

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<PortfolioRecordScreenSearchParams>;
}) {
  return <PortfolioPositionsRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
