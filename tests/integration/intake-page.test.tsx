import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import IntakePage from "@/app/intake/page";
import Providers from "@/app/providers";
import { INTAKE_PREVIEW_PAGE_SIZE } from "@/features/intake/components/intake-record-preview";

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

  it("shows and publishes the same normalized business request", async () => {
    renderIntakePage();
    startValidPortfolioRequest({
      "New portfolio code": " PORT_001 ",
      "Base currency": " usd ",
      "Client reference": " CIF_001 ",
    });

    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    const reviewedRequest = screen.getByText("Reviewed request").closest("section");
    if (!reviewedRequest) throw new Error("Expected reviewed-request section");
    expect(within(reviewedRequest).getByText("PORT_001")).toBeInTheDocument();
    expect(within(reviewedRequest).getByText("USD")).toBeInTheDocument();
    expect(within(reviewedRequest).getByText("2026-08-08")).toBeInTheDocument();
    expect(within(reviewedRequest).getByText("CIF_001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));

    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1));
    expect(ingestPortfolioBundleMock.mock.calls[0][0]).toEqual(expect.objectContaining({
      businessDates: [{ businessDate: "2026-08-08" }],
      portfolios: [expect.objectContaining({
        portfolioId: "PORT_001",
        baseCurrency: "USD",
        openDate: "2026-08-08",
        cifId: "CIF_001",
      })],
    }));
    expect(await screen.findByText("Publication confirmed")).toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("does not confirm publication from zero-count source evidence", async () => {
    ingestPortfolioBundleMock.mockResolvedValueOnce({
      correlation_id: "corr-intake-001",
      contract_version: "v1",
      data: {
        published_counts: {
          portfolios: 0,
        },
      },
    });
    renderIntakePage();
    startValidPortfolioRequest();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));

    expect(await screen.findByText(/payload-matching published record counts/i)).toBeInTheDocument();
    expect(screen.queryByText("Publication confirmed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry publication" })).toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("invalidates review after a material edit", async () => {
    renderIntakePage();
    startValidPortfolioRequest();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    fireEvent.change(screen.getByLabelText("Client reference"), { target: { value: "CIF_002" } });

    expect(screen.queryByText("Reviewed request")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish reviewed request" })).not.toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("retries the exact reviewed payload with the same idempotency key", async () => {
    const pendingFailure = deferred<ReturnType<typeof sourceConfirmation>>();
    ingestPortfolioBundleMock.mockReturnValueOnce(pendingFailure.promise).mockResolvedValueOnce(sourceConfirmation());
    renderIntakePage();
    startValidPortfolioRequest();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));
    await waitFor(() => expect(screen.getByLabelText("Client reference")).toBeDisabled());
    expect(screen.getByRole("button", { name: "Change request type" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit request" })).toBeDisabled();
    expect(screen.getByText(/editing and file replacement are locked/i)).toBeInTheDocument();

    await act(async () => {
      pendingFailure.reject(new Error("Portfolio intake was not accepted by the source service (503)."));
      await pendingFailure.promise.catch(() => undefined);
    });

    expect(await screen.findByText(/source service \(503\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Client reference")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Change request type" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry publication" }));

    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(2));
    expect(ingestPortfolioBundleMock.mock.calls[1][0]).toEqual(ingestPortfolioBundleMock.mock.calls[0][0]);
    expect(ingestPortfolioBundleMock.mock.calls[1][1].idempotencyKey).toBe(
      ingestPortfolioBundleMock.mock.calls[0][1].idempotencyKey,
    );
    expect(await screen.findByText("Publication confirmed")).toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("locks publication-affecting edits until a pending source success returns", async () => {
    const pending = deferred<ReturnType<typeof sourceConfirmation>>();
    ingestPortfolioBundleMock.mockReturnValueOnce(pending.promise);
    renderIntakePage();
    startValidPortfolioRequest();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));

    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Publishing reviewed request/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Client reference")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Change request type" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit request" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publish reviewed request" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Client reference"), { target: { value: "CIF_002" } });
    expect(screen.getByLabelText("Client reference")).toHaveValue("CIF_001");

    await act(async () => {
      pending.resolve(sourceConfirmation());
      await pending.promise;
    });

    expect(await screen.findByText("Publication confirmed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reviewed request published" })).toBeInTheDocument();
    expect(ingestPortfolioBundleMock.mock.calls[0][0].portfolios[0].cifId).toBe("CIF_001");
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("locks task changes while a publication request is pending", async () => {
    const pending = deferred<ReturnType<typeof sourceConfirmation>>();
    ingestPortfolioBundleMock.mockReturnValueOnce(pending.promise);
    renderIntakePage();
    startValidPortfolioRequest();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));

    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1));
    const changeRequestType = screen.getByRole("button", { name: "Change request type" });
    expect(changeRequestType).toBeDisabled();
    fireEvent.click(changeRequestType);
    expect(screen.queryByRole("region", { name: "Choose an intake request" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Intake request editor" })).toBeInTheDocument();

    await act(async () => {
      pending.resolve(sourceConfirmation());
      await pending.promise;
    });

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

  it("locks CSV replacement while publication is pending and preserves the accepted reviewed file", async () => {
    const pendingPublication = deferred<ReturnType<typeof sourceConfirmation>>();
    ingestPortfolioBundleMock.mockReturnValueOnce(pendingPublication.promise);
    renderIntakePage();
    fireEvent.click(screen.getByRole("button", { name: /Import an intake file/i }));

    const input = screen.getByLabelText("Supported CSV intake file");
    const initialFile = new File([validCsv()], "initial.csv", { type: "text/csv" });
    Object.defineProperty(initialFile, "text", { value: async () => validCsv() });
    fireEvent.change(input, { target: { files: [initialFile] } });
    expect(await screen.findByText("Ready for review")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));
    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1));

    const replacementFile = new File([validCsv()], "replacement.csv", { type: "text/csv" });
    Object.defineProperty(replacementFile, "text", { value: async () => validCsv().replace("PORT_001", "PORT_002") });
    expect(input).toBeDisabled();
    fireEvent.change(input, { target: { files: [replacementFile] } });

    expect(screen.getAllByText("initial.csv").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("replacement.csv")).not.toBeInTheDocument();
    expect(screen.getByText(/editing and file replacement are locked/i)).toBeInTheDocument();

    await act(async () => {
      pendingPublication.resolve(importSourceConfirmation());
      await pendingPublication.promise;
    });

    expect(await screen.findByText("Publication confirmed")).toBeInTheDocument();
    expect(screen.queryByText("replacement.csv")).not.toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  it("blocks imported CSV review when parsed source fields are invalid", async () => {
    renderIntakePage();
    fireEvent.click(screen.getByRole("button", { name: /Import an intake file/i }));

    const input = screen.getByLabelText("Supported CSV intake file");
    const file = new File([invalidCsv()], "invalid-intake.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => invalidCsv() });
    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(await screen.findByText("Information required")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    expect(screen.getByText("Resolve the following before review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Imported portfolio 1: enter the portfolio code." })).toHaveAttribute(
      "href",
      "#intake-file",
    );
    expect(
      screen.getByRole("link", { name: "Imported instrument 1: enter a valid 12-character ISIN." }),
    ).toHaveAttribute("href", "#intake-file");
    expect(screen.queryByRole("button", { name: "Publish reviewed request" })).not.toBeInTheDocument();
    expect(ingestPortfolioBundleMock).not.toHaveBeenCalled();
  });

  it("shows parsed file records before allowing CSV publication", async () => {
    renderIntakePage();
    fireEvent.click(screen.getByRole("button", { name: /Import an intake file/i }));

    const input = screen.getByLabelText("Supported CSV intake file");
    const file = new File([validCsv()], "intake.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => validCsv() });
    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(await screen.findByText("Ready for review")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));

    expect(screen.getByText("Parsed record preview")).toBeInTheDocument();
    expect(screen.getByText("Portfolio records")).toBeInTheDocument();
    expect(screen.getByText("Instrument records")).toBeInTheDocument();
    expect(screen.getByText("Transaction records")).toBeInTheDocument();
    expect(screen.getByText("Price observation records")).toBeInTheDocument();
    expect(screen.getByText("Business date records")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Portfolio records"));
    expect(await screen.findByRole("heading", { name: "Portfolio PORT_001" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Instrument records"));
    expect(await screen.findByRole("heading", { name: "Instrument SEC_001" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Transaction records"));
    expect(
      await screen.findByRole("heading", { name: "Transaction TRN_PORT_001_SEC_001_1" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Business date records"));
    expect(
      await screen.findByRole("heading", { name: "Business date 2026-08-08" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2026-08-08T00:00:00Z")).toBeInTheDocument();
    expect(ingestPortfolioBundleMock).not.toHaveBeenCalled();
  });

  it("bounds operational CSV review pages without truncating the published request", async () => {
    const recordCount = INTAKE_PREVIEW_PAGE_SIZE + 1;
    const csv = validCsvWithRecords(recordCount);
    ingestPortfolioBundleMock.mockResolvedValueOnce(bulkSourceConfirmation(recordCount));
    renderIntakePage();
    fireEvent.click(screen.getByRole("button", { name: /Import an intake file/i }));

    const input = screen.getByLabelText("Supported CSV intake file");
    const file = new File([csv], "operational-intake.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => csv });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("Ready for review")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));
    expect(screen.queryAllByTestId("intake-preview-record")).toHaveLength(0);

    const transactionDetails = screen.getByText("Transaction records").closest("details");
    if (!transactionDetails) throw new Error("Expected transaction preview details");
    fireEvent.click(within(transactionDetails).getByText("Transaction records"));
    await waitFor(() => {
      expect(within(transactionDetails).getAllByTestId("intake-preview-record")).toHaveLength(
        INTAKE_PREVIEW_PAGE_SIZE,
      );
    });
    expect(within(transactionDetails).getByText(`Records 1–10 of ${recordCount}`)).toBeInTheDocument();
    expect(within(transactionDetails).queryByRole("heading", {
      name: "Transaction TRN_PORT_001_SEC_011_11",
    })).not.toBeInTheDocument();

    fireEvent.click(within(transactionDetails).getByRole("button", { name: "Next transaction records" }));
    expect(await within(transactionDetails).findByRole("heading", {
      name: "Transaction TRN_PORT_001_SEC_011_11",
    })).toBeInTheDocument();
    expect(within(transactionDetails).getAllByTestId("intake-preview-record")).toHaveLength(1);
    expect(within(transactionDetails).getByText(`Records 11–11 of ${recordCount}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish reviewed request" }));
    await waitFor(() => expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1));
    const publishedPayload = ingestPortfolioBundleMock.mock.calls[0][0];
    expect(publishedPayload.instruments).toHaveLength(recordCount);
    expect(publishedPayload.transactions).toHaveLength(recordCount);
    expect(publishedPayload.marketPrices).toHaveLength(recordCount);
    expect(publishedPayload.transactions.map((transaction: { transaction_id: string }) => transaction.transaction_id)).toEqual(
      Array.from({ length: recordCount }, (_, index) =>
        `TRN_PORT_001_SEC_${String(index + 1).padStart(3, "0")}_${index + 1}`,
      ),
    );
    expect(await screen.findByText("Publication confirmed")).toBeInTheDocument();
  }, SOURCE_ACTION_TEST_TIMEOUT_MS);

  function startValidPortfolioRequest(overrides: Partial<Record<string, string>> = {}) {
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
      fireEvent.change(screen.getByLabelText(label), { target: { value: overrides[label] ?? value } });
    }
  }
});

function sourceConfirmation() {
  return {
    correlation_id: "corr-intake-001",
    contract_version: "v1",
    data: {
      published_counts: {
        business_dates: 1,
        portfolios: 1,
        instruments: 0,
        transactions: 0,
        market_prices: 0,
      },
    },
  };
}

function importSourceConfirmation() {
  return {
    correlation_id: "corr-intake-001",
    contract_version: "v1",
    data: {
      published_counts: {
        business_dates: 1,
        portfolios: 1,
        instruments: 1,
        transactions: 1,
        market_prices: 1,
      },
    },
  };
}

function bulkSourceConfirmation(recordCount: number) {
  return {
    correlation_id: "corr-intake-bulk-001",
    contract_version: "v1",
    data: {
      published_counts: {
        business_dates: 1,
        portfolios: 1,
        instruments: recordCount,
        transactions: recordCount,
        market_prices: recordCount,
      },
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function validCsv(): string {
  return [
    "portfolio_id,base_currency,open_date,risk_exposure,investment_time_horizon,portfolio_type,booking_center,cif_id,advisor_id,status,security_id,instrument_name,isin,product_type,transaction_type,quantity,price,transaction_date",
    "PORT_001,USD,2026-08-08,Balanced,Long term,Discretionary,Singapore,CIF_001,ADV_001,Pending activation,SEC_001,Global Equity Fund,US0000000001,Fund,BUY,10,100,2026-08-08T00:00:00Z",
  ].join("\n");
}

function validCsvWithRecords(recordCount: number): string {
  const header = validCsv().split("\n")[0];
  const rows = Array.from({ length: recordCount }, (_, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    const isin = `US${String(index + 1).padStart(10, "0")}`;
    return [
      "PORT_001",
      "USD",
      "2026-08-08",
      "Balanced",
      "Long term",
      "Discretionary",
      "Singapore",
      "CIF_001",
      "ADV_001",
      "Pending activation",
      `SEC_${sequence}`,
      `Global Equity Fund ${sequence}`,
      isin,
      "Fund",
      "BUY",
      String(index + 1),
      "100",
      "2026-08-08T00:00:00Z",
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

function invalidCsv(): string {
  return [
    "portfolio_id,base_currency,open_date,risk_exposure,investment_time_horizon,portfolio_type,booking_center,cif_id,advisor_id,status,security_id,instrument_name,isin,product_type,transaction_type,quantity,price,transaction_date",
    ",US,2026-02-31,Balanced,Long term,Discretionary,Singapore,CIF_001,ADV_001,Pending activation,,Global Equity Fund,BAD,Fund,BUY,10,100,not-a-date",
  ].join("\n");
}
