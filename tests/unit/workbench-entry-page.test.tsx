import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

describe("WorkbenchEntryPage", () => {
  const originalFallback = process.env.WORKBENCH_FALLBACK_PORTFOLIO_IDS;

  beforeEach(() => {
    redirectMock.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    if (originalFallback === undefined) {
      delete process.env.WORKBENCH_FALLBACK_PORTFOLIO_IDS;
    } else {
      process.env.WORKBENCH_FALLBACK_PORTFOLIO_IDS = originalFallback;
    }
  });

  it("redirects to the canonical portfolio when the lookup catalog contains it", async () => {
    vi.resetModules();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: "DEMO_ADV_USD_001", label: "Legacy demo" },
          { id: "PB_SG_GLOBAL_BAL_001", label: "Private Banking Global Balanced" },
        ],
      }),
    } as Response);

    const { default: WorkbenchEntryPage } = await import("@/app/workbench/page");
    await expect(WorkbenchEntryPage()).rejects.toThrowError(
      "REDIRECT:/workbench/PB_SG_GLOBAL_BAL_001"
    );
    expect(redirectMock).toHaveBeenCalledWith("/workbench/PB_SG_GLOBAL_BAL_001");
  });

  it("redirects to the first lookup portfolio when no preferred portfolio is available", async () => {
    vi.resetModules();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: "PORT_1001", label: "PORT_1001" }] }),
    } as Response);

    const { default: WorkbenchEntryPage } = await import("@/app/workbench/page");
    await expect(WorkbenchEntryPage()).rejects.toThrowError("REDIRECT:/workbench/PORT_1001");
    expect(redirectMock).toHaveBeenCalledWith("/workbench/PORT_1001");
  });

  it("uses the canonical portfolio before legacy fallbacks when lookup fetch fails", async () => {
    vi.resetModules();
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));

    const { default: WorkbenchEntryPage } = await import("@/app/workbench/page");
    await expect(WorkbenchEntryPage()).rejects.toThrowError(
      "REDIRECT:/workbench/PB_SG_GLOBAL_BAL_001"
    );
    expect(redirectMock).toHaveBeenCalledWith("/workbench/PB_SG_GLOBAL_BAL_001");
  });

  it("redirects to the configured fallback when lookup fetch fails", async () => {
    process.env.WORKBENCH_FALLBACK_PORTFOLIO_IDS = "FALLBACK_001,FALLBACK_002";
    vi.resetModules();
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));

    const { default: WorkbenchEntryPage } = await import("@/app/workbench/page");
    await expect(WorkbenchEntryPage()).rejects.toThrowError("REDIRECT:/workbench/FALLBACK_001");
    expect(redirectMock).toHaveBeenCalledWith("/workbench/FALLBACK_001");
  });

  it("renders an empty state when no lookup or fallback portfolio exists", async () => {
    process.env.WORKBENCH_FALLBACK_PORTFOLIO_IDS = "";
    vi.resetModules();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);

    const { default: WorkbenchEntryPage } = await import("@/app/workbench/page");
    render(await WorkbenchEntryPage());

    expect(screen.getByRole("heading", { name: "Decision Console" })).toBeInTheDocument();
    expect(
      screen.getByText(/No portfolio is currently available from the platform lookup catalog/i)
    ).toBeInTheDocument();
  });
});
