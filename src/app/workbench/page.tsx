import { redirect } from "next/navigation";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

type LookupItem = {
  id: string;
  label: string;
};

type LookupEnvelope = {
  items?: LookupItem[];
};

async function getDefaultPortfolioId(): Promise<string | null> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/lookups/portfolios?limit=1`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as LookupEnvelope;
    return payload.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function WorkbenchEntryPage() {
  const portfolioId = await getDefaultPortfolioId();

  if (portfolioId) {
    redirect(`/workbench/${portfolioId}`);
  }

  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Decision Console</h1>
        <p className="page-subtitle">
          No portfolio is currently available from the platform lookup catalog. Create or ingest a portfolio first.
        </p>
      </section>
    </main>
  );
}
