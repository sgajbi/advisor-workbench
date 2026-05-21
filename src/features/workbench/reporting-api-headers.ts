export function buildReportBatchCallerHeaders(params: {
  actorId: string;
  tenantId: string;
  region: string;
  bookingCenterCode?: string | null;
  role?: string;
  correlationId: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Actor-Id": params.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Tenant-Id": params.tenantId,
    "X-Region": params.region,
    "X-Role": params.role ?? "front-office-operator",
    "X-Correlation-Id": params.correlationId,
  };
  if (params.bookingCenterCode) {
    headers["X-Booking-Center-Code"] = params.bookingCenterCode;
  }
  return headers;
}
