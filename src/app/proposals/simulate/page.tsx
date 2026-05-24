import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";

export default async function ProposalSimulatePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const portfolioId = resolvedSearchParams.portfolioId?.trim() || "PB_SG_GLOBAL_BAL_001";
  return <ProposalSimulateForm initialPortfolioId={portfolioId} />;
}
