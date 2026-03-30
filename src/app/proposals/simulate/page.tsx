import { redirect } from "next/navigation";

export default async function ProposalSimulatePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const portfolioId = resolvedSearchParams.portfolioId?.trim();
  if (portfolioId) {
    redirect(`/performance?portfolioId=${encodeURIComponent(portfolioId)}`);
  }
  redirect("/portfolio");
}
