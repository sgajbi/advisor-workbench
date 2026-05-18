import {
  ManageWorkspace,
  ManageWorkspaceUnavailable,
} from "@/features/workbench/manage-workspace";
import { loadManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { normalizeManageMode } from "@/features/workbench/manage-workspace-navigation";
import { getPortfolio360 } from "@/features/workbench/api";

export default async function WorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ portfolioId: string }>;
  searchParams: Promise<{
    sessionId?: string;
    mode?: string;
  }>;
}) {
  const { portfolioId } = await params;
  const resolvedSearch = await searchParams;
  const sessionId = resolvedSearch.sessionId?.trim() || undefined;
  const mode = normalizeManageMode(resolvedSearch.mode);

  let portfolio: Awaited<ReturnType<typeof getPortfolio360>>;
  try {
    portfolio = await getPortfolio360(portfolioId, sessionId);
  } catch (error) {
    return (
      <ManageWorkspaceUnavailable
        portfolioId={portfolioId}
        detail={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }

  return (
    <ManageWorkspace
      data={await loadManageWorkspaceData(portfolio)}
      mode={mode}
    />
  );
}
