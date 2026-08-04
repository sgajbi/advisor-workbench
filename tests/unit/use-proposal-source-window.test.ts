import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useProposalSourceWindow } from "@/features/proposals/use-proposal-source-window";

describe("useProposalSourceWindow", () => {
  it("moves through source cursors without unbounded automatic loading", () => {
    const { result } = renderHook(() => useProposalSourceWindow());

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
    const { result } = renderHook(() => useProposalSourceWindow());

    act(() => result.current.showNext(null));

    expect(result.current.windowNumber).toBe(1);
    expect(result.current.cursor).toBeUndefined();
  });

  it("keeps its history consistent when the same continuation is activated twice", () => {
    const { result } = renderHook(() => useProposalSourceWindow());

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
});
