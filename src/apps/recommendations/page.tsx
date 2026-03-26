import { redirect } from "next/navigation";

export default async function RecommendationsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  if (resolvedSearch.portfolioId) {
    redirect(`/proposals/simulate?portfolioId=${encodeURIComponent(resolvedSearch.portfolioId)}`);
  }
  redirect("/proposals");
}
