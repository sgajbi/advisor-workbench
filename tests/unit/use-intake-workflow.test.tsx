import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ingestPortfolioBundle } from "@/features/intake/api";
import { useIntakeWorkflow } from "@/features/intake/use-intake-workflow";

vi.mock("@/features/intake/api", () => ({
  ingestPortfolioBundle: vi.fn(),
}));

const ingestPortfolioBundleMock = vi.mocked(ingestPortfolioBundle);

describe("useIntakeWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admits only one source request when publication is invoked twice in the same tick", async () => {
    const pending = deferred<ReturnType<typeof sourceConfirmation>>();
    ingestPortfolioBundleMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useIntakeWorkflow(), { wrapper: queryWrapper() });

    act(() => result.current.selectTask("CREATE_PORTFOLIO"));
    act(() => {
      result.current.updateDraft((current) =>
        current.task === "CREATE_PORTFOLIO"
          ? {
              ...current,
              input: {
                portfolioId: "PORT_001",
                cifId: "CIF_001",
                advisorId: "ADV_001",
                baseCurrency: "USD",
                openDate: "2026-08-08",
                bookingCenter: "Singapore",
                portfolioType: "Discretionary",
                riskExposure: "Balanced",
                investmentTimeHorizon: "Long term",
                status: "Pending activation",
              },
            }
          : current,
      );
    });
    expect(result.current.validationIssues).toHaveLength(0);
    act(() => expect(result.current.reviewRequest()).toBe(true));

    let firstAttempt!: Promise<boolean>;
    let duplicateAttempt!: Promise<boolean>;
    act(() => {
      firstAttempt = result.current.submitReviewedRequest();
      duplicateAttempt = result.current.submitReviewedRequest();
    });

    expect(ingestPortfolioBundleMock).toHaveBeenCalledTimes(1);
    await expect(duplicateAttempt).resolves.toBe(false);

    await act(async () => {
      pending.resolve(sourceConfirmation());
      await expect(firstAttempt).resolves.toBe(true);
    });
    expect(result.current.submissionState).toBe("accepted");
  });

  it("publishes the same normalized intent shown in review only after source acceptance", async () => {
    ingestPortfolioBundleMock.mockResolvedValue(sourceConfirmation());
    const { result } = renderHook(() => useIntakeWorkflow(), { wrapper: queryWrapper() });

    act(() => result.current.selectTask("CREATE_PORTFOLIO"));
    act(() => {
      result.current.updateDraft((current) =>
        current.task === "CREATE_PORTFOLIO"
          ? {
              ...current,
              input: {
                portfolioId: " PORT_001 ",
                cifId: " CIF_001 ",
                advisorId: " ADV_001 ",
                baseCurrency: " usd ",
                openDate: " 2026-08-08 ",
                bookingCenter: " Singapore ",
                portfolioType: " Discretionary ",
                riskExposure: " Balanced ",
                investmentTimeHorizon: " Long term ",
                status: " Pending activation ",
              },
            }
          : current,
      );
    });
    expect(result.current.validationIssues).toHaveLength(0);
    act(() => expect(result.current.reviewRequest()).toBe(true));

    expect(result.current.reviewedIntent?.projection.facts).toContainEqual({
      label: "Base currency",
      value: "USD",
    });
    await act(async () => {
      await expect(result.current.submitReviewedRequest()).resolves.toBe(true);
    });

    expect(ingestPortfolioBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessDates: [{ businessDate: "2026-08-08" }],
        portfolios: [expect.objectContaining({
          portfolioId: "PORT_001",
          baseCurrency: "USD",
          cifId: "CIF_001",
        })],
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(result.current.receipt?.title).toBe("Publication confirmed");
  });
});

function queryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function sourceConfirmation() {
  return {
    correlation_id: "corr-intake-hook-001",
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
