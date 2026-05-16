import PortfolioRecordScreen from "@/apps/portfolio/portfolio-record-screen";

export default function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  return <PortfolioRecordScreen searchParams={searchParams} screen="income" />;
}
