import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSourceRefreshAction } from "../../src/design-system/hooks/use-source-refresh-action";

describe("useSourceRefreshAction", () => {
  it("publishes confirmed state only after the source refresh resolves", async () => {
    let resolveRefresh!: (value: unknown) => void;
    const onRefresh = vi.fn(
      async () =>
        await new Promise<unknown>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useSourceRefreshAction({
        identity: "proposal-a:3",
        isRefreshing: false,
        hasRefreshFailure: false,
        onRefresh,
      }),
    );

    let refreshPromise!: Promise<unknown>;
    act(() => {
      refreshPromise = result.current.refresh();
    });
    expect(result.current.refreshState).toBe("pending");

    await act(async () => {
      resolveRefresh({ data: "source-confirmed" });
      await refreshPromise;
    });
    expect(result.current.refreshState).toBe("confirmed");
  });

  it("fails closed when any refresh result contains a query error", async () => {
    const { result } = renderHook(() =>
      useSourceRefreshAction({
        identity: "proposal-a:3",
        isRefreshing: false,
        hasRefreshFailure: false,
        onRefresh: async () => [
          { data: "detail", error: null },
          { data: undefined, error: new Error("approvals unavailable") },
        ],
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.refreshState).toBe("failed");
  });

  it("discards a late result after the selected source identity changes", async () => {
    let resolveRefresh!: (value: unknown) => void;
    const onRefresh = vi.fn(
      async () =>
        await new Promise<unknown>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ identity }: { identity: string }) =>
        useSourceRefreshAction({
          identity,
          isRefreshing: false,
          hasRefreshFailure: false,
          onRefresh,
        }),
      { initialProps: { identity: "proposal-a:3" } },
    );

    let refreshPromise!: Promise<unknown>;
    act(() => {
      refreshPromise = result.current.refresh();
    });
    rerender({ identity: "proposal-b:5" });
    expect(result.current.refreshState).toBeNull();

    await act(async () => {
      resolveRefresh({ data: "stale-proposal-a" });
      await refreshPromise;
    });
    expect(result.current.refreshState).toBeNull();
  });

  it("discards a superseded result even when the same source identity returns", async () => {
    let resolveRefresh!: (value: unknown) => void;
    const onRefresh = vi.fn(
      async () =>
        await new Promise<unknown>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ identity }: { identity: string }) =>
        useSourceRefreshAction({
          identity,
          isRefreshing: false,
          hasRefreshFailure: false,
          onRefresh,
        }),
      { initialProps: { identity: "proposal-a:3" } },
    );

    let refreshPromise!: Promise<unknown>;
    act(() => {
      refreshPromise = result.current.refresh();
      result.current.reset();
    });
    rerender({ identity: "proposal-b:5" });
    rerender({ identity: "proposal-a:3" });

    await act(async () => {
      resolveRefresh({ data: "superseded-proposal-a" });
      await refreshPromise;
    });
    expect(result.current.refreshState).toBeNull();
  });

  it("projects background refresh and refresh-failure posture", async () => {
    const onRefresh = vi.fn(async () => ({ data: "unused" }));
    const { result, rerender } = renderHook(
      ({ isRefreshing, hasRefreshFailure }) =>
        useSourceRefreshAction({
          identity: "proposal-a:3",
          isRefreshing,
          hasRefreshFailure,
          onRefresh,
        }),
      {
        initialProps: { isRefreshing: true, hasRefreshFailure: false },
      },
    );

    expect(result.current.refreshState).toBe("pending");
    rerender({ isRefreshing: false, hasRefreshFailure: true });
    await waitFor(() => expect(result.current.refreshState).toBe("failed"));
  });
});
