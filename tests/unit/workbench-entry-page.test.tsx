import { describe, expect, it, vi } from "vitest";

import WorkbenchEntryPage from "@/app/workbench/page";

const redirectMock = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

describe("WorkbenchEntryPage", () => {
  it("routes unscoped entry to the source-backed portfolio chooser without a lookup call", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(() => WorkbenchEntryPage()).toThrowError("REDIRECT:/book");
    expect(redirectMock).toHaveBeenCalledWith("/book");
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
