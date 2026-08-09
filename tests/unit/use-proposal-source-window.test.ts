import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useProposalSourceWindow } from "@/features/proposals/use-proposal-source-window";

describe("useProposalSourceWindow", () => {
  it("moves through source cursors without unbounded automatic loading", () => {
    const { result } = renderHook(() => useProposalSourceWindow("portfolio-a"));

    expect(result.current).toMatchObject({
      cursor: undefined,
      windowNumber: 1,
      hasPrevious: false,
    });

    act(() => result.current.showNext("cursor-window-2"));
    expect(result.current).toMatchObject({
      cursor: "cursor-window-2",
      windowNumber: 2,
      hasPrevious: true,
    });

    act(() => result.current.showPrevious());
    expect(result.current).toMatchObject({
      cursor: undefined,
      windowNumber: 1,
      hasPrevious: false,
    });
  });

  it("does not advance without a source continuation cursor", () => {
    const { result } = renderHook(() => useProposalSourceWindow("portfolio-a"));

    act(() => result.current.showNext(null));

    expect(result.current.windowNumber).toBe(1);
    expect(result.current.cursor).toBeUndefined();
  });

  it("keeps its history consistent when the same continuation is activated twice", () => {
    const { result } = renderHook(() => useProposalSourceWindow("portfolio-a"));

    act(() => {
      result.current.showNext("cursor-window-2");
      result.current.showNext("cursor-window-2");
    });

    expect(result.current).toMatchObject({
      cursor: "cursor-window-2",
      windowNumber: 2,
      hasPrevious: true,
    });
  });

  it("resets the visible source window when its portfolio scope changes", () => {
    const { result, rerender } = renderHook(
      ({ portfolioId }) => useProposalSourceWindow(portfolioId),
      { initialProps: { portfolioId: "portfolio-a" } }
    );

    act(() => result.current.showNext("portfolio-a-window-2"));
    expect(result.current).toMatchObject({
      cursor: "portfolio-a-window-2",
      windowNumber: 2,
      hasPrevious: true,
    });

    rerender({ portfolioId: "portfolio-b" });

    expect(result.current).toMatchObject({
      cursor: undefined,
      windowNumber: 1,
      hasPrevious: false,
    });

    rerender({ portfolioId: "portfolio-a" });

    expect(result.current).toMatchObject({
      cursor: undefined,
      windowNumber: 1,
      hasPrevious: false,
    });
  });
});
