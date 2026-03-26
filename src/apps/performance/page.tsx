import { redirect } from "next/navigation";

export default async function PerformanceAppPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const query = new URLSearchParams();
  if (resolvedSearch.portfolioId) {
    query.set("portfolioId", resolvedSearch.portfolioId);
  }
  const target = query.size ? `/pa/analytics?${query.toString()}` : "/pa/analytics";
  redirect(target);
}
