const DEFAULT_CALLER_CONTEXT_HEADERS = {
  "X-Actor-Id": "workbench-system",
  "X-Caller-Application": "lotus-workbench",
  "X-Tenant-Id": "tenant-sg",
  "X-Region": "APAC",
  "X-Booking-Center-Code": "SG",
  "X-Role": "advisor",
} as const;

const CALLER_CONTEXT_ENV_OVERRIDES: Record<
  keyof typeof DEFAULT_CALLER_CONTEXT_HEADERS,
  string
> = {
  "X-Actor-Id": "WORKBENCH_BFF_ACTOR_ID",
  "X-Caller-Application": "WORKBENCH_BFF_CALLER_APPLICATION",
  "X-Tenant-Id": "WORKBENCH_BFF_TENANT_ID",
  "X-Region": "WORKBENCH_BFF_REGION",
  "X-Booking-Center-Code": "WORKBENCH_BFF_BOOKING_CENTER_CODE",
  "X-Role": "WORKBENCH_BFF_ROLE",
};

function defaultCallerContextValue(
  headerName: keyof typeof DEFAULT_CALLER_CONTEXT_HEADERS
) {
  const configured = process.env[CALLER_CONTEXT_ENV_OVERRIDES[headerName]]?.trim();
  return configured || DEFAULT_CALLER_CONTEXT_HEADERS[headerName];
}

export function applyDefaultCallerContextHeaders(headers: Headers) {
  for (const headerName of Object.keys(DEFAULT_CALLER_CONTEXT_HEADERS) as Array<
    keyof typeof DEFAULT_CALLER_CONTEXT_HEADERS
  >) {
    if (!headers.get(headerName)?.trim()) {
      headers.set(headerName, defaultCallerContextValue(headerName));
    }
  }
}
