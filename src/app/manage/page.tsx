import { redirect } from "next/navigation";

import {
  buildReviewContextHref,
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<ReviewContextSearchParams>;
}) {
  const resolvedSearch = await searchParams;
  const reviewContextResult = parseReviewContext(resolvedSearch);
  if (reviewContextResult.status === "invalid") {
    redirect("/book");
  }

  const portfolioId = reviewContextResult.context.portfolioId;
  if (!portfolioId) {
    redirect("/book");
  }

  redirect(
    buildReviewContextHref(
      `/workbench/${encodeURIComponent(portfolioId)}`,
      reviewContextResult.context,
    ),
  );
}
