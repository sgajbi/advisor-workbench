import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdvisorBook } from "@/features/advisor-book/use-advisor-book";

const getAdvisorBookMock = vi.fn();

vi.mock("@/features/advisor-book/api", () => ({
  getAdvisorBook: (...args: unknown[]) => getAdvisorBookMock(...args),
}));

describe("useAdvisorBook", () => {
  beforeEach(() => {
    getAdvisorBookMock.mockReset();
  });

  it("reloads when the source query changes", async () => {
    getAdvisorBookMock
      .mockResolvedValueOnce({ correlation_id: "first" })
      .mockResolvedValueOnce({ correlation_id: "second" });
    const { result, rerender } = renderHook(
      ({ clientId }) =>
        useAdvisorBook({ asOfDate: "2026-04-10", clientId }),
      { initialProps: { clientId: "CIF_001" } },
    );

    await waitFor(() => expect(result.current.response).toEqual({ correlation_id: "first" }));
    rerender({ clientId: "CIF_002" });
    await waitFor(() => expect(result.current.response).toEqual({ correlation_id: "second" }));
    expect(getAdvisorBookMock).toHaveBeenNthCalledWith(2, {
      asOfDate: "2026-04-10",
      clientId: "CIF_002",
    });
  });

  it("supports an explicit retry after an unavailable response", async () => {
    let resolveRetry: ((value: { correlation_id: string }) => void) | null = null;
    getAdvisorBookMock
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
      );
    const { result } = renderHook(() => useAdvisorBook({ asOfDate: "2026-04-10" }));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    let retry: Promise<void> | null = null;
    act(() => {
      retry = result.current.reload();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolveRetry?.({ correlation_id: "recovered" });
      await retry;
    });
    expect(result.current.response).toEqual({ correlation_id: "recovered" });
    expect(result.current.error).toBeNull();
  });

  it("recovers one out-of-range source page before publishing ready state", async () => {
    getAdvisorBookMock
      .mockResolvedValueOnce({
        items: [],
        page: { total_count: 2, offset: 100, limit: 100 },
      })
      .mockResolvedValueOnce({
        items: [{ portfolio_id: "PB_SG_GLOBAL_BAL_001" }],
        page: { total_count: 2, offset: 0, limit: 100 },
      });

    const { result } = renderHook(() =>
      useAdvisorBook(
        { asOfDate: "2026-04-22", offset: 100, limit: 100 },
        { recoverOutOfRange: true },
      ),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getAdvisorBookMock).toHaveBeenNthCalledWith(2, {
      asOfDate: "2026-04-22",
      clientId: undefined,
      mandateType: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      offset: 0,
      limit: 100,
    });
    expect(result.current.response).toEqual({
      items: [{ portfolio_id: "PB_SG_GLOBAL_BAL_001" }],
      page: { total_count: 2, offset: 0, limit: 100 },
    });
    expect(result.current.error).toBeNull();
  });
});
