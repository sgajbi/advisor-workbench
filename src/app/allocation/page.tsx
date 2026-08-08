import PortfolioAllocationRecordScreen from "@/apps/portfolio/components/portfolio-allocation-record-screen";
import { loadPortfolioRecordScreenData } from "@/apps/portfolio/portfolio-record-screen-data";

export default async function AllocationPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  return <PortfolioAllocationRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
