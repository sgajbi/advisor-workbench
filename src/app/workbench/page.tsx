import { redirect } from "next/navigation";
import { DegradedStatePanel, WorkbenchPageFrame } from "@/design-system";
import { resolveGatewayBaseUrl } from "@/features/platform-runtime/service-addressing";
const WORKBENCH_FALLBACK_PORTFOLIO_IDS =
  process.env.WORKBENCH_FALLBACK_PORTFOLIO_IDS ??
  "DEMO_DPM_EUR_001,DEMO_INCOME_CHF_001,DEMO_BALANCED_SGD_001,DEMO_REBAL_USD_001,DEMO_ADV_USD_001";

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
    return payload.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

function getFallbackPortfolioIds(): string[] {
  return WORKBENCH_FALLBACK_PORTFOLIO_IDS.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default async function WorkbenchEntryPage() {
  const portfolioId = await getDefaultPortfolioId();
  const fallbackPortfolioIds = getFallbackPortfolioIds();

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
