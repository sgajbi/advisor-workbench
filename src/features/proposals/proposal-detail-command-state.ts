import type { QueryClient } from "@tanstack/react-query";

export type PersistedCommandSnapshot<T> = Readonly<{
  data: T | null;
  error: unknown;
  status: "error" | "idle" | "pending" | "success";
  submittedAt: number;
}>;

export function latestCommandSnapshot<T>(
  snapshots: readonly PersistedCommandSnapshot<T>[],
): PersistedCommandSnapshot<T> | null {
  let latest: PersistedCommandSnapshot<T> | null = null;
  for (const snapshot of snapshots) {
    if (!latest || snapshot.submittedAt >= latest.submittedAt) {
      latest = snapshot;
    }
  }
  return latest;
}

export function removeSettledCommandHistory(
  queryClient: QueryClient,
  mutationKey: readonly unknown[],
) {
  const mutationCache = queryClient.getMutationCache();
  for (const mutation of mutationCache.findAll({ exact: true, mutationKey })) {
    if (mutation.state.status !== "pending") {
      mutationCache.remove(mutation);
    }
  }
}
