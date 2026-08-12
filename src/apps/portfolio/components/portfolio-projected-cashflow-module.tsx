"use client";

import { useState } from "react";

import {
  AnalyticsModule,
  AnalyticsTable,
  DisclosureToggleButton,
  SectionHeader,
  WorkbenchChoiceGroup,
} from "@/design-system";

import { formatCurrency, formatDate } from "../formatters";
import {
  CASHFLOW_HORIZON_OPTIONS,
  buildCashflowExportFilename,
  buildCashflowExportRows,
  buildCashflowMovementRows,
  buildCashflowResultLabel,
  buildCashflowScopeFacts,
  hasCashflowDegradation,
  hasProjectedCashMovements,
} from "../portfolio-projected-cashflow-view-model";
import type {
  PortfolioCashflowOutlook,
  PortfolioPartialFailure,
  PortfolioProjectedCashflowResponse,
} from "../types";
import { PortfolioProjectedCashflowPanel } from "./portfolio-chart-panels";
import PortfolioModuleState from "./portfolio-module-state";
import choiceStyles from "./portfolio-choice-groups.module.css";
import styles from "./portfolio-projected-cashflow.module.css";
import {
  usePortfolioProjectedCashflow,
  type PortfolioProjectedCashflowController,
} from "./use-portfolio-projected-cashflow";

export default function PortfolioProjectedCashflowModule({
  portfolioId,
  baseCurrency,
  asOfDate,
  initialCashflowOutlook,
  initialWarnings,
  initialPartialFailures,
  defaultExpanded,
}: {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  initialCashflowOutlook: PortfolioCashflowOutlook | null;
  initialWarnings: string[];
  initialPartialFailures: PortfolioPartialFailure[];
  defaultExpanded: boolean;
}) {
  const cashflow = usePortfolioProjectedCashflow({
    portfolioId,
    asOfDate,
    initialCashflowOutlook,
    initialWarnings,
    initialPartialFailures,
  });

  return (
    <PortfolioProjectedCashflowModuleView
      portfolioId={portfolioId}
      baseCurrency={baseCurrency}
      cashflow={cashflow}
      defaultExpanded={defaultExpanded}
    />
  );
}

