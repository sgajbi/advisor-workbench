import { afterEach, describe, expect, it, vi } from "vitest";

import ProposalSimulatePage from "../../src/app/proposals/simulate/page";

const redirectMock = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

describe("ProposalSimulatePage", () => {
  afterEach(() => {
    redirectMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("redirects proposal simulation into performance when a portfolio is selected", async () => {
    await expect(
      ProposalSimulatePage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      })
    ).rejects.toThrowError("REDIRECT:/performance?portfolioId=PORT_UI_1001");
  });

  it("redirects proposal simulation into portfolio when no portfolio is selected", async () => {
    await expect(
      ProposalSimulatePage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrowError("REDIRECT:/portfolio");
  });
});

