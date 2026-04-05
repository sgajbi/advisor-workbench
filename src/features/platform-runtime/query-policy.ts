export const WORKBENCH_QUERY_STALE_TIME_MS = 30_000;
export const WORKBENCH_QUERY_GC_TIME_MS = 300_000;

export const workbenchQueryDefaults = {
  staleTime: WORKBENCH_QUERY_STALE_TIME_MS,
  gcTime: WORKBENCH_QUERY_GC_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export const workbenchStrictQueryDefaults = {
  ...workbenchQueryDefaults,
  retry: false,
} as const;
