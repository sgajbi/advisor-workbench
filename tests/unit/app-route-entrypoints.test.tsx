import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeAppPage from "@/apps/home/page";
import PerformanceAppPage from "@/apps/performance/page";
import RecommendationsAppPage from "@/apps/recommendations/page";

const redirectMock = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

describe("app route entrypoints", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("routes home into the portfolio workspace", () => {
    expect(() => HomeAppPage()).toThrowError("REDIRECT:/portfolio");
    expect(redirectMock).toHaveBeenCalledWith("/portfolio");
  });

  it("routes performance into the analytics surface with portfolio context", async () => {
    await expect(
      PerformanceAppPage({ searchParams: Promise.resolve({ portfolioId: "PORT_1001" }) })
    ).rejects.toThrowError("REDIRECT:/pa/analytics?portfolioId=PORT_1001");
  });

  it("routes recommendations into proposal simulation when portfolio context exists", async () => {
    await expect(
      RecommendationsAppPage({ searchParams: Promise.resolve({ portfolioId: "PORT_1001" }) })
    ).rejects.toThrowError("REDIRECT:/proposals/simulate?portfolioId=PORT_1001");
  });

  it("routes recommendations into the list workspace when no portfolio is selected", async () => {
    await expect(
      RecommendationsAppPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrowError("REDIRECT:/proposals");
  });
});
