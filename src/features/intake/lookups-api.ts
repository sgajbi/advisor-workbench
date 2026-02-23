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

type PortfolioLookupFilters = {
  cifId?: string;
  bookingCenter?: string;
  q?: string;
  limit?: number;
};

type InstrumentLookupFilters = {
  limit?: number;
  productType?: string;
  q?: string;
};

type CurrencyLookupFilters = {
  instrumentPageLimit?: number;
  source?: "ALL" | "PORTFOLIOS" | "INSTRUMENTS";
  q?: string;
  limit?: number;
};

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function getLookup(path: string): Promise<LookupItem[]> {
  const response = await fetch(`${BFF_PROXY_BASE}${path}`, { cache: "no-store" });
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

export async function getPortfolioLookups(filters?: PortfolioLookupFilters): Promise<LookupItem[]> {
  return await getLookup(
    withQuery("/lookups/portfolios", {
      cif_id: filters?.cifId,
      booking_center: filters?.bookingCenter,
      q: filters?.q,
      limit: filters?.limit,
    })
  );
}

export async function getInstrumentLookups(filters?: InstrumentLookupFilters): Promise<LookupItem[]> {
  return await getLookup(
    withQuery("/lookups/instruments", {
      limit: filters?.limit ?? 200,
      product_type: filters?.productType,
      q: filters?.q,
    })
  );
}

export async function getCurrencyLookups(filters?: CurrencyLookupFilters): Promise<LookupItem[]> {
  return await getLookup(
    withQuery("/lookups/currencies", {
      instrument_page_limit: filters?.instrumentPageLimit,
      source: filters?.source,
      q: filters?.q,
      limit: filters?.limit,
    })
  );
}

export type { LookupItem };
