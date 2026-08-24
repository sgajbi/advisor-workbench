import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAdmittedSourceSelection } from "@/design-system";

describe("useAdmittedSourceSelection", () => {
  it("preserves a requested identity until the source can admit it", () => {
    const { result, rerender } = renderHook(
      ({ sourceResolved, admittedKeys }) =>
        useAdmittedSourceSelection({
          scopeKey: "portfolio-a:proposal-b",
          requestedKey: "proposal-b",
          admittedKeys,
          sourceResolved,
        }),
      {
        initialProps: {
          sourceResolved: false,
          admittedKeys: [] as string[],
        },
      },
    );

    expect(result.current[0]).toBe("proposal-b");

    rerender({
      sourceResolved: true,
      admittedKeys: ["proposal-a", "proposal-b"],
    });

    expect(result.current[0]).toBe("proposal-b");
  });

  it("admits the first source-ranked item as the initial fallback", () => {
    const { result } = renderHook(() =>
      useAdmittedSourceSelection({
        scopeKey: "portfolio-a",
        admittedKeys: ["proposal-a", "proposal-b"],
        sourceResolved: true,
      }),
    );

    expect(result.current[0]).toBe("proposal-a");
  });

  it("retains an admitted identity when source ranking changes", () => {
    const { result, rerender } = renderHook(
      ({ admittedKeys }) =>
        useAdmittedSourceSelection({
          scopeKey: "portfolio-a",
          admittedKeys,
          sourceResolved: true,
        }),
      {
        initialProps: { admittedKeys: ["proposal-a", "proposal-b"] },
      },
    );

    act(() => result.current[1]("proposal-b"));
    rerender({ admittedKeys: ["proposal-b", "proposal-a"] });

    expect(result.current[0]).toBe("proposal-b");
  });

  it("falls back after the selected identity leaves the source response", () => {
    const { result, rerender } = renderHook(
      ({ admittedKeys }) =>
        useAdmittedSourceSelection({
          scopeKey: "portfolio-a",
          admittedKeys,
          sourceResolved: true,
        }),
      {
        initialProps: { admittedKeys: ["proposal-a", "proposal-b"] },
      },
    );

    act(() => result.current[1]("proposal-b"));
    rerender({ admittedKeys: ["proposal-c"] });

    expect(result.current[0]).toBe("proposal-c");
  });

  it("resets selection when the source scope changes", () => {
    const { result, rerender } = renderHook(
      ({ scopeKey, requestedKey, admittedKeys }) =>
        useAdmittedSourceSelection({
          scopeKey,
          requestedKey,
          admittedKeys,
          sourceResolved: true,
        }),
      {
        initialProps: {
          scopeKey: "portfolio-a",
          requestedKey: null as string | null,
          admittedKeys: ["proposal-a"],
        },
      },
    );

    rerender({
      scopeKey: "portfolio-b:proposal-b",
      requestedKey: "proposal-b",
      admittedKeys: ["proposal-b", "proposal-c"],
    });

    expect(result.current[0]).toBe("proposal-b");
  });
});
