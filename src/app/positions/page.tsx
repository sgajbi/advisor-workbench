import PortfolioRecordScreen from "@/apps/portfolio/portfolio-record-screen";

export default function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  return <PortfolioRecordScreen searchParams={searchParams} screen="positions" />;
}
