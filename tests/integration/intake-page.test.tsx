import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Providers from "@/app/providers";
import IntakePage from "@/app/intake/page";

const ingestPortfolioBundleMock = vi.fn();
const getPortfolioLookupsMock = vi.fn();
const getInstrumentLookupsMock = vi.fn();
const getCurrencyLookupsMock = vi.fn();

vi.mock("@/features/intake/api", () => ({
  ingestPortfolioBundle: (...args: unknown[]) => ingestPortfolioBundleMock(...args),
}));

vi.mock("@/features/intake/lookups-api", () => ({
  getPortfolioLookups: (...args: unknown[]) => getPortfolioLookupsMock(...args),
  getInstrumentLookups: (...args: unknown[]) => getInstrumentLookupsMock(...args),
  getCurrencyLookups: (...args: unknown[]) => getCurrencyLookupsMock(...args),
}));

describe("IntakePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    ingestPortfolioBundleMock.mockReset();
    getPortfolioLookupsMock.mockReset();
    getInstrumentLookupsMock.mockReset();
    getCurrencyLookupsMock.mockReset();

    ingestPortfolioBundleMock.mockResolvedValue({
      correlation_id: "corr-intake",
      contract_version: "v1",
      data: {
        published_counts: {
          portfolios: 1,
          instruments: 0,
          transactions: 0,
          market_prices: 0,
        },
      },
    });
    getPortfolioLookupsMock.mockResolvedValue([{ id: "PORT_UI_1001", label: "PORT_UI_1001" }]);
    getInstrumentLookupsMock.mockResolvedValue([{ id: "SEC_AAPL_UI", label: "Apple Inc." }]);
    getCurrencyLookupsMock.mockResolvedValue([{ id: "USD", label: "USD" }]);
  });

  it("supports selector catalog loading, workspace switching, and create-portfolio submission", async () => {
    render(
      <Providers>
        <IntakePage />
      </Providers>
    );

    expect(
      screen.getByRole("heading", { name: "Portfolio Intake Operations Console" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Portfolio Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Intake operation" })).toHaveClass(
      "workbench-segmented-control",
      "intake-operation-tabs"
    );

    fireEvent.click(screen.getByRole("button", { name: "Load Selector Catalog" }));

    await waitFor(() => {
      expect(getPortfolioLookupsMock).toHaveBeenCalled();
      expect(getInstrumentLookupsMock).toHaveBeenCalled();
      expect(getCurrencyLookupsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("tab", { name: /^Add Positions$/i }));
    expect(screen.getByRole("heading", { name: "Add Positions Workspace" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^Add Transactions$/i }));
    expect(screen.getByRole("heading", { name: "Add Transactions Workspace" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^Add Instruments$/i }));
    expect(screen.getByRole("heading", { name: "Add Instruments Workspace" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^Add Market Data$/i }));
    expect(screen.getByRole("heading", { name: "Add Market Data Workspace" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^Create Portfolio$/i }));
    expect(screen.getByRole("heading", { name: "Create Portfolio Workspace" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit Operation" }));

    await waitFor(() => {
      expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1);
    });
    expect(ingestPortfolioBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "UPSERT",
        sourceSystem: "ADVISOR_WORKBENCH_UI_CREATE_PORTFOLIO",
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^workbench-intake-bundle-create-portfolio-/),
      })
    );

    expect(
      await screen.findByText((content) => /CREATE PORTFOLIO queued\./i.test(content))
    ).toBeInTheDocument();
  });

  it("keeps the same idempotency key when retrying a failed transaction submission", async () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValueOnce(2_000);
    ingestPortfolioBundleMock
      .mockRejectedValueOnce(new Error("temporary gateway outage"))
      .mockResolvedValueOnce({
        correlation_id: "corr-intake",
        contract_version: "v1",
        data: {
          published_counts: {
            portfolios: 1,
            instruments: 0,
            transactions: 0,
            market_prices: 0,
          },
        },
      });

    render(
      <Providers>
        <IntakePage />
      </Providers>
    );

    fireEvent.click(screen.getByRole("tab", { name: /^Add Transactions$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Operation" }));

    expect(await screen.findByText("temporary gateway outage")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit Operation" }));

    await waitFor(() => {
      expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(2);
    });

    const firstOptions = ingestPortfolioBundleMock.mock.calls[0][1] as { idempotencyKey: string };
    const retryOptions = ingestPortfolioBundleMock.mock.calls[1][1] as { idempotencyKey: string };
    const firstPayload = ingestPortfolioBundleMock.mock.calls[0][0] as { transactions: Array<{ transaction_id: string }> };
    const retryPayload = ingestPortfolioBundleMock.mock.calls[1][0] as { transactions: Array<{ transaction_id: string }> };

    expect(retryPayload.transactions[0].transaction_id).not.toBe(firstPayload.transactions[0].transaction_id);
    expect(retryOptions.idempotencyKey).toBe(firstOptions.idempotencyKey);
    expect(
      await screen.findByText((content) => /ADD TRANSACTIONS queued\./i.test(content))
    ).toBeInTheDocument();
  });
});
