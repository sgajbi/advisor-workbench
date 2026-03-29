"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AnalyticsModule,
  AnalyticsTable,
  ModuleSkeleton,
  WorkspaceStatusPanel,
} from "@/design-system";

import { getPortfolioProjectedCashflow } from "../api";
import { formatCurrency, formatDate } from "../formatters";
import type { PortfolioWorkspace } from "../types";
import { PortfolioProjectedCashflowPanel } from "./portfolio-chart-panels";
import PortfolioSectionHeader from "./portfolio-section-header";

const CASHFLOW_HORIZON_PRESETS = [10, 30, 90] as const;

export default function PortfolioProjectedCashflowModule({
  portfolioId,
  baseCurrency,
  asOfDate,
  initialCashflowOutlook,
  defaultExpanded,
  suspendInitialFetch = false,
}: {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  initialCashflowOutlook: PortfolioWorkspace["cashflow_outlook"];
  defaultExpanded: boolean;
  suspendInitialFetch?: boolean;
}) {
  const initialHorizonDays = initialCashflowOutlook?.projection_days ?? CASHFLOW_HORIZON_PRESETS[0];
  const [selectedHorizonDays, setSelectedHorizonDays] = useState(initialHorizonDays);
  const [cashflowOutlook, setCashflowOutlook] = useState(initialCashflowOutlook);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setCashflowOutlook(initialCashflowOutlook);
    setSelectedHorizonDays(initialCashflowOutlook?.projection_days ?? CASHFLOW_HORIZON_PRESETS[0]);
  }, [initialCashflowOutlook]);

  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(true);
    }
  }, [defaultExpanded]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectedCashflow() {
      if (suspendInitialFetch && !initialCashflowOutlook) {
        setLoading(true);
        setLoadError(false);
        return;
      }

      const shouldUseInitialOutlook =
        Boolean(initialCashflowOutlook) && selectedHorizonDays === initialHorizonDays;
      if (shouldUseInitialOutlook) {
        setLoadError(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      const nextOutlook = await getPortfolioProjectedCashflow(portfolioId, {
        asOfDate,
        horizonDays: selectedHorizonDays,
        includeProjected: true,
      });

      if (cancelled) {
        return;
      }

      if (nextOutlook) {
        setCashflowOutlook(nextOutlook);
      } else {
        setLoadError(true);
      }
      setLoading(false);
    }

    void loadProjectedCashflow();

    return () => {
      cancelled = true;
    };
  }, [
    asOfDate,
    initialCashflowOutlook,
    initialHorizonDays,
    portfolioId,
    selectedHorizonDays,
    suspendInitialFetch,
  ]);

  const subtitle = useMemo(
    () => `Next ${selectedHorizonDays} days in ${baseCurrency}`,
    [baseCurrency, selectedHorizonDays]
  );

  const cyclePeriod = () => {
    setSelectedHorizonDays((current) => {
      const currentIndex = CASHFLOW_HORIZON_PRESETS.indexOf(
        current as (typeof CASHFLOW_HORIZON_PRESETS)[number]
      );
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % CASHFLOW_HORIZON_PRESETS.length;
      return CASHFLOW_HORIZON_PRESETS[nextIndex];
    });
  };

  const exportCashflow = () => {
    if (!cashflowOutlook) {
      return;
    }

    const rows = cashflowOutlook.upcoming_points.map((point) => [
      formatDate(point.projection_date),
      formatCurrency(point.net_cashflow_base, baseCurrency),
      formatCurrency(point.projected_cumulative_cashflow_base, baseCurrency),
    ]);

    const csv = [
      ["Date", "Net Cashflow", "Cumulative"].join(","),
      ...rows.map((row) => row.map((value) => csvEscape(value)).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfolio-projected-cashflow-${portfolioId}-${selectedHorizonDays}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnalyticsModule>
      <PortfolioSectionHeader
        title="Projected Cashflow"
        subtitle={subtitle}
        actions={
          <>
            <button type="button" className="portfolio-inline-action" onClick={cyclePeriod}>
              Period
            </button>
            <button
              type="button"
              className="portfolio-inline-action"
              onClick={exportCashflow}
              disabled={!cashflowOutlook}
            >
              Export
            </button>
            <button
              type="button"
              className="portfolio-inline-action"
              onClick={() => setExpanded((current) => !current)}
            >
              Expand
            </button>
          </>
        }
      /> 

      {loading && !cashflowOutlook ? (
        <ModuleSkeleton chart rows={3} />
      ) : cashflowOutlook ? (
        <>
          <PortfolioProjectedCashflowPanel
            cashflowOutlook={cashflowOutlook}
            baseCurrency={baseCurrency}
          />
          {hasFlatCashflow(cashflowOutlook) ? (
            <WorkspaceStatusPanel
              state="partial"
              title="Flat projected cashflow"
              body="Projected cash movements are flat across the current forecast horizon."
              hint="Current projections show no meaningful net liquidity movement."
            />
          ) : null}
          {expanded ? (
            <AnalyticsTable
              ariaLabel="Cashflow outlook"
              columns={[
                { key: "date", label: "Date" },
                { key: "net", label: "Net Cashflow", align: "right" },
                { key: "cum", label: "Cumulative", align: "right" },
              ]}
              rows={cashflowOutlook.upcoming_points.map((point) => ({
                key: point.projection_date,
                cells: [
                  formatDate(point.projection_date),
                  formatCurrency(point.net_cashflow_base, baseCurrency),
                  formatCurrency(point.projected_cumulative_cashflow_base, baseCurrency),
                ],
              }))}
            />
          ) : null}
        </>
      ) : (
        <WorkspaceStatusPanel
          state={loadError ? "error" : "empty"}
          title={loadError ? "Projected cashflow unavailable" : "No projected cashflow"}
          body={
            loadError
              ? "We could not load projected cashflow for the selected horizon."
              : "No projected cash movements are available for the selected horizon."
          }
          hint={
            loadError
              ? "Retry with another horizon or verify that cashflow projection data is available upstream."
              : "Book future-dated events or refresh the forecast inputs to generate a liquidity path."
          }
        />
      )}
      {loading && cashflowOutlook ? <p className="portfolio-inline-note muted">Refreshing projected cashflow…</p> : null}
    </AnalyticsModule>
  );
}

function hasFlatCashflow(cashflowOutlook: NonNullable<PortfolioWorkspace["cashflow_outlook"]>): boolean {
  return (
    cashflowOutlook.total_net_cashflow_base === 0 &&
    cashflowOutlook.upcoming_points.every(
      (point) =>
        point.net_cashflow_base === 0 && point.projected_cumulative_cashflow_base === 0
    )
  );
}

function csvEscape(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}
