import PortfolioAllocationRecordScreen from "@/apps/portfolio/components/portfolio-allocation-record-screen";
import {
  loadPortfolioRecordScreenData,
  type PortfolioRecordScreenSearchParams,
} from "@/apps/portfolio/portfolio-record-screen-data";

export default async function AllocationPage({
  searchParams,
}: {
  searchParams: Promise<PortfolioRecordScreenSearchParams>;
}) {
  return <PortfolioAllocationRecordScreen {...(await loadPortfolioRecordScreenData({ searchParams }))} />;
}
