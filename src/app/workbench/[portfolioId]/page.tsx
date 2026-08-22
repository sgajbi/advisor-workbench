import {
  ManageWorkspace,
  ManageWorkspaceUnavailable,
} from "@/features/workbench/manage-workspace";
import { loadManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { normalizeManageMode } from "@/features/workbench/manage-workspace-navigation";
import { getPortfolio360 } from "@/features/workbench/workbench-core-api";
import ReviewContextRecovery from "@/shell/review-context-recovery";
import { parseReviewContext } from "@/shell/review-context";

export default async function WorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ portfolioId: string }>;
  searchParams: Promise<{
    [key: string]: string | readonly string[] | undefined;
    sessionId?: string | readonly string[];
    mode?: string | readonly string[];
  }>;
}) {
  const { portfolioId } = await params;
  const resolvedSearch = await searchParams;
  const reviewContextResult = parseReviewContext({
    ...resolvedSearch,
    portfolioId: resolvedSearch.portfolioId ?? portfolioId,
  });
  if (
    reviewContextResult.status === "invalid" ||
    reviewContextResult.context.portfolioId !== portfolioId
  ) {
    return (
      <ReviewContextRecovery
        body="The mandate-workspace address contains conflicting, repeated, or unsupported review context. No mandate evidence was requested."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }

  const reviewContext = {
    ...reviewContextResult.context,
    portfolioId,
  };
  const sessionId =
    typeof resolvedSearch.sessionId === "string"
      ? resolvedSearch.sessionId.trim() || undefined
      : undefined;
  const mode = normalizeManageMode(
    typeof resolvedSearch.mode === "string" ? resolvedSearch.mode : undefined,
  );

  let portfolio: Awaited<ReturnType<typeof getPortfolio360>>;
  try {
    portfolio = await getPortfolio360(portfolioId, sessionId);
  } catch (error) {
    return (
      <ManageWorkspaceUnavailable
        portfolioId={portfolioId}
        reviewContext={reviewContext}
        detail={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }

  if (portfolio.portfolio.portfolio_id !== portfolioId) {
    return (
      <ManageWorkspaceUnavailable
        portfolioId={portfolioId}
        reviewContext={reviewContext}
        detail="The source response did not confirm the selected portfolio. No mandate workspace was opened."
      />
    );
  }

  return (
    <ManageWorkspace
      data={await loadManageWorkspaceData(portfolio)}
      mode={mode}
      reviewContext={reviewContext}
    />
  );
}
