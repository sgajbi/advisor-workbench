import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSourceWindow } from "@/design-system";

describe("useSourceWindow", () => {
  it("moves through bounded source cursors and exposes the previous cursor", () => {
    const { result } = renderHook(() => useSourceWindow("portfolio-a"));

    expect(result.current).toMatchObject({
      cursor: undefined,
      previousCursor: undefined,
      windowNumber: 1,
      hasPrevious: false,
    });

    act(() => result.current.showNext("cursor-window-2"));
    act(() => result.current.showNext("cursor-window-3"));

    expect(result.current).toMatchObject({
      cursor: "cursor-window-3",
      previousCursor: "cursor-window-2",
      windowNumber: 3,
      hasPrevious: true,
    });

    act(() => result.current.showPrevious());
    expect(result.current).toMatchObject({
      cursor: "cursor-window-2",
      previousCursor: undefined,
      windowNumber: 2,
      hasPrevious: true,
    });
  });

  it("does not advance without a source continuation cursor", () => {
    const { result } = renderHook(() => useSourceWindow("portfolio-a"));

    act(() => result.current.showNext(null));

    expect(result.current.windowNumber).toBe(1);
    expect(result.current.cursor).toBeUndefined();
  });

  it("does not duplicate the active continuation cursor", () => {
    const { result } = renderHook(() => useSourceWindow("portfolio-a"));

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

  it("resets the visible source window when its scope changes", () => {
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useSourceWindow(scopeKey),
      { initialProps: { scopeKey: "portfolio-a" } }
    );

    act(() => result.current.showNext("portfolio-a-window-2"));
    rerender({ scopeKey: "portfolio-b" });

    expect(result.current).toMatchObject({
      cursor: undefined,
      windowNumber: 1,
      hasPrevious: false,
    });

    rerender({ scopeKey: "portfolio-a" });
    expect(result.current).toMatchObject({
      cursor: undefined,
      windowNumber: 1,
      hasPrevious: false,
    });
  });

  it("rehydrates an addressed source cursor without inventing prior history", () => {
    const { result } = renderHook(() =>
      useSourceWindow("portfolio-a", {
        cursor: "cursor-window-4",
        windowNumber: 4,
      }),
    );

    expect(result.current).toMatchObject({
      cursor: "cursor-window-4",
      previousCursor: undefined,
      windowNumber: 4,
      hasPrevious: false,
    });

    act(() => result.current.showNext("cursor-window-5"));
    expect(result.current).toMatchObject({
      cursor: "cursor-window-5",
      previousCursor: "cursor-window-4",
      windowNumber: 5,
      hasPrevious: true,
    });
  });
});
