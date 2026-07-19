import { redirect } from "next/navigation";
import { DegradedStatePanel, WorkbenchPageFrame } from "@/design-system";
import { resolvePreferredPortfolioId } from "@/features/canonical-portfolio-selection";
import { resolveGatewayBaseUrl } from "@/features/platform-runtime/service-addressing";
import { resolveWorkbenchFallbackPortfolioIds } from "@/features/workbench-entry-selection";

type LookupItem = {
  id: string;
  label: string;
};

type LookupEnvelope = {
  items?: LookupItem[];
};

async function getDefaultPortfolioId(): Promise<string | null> {
  try {
    const response = await fetch(`${resolveGatewayBaseUrl()}/api/v1/lookups/portfolios?limit=1`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as LookupEnvelope;
    return resolvePreferredPortfolioId(payload.items ?? [], (item) => item.id);
  } catch {
    return null;
  }
}

export default async function WorkbenchEntryPage() {
  const portfolioId = await getDefaultPortfolioId();
  const fallbackPortfolioIds = resolveWorkbenchFallbackPortfolioIds(
    process.env.WORKBENCH_FALLBACK_PORTFOLIO_IDS,
  );

  if (portfolioId) {
    redirect(`/workbench/${portfolioId}`);
  }

  if (fallbackPortfolioIds.length > 0) {
    redirect(`/workbench/${fallbackPortfolioIds[0]}`);
  }

  return (
    <main className="page-container">
      <WorkbenchPageFrame
        title="Decision Console"
        subtitle="No portfolio is currently available from the platform lookup catalog and no fallback IDs are configured."
      >
        <DegradedStatePanel
          label="Route availability"
          title="No portfolio could be resolved"
          tone="warn"
          status="Unavailable"
        >
          Add a platform lookup portfolio or configure `WORKBENCH_FALLBACK_PORTFOLIO_IDS` to restore
          the default decision-console entry path.
        </DegradedStatePanel>
      </WorkbenchPageFrame>
    </main>
  );
}
