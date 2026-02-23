type LookupItem = {
  id: string;
  label: string;
};

type LookupEnvelope = {
  correlation_id: string;
  contract_version: string;
  items: LookupItem[];
};

const BFF_PROXY_BASE = "/api/bff/api/v1";

async function getLookup(path: string): Promise<LookupItem[]> {
  const response = await fetch(`${BFF_PROXY_BASE}${path}`);
  const body = await response.text();
  let parsed: LookupEnvelope;
  try {
    parsed = JSON.parse(body) as LookupEnvelope;
  } catch {
    throw new Error(`Lookup fetch failed (${response.status}): ${body}`);
  }
  if (!response.ok) {
    throw new Error(`Lookup fetch failed (${response.status}): ${body}`);
  }
  return parsed.items;
}

export async function getPortfolioLookups(): Promise<LookupItem[]> {
  return await getLookup("/lookups/portfolios");
}

export async function getInstrumentLookups(): Promise<LookupItem[]> {
  return await getLookup("/lookups/instruments?limit=200");
}

export async function getCurrencyLookups(): Promise<LookupItem[]> {
  return await getLookup("/lookups/currencies");
}

export type { LookupItem };
