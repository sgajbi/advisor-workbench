import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  readPortfolioSectionPreferences,
  usePortfolioSectionPreferences,
} from "../../src/apps/portfolio/components/use-portfolio-section-preferences";

describe("usePortfolioSectionPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads persisted portfolio section preferences and ignores invalid values", () => {
    const storage = new Map<string, string | null>([
      ["lotus:portfolio:section:allocation", "false"],
      ["lotus:portfolio:section:top-holdings", "true"],
      ["lotus:portfolio:section:transactions", "collapsed"],
    ]);

    expect(
      readPortfolioSectionPreferences({
        getItem: (key) => storage.get(key) ?? null,
      }),
    ).toEqual({
      allocation: false,
      "top-holdings": true,
    });
  });

  it("uses view-mode defaults until a section preference is persisted", () => {
    const { result } = renderHook(() =>
      usePortfolioSectionPreferences("summary"),
    );

    expect(result.current.getSectionExpanded("allocation")).toBe(true);
    expect(result.current.getSectionExpanded("transactions")).toBe(false);
  });

  it("toggles portfolio section preferences and persists the advisor workspace choice", () => {
    const { result } = renderHook(() =>
      usePortfolioSectionPreferences("summary"),
    );

    act(() => {
      result.current.toggleSection("transactions");
    });

    expect(result.current.getSectionExpanded("transactions")).toBe(true);
    expect(
      window.localStorage.getItem("lotus:portfolio:section:transactions"),
    ).toBe("true");

    act(() => {
      result.current.toggleSection("transactions");
    });

    expect(result.current.getSectionExpanded("transactions")).toBe(false);
    expect(
      window.localStorage.getItem("lotus:portfolio:section:transactions"),
    ).toBe("false");
  });
});
