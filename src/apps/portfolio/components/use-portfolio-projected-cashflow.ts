"use client";

import { useEffect, useState } from "react";

import { getPortfolioProjectedCashflow } from "../api";
import {
  buildCashflowSnapshot,
  buildInitialCashflowSnapshot,
  resolveCashflowHorizonDays,
  resolveCashflowHorizonKey,
  type CashflowHorizonKey,
  type CashflowProjectionSnapshot,
} from "../portfolio-projected-cashflow-view-model";
import type {
  PortfolioCashflowOutlook,
  PortfolioPartialFailure,
  PortfolioProjectedCashflowResponse,
} from "../types";

export type CashflowRequestFailure = {
  requestedHorizonDays: number;
  response: PortfolioProjectedCashflowResponse | null;
};

export function usePortfolioProjectedCashflow({
  portfolioId,
  asOfDate,
  initialCashflowOutlook,
  initialWarnings,
  initialPartialFailures,
}: {
  portfolioId: string;
  asOfDate: string;
  initialCashflowOutlook: PortfolioCashflowOutlook | null;
  initialWarnings: string[];
  initialPartialFailures: PortfolioPartialFailure[];
}) {
  const initialHorizonKey = resolveCashflowHorizonKey(initialCashflowOutlook?.projection_days);
  const initialSnapshot = buildInitialCashflowSnapshot({
    outlook: initialCashflowOutlook,
    warnings: initialWarnings,
    partialFailures: initialPartialFailures,
  });
  const [selectedHorizonKey, setSelectedHorizonKey] =
    useState<CashflowHorizonKey>(initialHorizonKey);
  const [snapshots, setSnapshots] = useState<
    Partial<Record<CashflowHorizonKey, CashflowProjectionSnapshot>>
  >(initialSnapshot ? { [initialHorizonKey]: initialSnapshot } : {});
  const [loading, setLoading] = useState(!initialSnapshot);
  const [failure, setFailure] = useState<CashflowRequestFailure | null>(null);
  const [retrySequence, setRetrySequence] = useState(0);
  const selectedSnapshot = snapshots[selectedHorizonKey] ?? null;
  const selectedHorizonDays = resolveCashflowHorizonDays(selectedHorizonKey);

  useEffect(() => {
    if (selectedSnapshot) {
      setLoading(false);
      setFailure(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailure(null);

    async function loadProjectedCashflow() {
      const response = await getPortfolioProjectedCashflow(portfolioId, {
        asOfDate,
        horizonDays: selectedHorizonDays,
        includeProjected: true,
        ...(retrySequence > 0 ? { forceRefresh: true } : {}),
      });

      if (cancelled) {
        return;
      }

      const snapshot = response ? buildCashflowSnapshot(selectedHorizonDays, response) : null;
      if (snapshot) {
        setSnapshots((current) => ({
          ...current,
          [selectedHorizonKey]: snapshot,
        }));
        setFailure(null);
      } else {
        setFailure({ requestedHorizonDays: selectedHorizonDays, response });
      }
      setLoading(false);
    }

    void loadProjectedCashflow();

    return () => {
      cancelled = true;
    };
  }, [
    asOfDate,
    portfolioId,
    retrySequence,
    selectedHorizonDays,
    selectedHorizonKey,
    selectedSnapshot,
  ]);

  return {
    selectedHorizonKey,
    selectedHorizonDays,
    selectedSnapshot,
    loading,
    failure,
    selectHorizon: (nextHorizon: CashflowHorizonKey) => {
      if (!loading) {
        setSelectedHorizonKey(nextHorizon);
      }
    },
    retry: () => setRetrySequence((current) => current + 1),
  };
}
