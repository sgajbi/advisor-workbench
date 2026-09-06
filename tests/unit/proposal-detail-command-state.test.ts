import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  latestCommandSnapshot,
  removeSettledCommandHistory,
} from "../../src/features/proposals/proposal-detail-command-state";
import { proposalDetailMutationKeys } from "../../src/features/proposals/proposal-detail-query-keys";

describe("proposal detail command state", () => {
  it("projects the latest submitted command snapshot", () => {
    expect(latestCommandSnapshot([
      { data: "earlier", error: null, status: "success", submittedAt: 10 },
      { data: null, error: null, status: "pending", submittedAt: 20 },
    ])).toEqual({
      data: null,
      error: null,
      status: "pending",
      submittedAt: 20,
    });
  });

  it("removes only settled history for the exact proposal command kind", async () => {
    const queryClient = new QueryClient();
    const mutationCache = queryClient.getMutationCache();
    const lifecycleKey = proposalDetailMutationKeys.lifecycle("pp-1");
    const pendingLifecycle = mutationCache.build<void, Error, void, unknown>(queryClient, {
      mutationKey: lifecycleKey,
      mutationFn: async () => await new Promise<void>(() => undefined),
    });
    const settledLifecycle = mutationCache.build<void, Error, void, unknown>(queryClient, {
      mutationKey: lifecycleKey,
      mutationFn: async () => undefined,
    });
    const otherProposal = mutationCache.build<void, Error, void, unknown>(queryClient, {
      mutationKey: proposalDetailMutationKeys.lifecycle("pp-2"),
      mutationFn: async () => undefined,
    });

    void pendingLifecycle.execute(undefined);
    await settledLifecycle.execute(undefined);
    await otherProposal.execute(undefined);
    removeSettledCommandHistory(queryClient, lifecycleKey);

    expect(mutationCache.getAll()).toContain(pendingLifecycle);
    expect(mutationCache.getAll()).not.toContain(settledLifecycle);
    expect(mutationCache.getAll()).toContain(otherProposal);
  });
});