export function PortfolioProjectedCashflowModuleView({
  portfolioId,
  baseCurrency,
  cashflow,
  defaultExpanded,
}: {
  portfolioId: string;
  baseCurrency: string;
  cashflow: PortfolioProjectedCashflowController;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const snapshot = cashflow.selectedSnapshot;
  const outlook = snapshot?.outlook ?? null;
  const movementRows = outlook ? buildCashflowMovementRows(outlook) : [];
  const hasDatedSchedule = Boolean(outlook?.upcoming_points.length);
  const subtitle = snapshot
    ? `${buildCashflowResultLabel(snapshot)} · ${baseCurrency}`
    : `${cashflow.selectedHorizonDays}-day projection · ${baseCurrency}`;

  const exportCashflow = () => {
    if (
      !snapshot ||
      cashflow.loading ||
      cashflow.refreshingEvidence ||
      cashflow.failure ||
      !hasDatedSchedule
    ) {
      return;
    }

    const rows = buildCashflowExportRows(snapshot, baseCurrency);
    const csv = [
      ["Date", "Net projected movement", "Cumulative projected movement"].join(
        ",",
      ),
      ...rows.map((row) => row.map((value) => csvEscape(value)).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildCashflowExportFilename(snapshot, portfolioId);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnalyticsModule>
      <SectionHeader
        title="Projected cash movement"
        subtitle={subtitle}
        actions={
          <>
            <WorkbenchChoiceGroup
              value={cashflow.selectedHorizonKey}
              onChange={cashflow.selectHorizon}
              options={CASHFLOW_HORIZON_OPTIONS.map((option) => ({
                key: option.key,
                label: option.label,
                disabled: cashflow.loading,
                title: `${option.days}-day projected cash movement`,
              }))}
              ariaLabel="Projection horizon"
              className={choiceStyles.cashflowHorizon}
            />
            <button
              type="button"
              className="portfolio-inline-action"
              onClick={exportCashflow}
              disabled={
                !snapshot ||
                cashflow.loading ||
                cashflow.refreshingEvidence ||
                Boolean(cashflow.failure) ||
                !hasDatedSchedule
              }
            >
              Export
            </button>
            <DisclosureToggleButton
              expanded={expanded}
              onToggle={() => setExpanded((current) => !current)}
            />
          </>
        }
      />

      {cashflow.loading ? (
        <PortfolioModuleState
          variant="loading"
          title={`Loading ${cashflow.selectedHorizonDays}-day projection`}
          message="Expected portfolio cash movements are being refreshed."
          chart
          rows={3}
        />
      ) : cashflow.failure && !snapshot ? (
        <PortfolioModuleState
          variant="status"
          state="error"
          title={`${cashflow.failure.requestedHorizonDays}-day projection unavailable`}
          body="Expected cash movements could not be retrieved for this horizon. No prior-horizon figures are being shown as current."
          hint="Retry the projection or continue with another available horizon."
          action={
            <button
              type="button"
              className="portfolio-inline-action"
              onClick={cashflow.retry}
            >
              Retry projection
            </button>
          }
          why={buildFailureEvidence(cashflow.failure.response)}
        />
      ) : snapshot && outlook ? (
        <>
          <div className={styles.scope} aria-label="Projection scope">
            {buildCashflowScopeFacts(snapshot, baseCurrency).map((fact) => (
              <div key={fact.label}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>

          {outlook.notes ? (
            <p className={styles.sourceNote}>
              <strong>Source note</strong>
              <span>{outlook.notes}</span>
            </p>
          ) : null}

          {hasCashflowDegradation(snapshot) && !cashflow.failure ? (
            <PortfolioModuleState
              variant="status"
              state="partial"
              title="Projection available with limitations"
              body="Some projection inputs were unavailable. Review the returned movement schedule with the source limitation in mind."
              hint={`${Math.max(snapshot.partialFailures.length, snapshot.warnings.length)} source limitation${
                Math.max(
                  snapshot.partialFailures.length,
                  snapshot.warnings.length,
                ) === 1
                  ? ""
                  : "s"
              } reported.`}
              why={buildSnapshotEvidence(snapshot.response)}
            />
          ) : null}

          {cashflow.refreshingEvidence ? (
            <PortfolioModuleState
              variant="status"
              state="partial"
              title="Refreshing projection evidence"
              body="The server-seeded projection remains visible while its current source evidence is confirmed."
              hint="Export remains unavailable until the source refresh completes."
            />
          ) : null}

          {cashflow.failure ? (
            <PortfolioModuleState
              variant="status"
              state="partial"
              title="Projection evidence refresh unavailable"
              body="The server-seeded projection remains visible, but the projected cash movement source could not confirm its current support evidence."
              hint="Treat the figures as prior workspace evidence until the source refresh succeeds."
              action={
                <button
                  type="button"
                  className="portfolio-inline-action"
                  onClick={cashflow.retry}
                >
                  Retry evidence refresh
                </button>
              }
              why={buildFailureEvidence(cashflow.failure.response)}
            />
          ) : null}

          {hasProjectedCashMovements(outlook) ? (
            <>
              <PortfolioProjectedCashflowPanel
                cashflowOutlook={outlook}
                baseCurrency={baseCurrency}
              />
              {!hasDatedSchedule ? (
                <PortfolioModuleState
                  variant="status"
                  state="partial"
                  title="Dated movement schedule unavailable"
                  body="The source returned a net projected movement for this horizon without dated movement points."
                  hint="The aggregate is shown above. Export is unavailable until dated points are returned."
                />
              ) : expanded ? (
                <>
                  <p className={styles.tableNote}>
                    Showing {movementRows.length} movement date
                    {movementRows.length === 1 ? "" : "s"} from{" "}
                    {outlook.upcoming_points.length} returned projection points.
                    Export includes every returned point.
                  </p>
                  <p className={styles.scrollHint}>
                    Swipe, or focus the schedule and use the arrow keys, to
                    compare every column.
                  </p>
                  <AnalyticsTable
                    density="compact"
                    variant="portfolio"
                    className={`portfolio-analytics-table ${styles.table}`}
                    ariaLabel="Projected cash movement schedule"
                    scrollRegionLabel="Projected cash movement schedule, horizontally scrollable"
                    columns={[
                      { key: "date", label: "Date" },
                      {
                        key: "net",
                        label: "Net projected movement",
                        align: "right",
                      },
                      {
                        key: "cum",
                        label: "Cumulative projected movement",
                        align: "right",
                      },
                    ]}
                    rows={movementRows.map((point) => ({
                      key: point.projection_date,
                      cells: [
                        formatDate(point.projection_date),
                        formatCurrency(point.net_cashflow_base, baseCurrency),
                        formatCurrency(
                          point.projected_cumulative_cashflow_base,
                          baseCurrency,
                        ),
                      ],
                    }))}
                  />
                </>
              ) : null}
            </>
          ) : (
            <PortfolioModuleState
              variant="status"
              state="empty"
              title="No projected cash movement"
              body="The source returned no expected inflows or outflows for this horizon."
              hint="Choose another horizon to review a different forward period."
            />
          )}
        </>
      ) : null}
    </AnalyticsModule>
  );
}

function buildFailureEvidence(
  response: PortfolioProjectedCashflowResponse | null,
) {
  if (!response?.correlation_id) {
    return undefined;
  }
  return {
    label: "Support reference",
    title: "Projection request",
    body: `${response.correlation_id} · Contract ${response.contract_version}`,
  };
}

function buildSnapshotEvidence(
  response: PortfolioProjectedCashflowResponse | null,
) {
  return buildFailureEvidence(response);
}

function csvEscape(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}
