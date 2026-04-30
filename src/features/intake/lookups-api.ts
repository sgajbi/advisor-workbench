import {
  WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES,
  observeWorkbenchAnalyticsRequest,
  type WorkbenchAnalyticsUiObservationContext,
} from "@/features/analytics-observability/metrics";

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
const LOOKUP_OPERATION_BY_PATH = {
  "/lookups/portfolios": "intake.lookups.portfolios",
  "/lookups/instruments": "intake.lookups.instruments",
  "/lookups/currencies": "intake.lookups.currencies",
} as const;

function observedLookupSurface(
  path: keyof typeof LOOKUP_OPERATION_BY_PATH
): WorkbenchAnalyticsUiObservationContext {
  const operation = LOOKUP_OPERATION_BY_PATH[path];
  return WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES.find(
    (surface) => surface.operation === operation
  )!;
}

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

async function getLookup(path: keyof typeof LOOKUP_OPERATION_BY_PATH, queryPath: string): Promise<LookupItem[]> {
  return await observeWorkbenchAnalyticsRequest(observedLookupSurface(path), async () => {
    const response = await fetch(`${BFF_PROXY_BASE}${queryPath}`, { cache: "no-store" });
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
  });
}

export async function getPortfolioLookups(filters?: PortfolioLookupFilters): Promise<LookupItem[]> {
  const path = "/lookups/portfolios";
  return await getLookup(
    path,
    withQuery(path, {
      cif_id: filters?.cifId,
      booking_center: filters?.bookingCenter,
      q: filters?.q,
      limit: filters?.limit,
    })
  );
}

export async function getInstrumentLookups(filters?: InstrumentLookupFilters): Promise<LookupItem[]> {
  const path = "/lookups/instruments";
  return await getLookup(
    path,
    withQuery(path, {
      limit: filters?.limit ?? 200,
      product_type: filters?.productType,
      q: filters?.q,
    })
  );
}

export async function getCurrencyLookups(filters?: CurrencyLookupFilters): Promise<LookupItem[]> {
  const path = "/lookups/currencies";
  return await getLookup(
    path,
    withQuery(path, {
      instrument_page_limit: filters?.instrumentPageLimit,
      source: filters?.source,
      q: filters?.q,
      limit: filters?.limit,
    })
  );
}

export type { LookupItem };
