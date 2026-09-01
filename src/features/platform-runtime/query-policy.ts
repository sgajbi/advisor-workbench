export const WORKBENCH_QUERY_STALE_TIME_MS = 30_000;
export const WORKBENCH_QUERY_GC_TIME_MS = 300_000;

type WorkbenchQueryStatus = "pending" | "error" | "success";

export function getWorkbenchQueryRevalidationInterval(
  dataUpdatedAt: number,
  status: WorkbenchQueryStatus,
  now = Date.now(),
): number {
  if (status === "error" || dataUpdatedAt <= 0) {
    return WORKBENCH_QUERY_STALE_TIME_MS;
  }
  return Math.min(
    WORKBENCH_QUERY_STALE_TIME_MS,
    Math.max(1, WORKBENCH_QUERY_STALE_TIME_MS - (now - dataUpdatedAt)),
  );
}

export const workbenchQueryDefaults = {
  staleTime: WORKBENCH_QUERY_STALE_TIME_MS,
  gcTime: WORKBENCH_QUERY_GC_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export const workbenchStrictQueryDefaults = {
  ...workbenchQueryDefaults,
  retry: false,
} as const;
