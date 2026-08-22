import { beforeEach, describe, expect, it, vi } from "vitest";

import ManagePage from "@/app/manage/page";

const redirectMock = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

describe("ManagePage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("preserves an explicit governed context when resolving the legacy alias", async () => {
    await expect(
      ManagePage({
        searchParams: Promise.resolve({
          portfolioId: "PB SG/001",
          asOfDate: "2026-06-30",
          period: "3Y",
          reportingCurrency: "SGD",
        }),
      }),
    ).rejects.toThrowError(
      "REDIRECT:/workbench/PB%20SG%2F001?portfolioId=PB+SG%2F001&asOfDate=2026-06-30&period=3Y&reportingCurrency=SGD",
    );
  });

  it.each([
    {},
    { portfolioId: ["PB_001", "PB_002"] },
    { portfolioId: "PB_001", reportingCurrency: "US Dollar" },
  ])("routes missing or invalid alias context to My book: %o", async (searchParams) => {
    await expect(
      ManagePage({ searchParams: Promise.resolve(searchParams) }),
    ).rejects.toThrowError("REDIRECT:/book");
    expect(redirectMock).toHaveBeenLastCalledWith("/book");
  });
});
