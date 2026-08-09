import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import IntakePage from "@/app/intake/page";
import Providers from "@/app/providers";

const ingestPortfolioBundleMock = vi.fn();
const getPortfolioLookupsMock = vi.fn();
const getInstrumentLookupsMock = vi.fn();
const getCurrencyLookupsMock = vi.fn();
const SOURCE_ACTION_TEST_TIMEOUT_MS = 15_000;

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

    ingestPortfolioBundleMock.mockResolvedValue(sourceConfirmation());
    getPortfolioLookupsMock.mockResolvedValue([{ id: "PORT_001", label: "PORT_001" }]);
    getInstrumentLookupsMock.mockResolvedValue([{ id: "SEC_001", label: "Global Equity Fund" }]);
    getCurrencyLookupsMock.mockResolvedValue([{ id: "USD", label: "USD" }]);
  });

  function renderIntakePage() {
    render(
      <Providers>
        <IntakePage />
      </Providers>,
    );
  }

  it("starts with an explicit task choice, no fabricated values, and no mutation control", () => {
    renderIntakePage();

    expect(screen.getByRole("heading", { name: "Portfolio Intake" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start an intake request" })).toBeInTheDocument();
    expect(screen.getByText("No request started")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review request" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Publish reviewed request/i })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/PORT_UI_1001|CIF_UI_1001|advisor_1|Apple Inc\.|Readiness 100%|Pipeline Live|Private Banking UX Notes/);
    expect(ingestPortfolioBundleMock).not.toHaveBeenCalled();
  });

  it("shows every concrete validation gap and never publishes from first paint", async () => {
    renderIntakePage();

    fireEvent.click(screen.getByRole("button", { name: /Create portfolio record/i }));
    expect(screen.getByRole("heading", { name: "Create portfolio record" })).toBeInTheDocument();
    expect(screen.getByLabelText("New portfolio code")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    expect(screen.getByText("Resolve the following before review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enter the new portfolio code." })).toHaveAttribute(
      "href",
      "#intake-portfolioId",
    );
    expect(screen.getByText("10 validation issues must be resolved.")).toBeInTheDocument();
    expect(ingestPortfolioBundleMock).not.toHaveBeenCalled();
  });

  it("loads optional source suggestions without replacing manual entry", async () => {
    renderIntakePage();
    fireEvent.click(screen.getByRole("button", { name: /Create portfolio record/i }));

    fireEvent.click(screen.getByRole("button", { name: "Load reference data" }));

    await waitFor(() => {
      expect(getPortfolioLookupsMock).toHaveBeenCalledTimes(1);
      expect(getInstrumentLookupsMock).toHaveBeenCalledTimes(1);
      expect(getCurrencyLookupsMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Reference suggestions available")).toBeInTheDocument();
    expect(screen.getByLabelText("New portfolio code")).toBeEnabled();
  });

  it("requires review before publication and renders only source-confirmed success", async () => {
    renderIntakePage();
    startValidPortfolioRequest();

    expect(ingestPortfolioBundleMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    expect(screen.getByText("Reviewed request")).toBeInTheDocument();
    expect(screen.getByText("Review portfolio creation")).toBeInTheDocument();
    expect(screen.getByText("PORT_001")).toBeInTheDocument();
    expect(ingestPortfolioBundleMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));

    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Publication confirmed")).toBeInTheDocument();
    expect(screen.getByText("Correlation corr-intake-001")).toBeInTheDocument();
    expect(screen.getByText("Contract v1")).toBeInTheDocument();
    expect(screen.getAllByText("Source confirmed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Reviewed request published" })).toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("invalidates review after a material edit", async () => {
    renderIntakePage();
    startValidPortfolioRequest();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    fireEvent.change(screen.getByLabelText("Client reference"), { target: { value: "CIF_002" } });

    expect(screen.queryByText("Reviewed request")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish reviewed request" })).not.toBeInTheDocument();
  });

  it("retries the exact reviewed payload with the same idempotency key", async () => {
    ingestPortfolioBundleMock
      .mockRejectedValueOnce(new Error("Portfolio intake was not accepted by the source service (503)."))
      .mockResolvedValueOnce(sourceConfirmation());
    renderIntakePage();
    startValidPortfolioRequest();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));
    expect(await screen.findByText(/source service \(503\)/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry publication" }));

    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(2));
    expect(ingestPortfolioBundleMock.mock.calls[1][0]).toEqual(ingestPortfolioBundleMock.mock.calls[0][0]);
    expect(ingestPortfolioBundleMock.mock.calls[1][1].idempotencyKey).toBe(
      ingestPortfolioBundleMock.mock.calls[0][1].idempotencyKey,
    );
    expect(await screen.findByText("Publication confirmed")).toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("adds a genuinely blank keyed row instead of copying business values", async () => {
    renderIntakePage();
    fireEvent.click(screen.getByRole("button", { name: /Load opening positions/i }));

    fireEvent.change(screen.getByLabelText("Security code, position 1"), { target: { value: "SEC_001" } });
    fireEvent.click(screen.getByRole("button", { name: "Add position" }));

    expect(screen.getByLabelText("Security code, position 1")).toHaveValue("SEC_001");
    expect(screen.getByLabelText("Security code, position 2")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Remove position 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove position 2" })).toBeInTheDocument();
  });

  it("parses a CSV into review state without publishing on file selection", async () => {
    renderIntakePage();
    fireEvent.click(screen.getByRole("button", { name: /Import an intake file/i }));

    const input = screen.getByLabelText("Supported CSV intake file");
    const file = new File([validCsv()], "intake.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => validCsv() });
    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(await screen.findByText("intake.csv")).toBeInTheDocument();
    expect(screen.getByText("Ready for review")).toBeInTheDocument();
    expect(ingestPortfolioBundleMock).not.toHaveBeenCalled();
  });

  function startValidPortfolioRequest() {
    fireEvent.click(screen.getByRole("button", { name: /Create portfolio record/i }));
    const values: Array<[string, string]> = [
      ["New portfolio code", "PORT_001"],
      ["Client reference", "CIF_001"],
      ["Responsible advisor code", "ADV_001"],
      ["Base currency", "USD"],
      ["Opening date", "2026-08-08"],
      ["Booking centre", "Singapore"],
      ["Mandate type", "Discretionary"],
      ["Approved risk profile", "Balanced"],
      ["Investment time horizon", "Long term"],
      ["Opening portfolio status", "Pending activation"],
    ];
    for (const [label, value] of values) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
  }
});

function sourceConfirmation() {
  return {
    correlation_id: "corr-intake-001",
    contract_version: "v1",
    data: {
      published_counts: {
        portfolios: 1,
        instruments: 0,
        transactions: 0,
        market_prices: 0,
      },
    },
  };
}

function validCsv(): string {
  return [
    "portfolio_id,base_currency,open_date,risk_exposure,investment_time_horizon,portfolio_type,booking_center,cif_id,advisor_id,status,security_id,instrument_name,isin,product_type,transaction_type,quantity,price,transaction_date",
    "PORT_001,USD,2026-08-08,Balanced,Long term,Discretionary,Singapore,CIF_001,ADV_001,Pending activation,SEC_001,Global Equity Fund,US0000000001,Fund,BUY,10,100,2026-08-08T00:00:00Z",
  ].join("\n");
}
