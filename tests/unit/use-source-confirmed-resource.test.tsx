import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSourceConfirmedResource } from "@/apps/performance/components/use-source-confirmed-resource";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useSourceConfirmedResource", () => {
  it("withholds ready evidence synchronously when the active request key changes", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const loads = new Map([
      ["first", () => first.promise],
      ["second", () => second.promise],
    ]);
    const { result, rerender } = renderHook(
      ({ requestKey }: { requestKey: string }) =>
        useSourceConfirmedResource({
          requestKey,
          load: loads.get(requestKey)!,
        }),
      { initialProps: { requestKey: "first" } },
    );

    await act(async () => first.resolve("first evidence"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    rerender({ requestKey: "second" });

    expect(result.current.state).toEqual({
      status: "loading",
      value: null,
      httpStatus: null,
    });

    await act(async () => second.resolve("second evidence"));
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "ready",
        value: "second evidence",
        httpStatus: null,
      }),
    );
  });
});
