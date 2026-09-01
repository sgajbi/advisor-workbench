import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { portfolioQueryKeys } from "../../src/apps/portfolio/portfolio-query-keys";
import {
  getWorkbenchQueryRevalidationInterval,
  WORKBENCH_QUERY_STALE_TIME_MS,
  workbenchStrictQueryDefaults,
} from "../../src/features/platform-runtime/query-policy";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: workbenchStrictQueryDefaults },
  });
}

describe("Portfolio Query freshness", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules revalidation from confirmed data age", () => {
    const now = 100_000;

    expect(
      getWorkbenchQueryRevalidationInterval(
        now - 20_000,
        "success",
        "idle",
        now,
      ),
    ).toBe(10_000);
    expect(
      getWorkbenchQueryRevalidationInterval(
        now - WORKBENCH_QUERY_STALE_TIME_MS,
        "success",
        "idle",
        now,
      ),
    ).toBe(1_000);
    expect(
      getWorkbenchQueryRevalidationInterval(
        now - WORKBENCH_QUERY_STALE_TIME_MS,
        "error",
        "idle",
        now,
      ),
    ).toBe(WORKBENCH_QUERY_STALE_TIME_MS);
    expect(
      getWorkbenchQueryRevalidationInterval(
        now - WORKBENCH_QUERY_STALE_TIME_MS,
        "success",
        "fetching",
        now,
      ),
    ).toBe(false);
    expect(
      getWorkbenchQueryRevalidationInterval(
        now - WORKBENCH_QUERY_STALE_TIME_MS,
        "success",
        "paused",
        now,
      ),
    ).toBe(false);
  });

  it("reuses fresh source truth and refetches it after the governed stale time", async () => {
    vi.useFakeTimers();
    const queryClient = createQueryClient();
    const queryFn = vi
      .fn<() => Promise<{ version: number }>>()
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ version: 2 });
    const queryKey = portfolioQueryKeys.workspaceSource(
      "PB_SG_GLOBAL_BAL_001",
      "generation-1",
    );

    await expect(
      queryClient.fetchQuery({ queryKey, queryFn }),
    ).resolves.toEqual({ version: 1 });
    await expect(
      queryClient.fetchQuery({ queryKey, queryFn }),
    ).resolves.toEqual({ version: 1 });
    expect(queryFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(WORKBENCH_QUERY_STALE_TIME_MS + 1);

    await expect(
      queryClient.fetchQuery({ queryKey, queryFn }),
    ).resolves.toEqual({ version: 2 });
    expect(queryFn).toHaveBeenCalledTimes(2);
    queryClient.clear();
  });

  it("coalesces concurrent reads for one exact source key", async () => {
    const queryClient = createQueryClient();
    let resolveSource: ((value: { version: number }) => void) | undefined;
    const queryFn = vi.fn(
      async () =>
        await new Promise<{ version: number }>((resolve) => {
          resolveSource = resolve;
        }),
    );
    const queryKey = portfolioQueryKeys.workspaceSource(
      "PB_SG_GLOBAL_BAL_001",
      "generation-1",
    );

    const first = queryClient.fetchQuery({ queryKey, queryFn });
    const second = queryClient.fetchQuery({ queryKey, queryFn });
    resolveSource?.({ version: 1 });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { version: 1 },
      { version: 1 },
    ]);
    expect(queryFn).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });

  it("invalidates a Portfolio detail family without affecting another portfolio", async () => {
    const queryClient = createQueryClient();
    const primaryKey = portfolioQueryKeys.summaryDetailsRoot(
      "PB_SG_GLOBAL_BAL_001",
    );
    const otherKey = portfolioQueryKeys.summaryDetailsRoot("PB_SG_GROWTH_002");
    queryClient.setQueryData(primaryKey, { version: 1 });
    queryClient.setQueryData(otherKey, { version: 1 });

    await queryClient.invalidateQueries({ queryKey: primaryKey });

    expect(queryClient.getQueryState(primaryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherKey)?.isInvalidated).toBe(false);
    queryClient.clear();
  });

  it("retains previously confirmed Portfolio truth when a stale refetch fails", async () => {
    const queryClient = createQueryClient();
    const queryKey = portfolioQueryKeys.workspaceSource(
      "PB_SG_GLOBAL_BAL_001",
      "generation-1",
    );
    queryClient.setQueryData(queryKey, { version: 1 });
    await queryClient.invalidateQueries({ queryKey, exact: true });

    await expect(
      queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          throw new Error("Gateway unavailable");
        },
      }),
    ).rejects.toThrow("Gateway unavailable");

    expect(queryClient.getQueryData(queryKey)).toEqual({ version: 1 });
    expect(queryClient.getQueryState(queryKey)?.status).toBe("error");
    queryClient.clear();
  });
});
