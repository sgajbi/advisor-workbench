"use client";

import {
  DefinitionList,
  DetailCard,
  StateInfoHint,
  WorkbenchRailCard,
} from "@/design-system";

import { formatDate } from "../../formatters";
import type { PortfolioExceptionSummary, PortfolioWorkspace } from "../../types";

type PortfolioDetailDrawerState = {
  kicker: string;
  title: string;
  subtitle?: string;
  summaryItems: Array<{
    label: string;
    value: string;
  }>;
  tabs: Array<{
    key: string;
    label: string;
    content: React.ReactNode;
  }>;
  fullPageHref: string;
  fullPageLabel: string;
};

export default function PortfolioReadinessModule({
  exceptions,
  workspace,
  showDetailFootnote,
  onOpenException,
}: {
  exceptions: PortfolioExceptionSummary[];
  workspace: PortfolioWorkspace;
  showDetailFootnote: boolean;
  onOpenException: (exception: PortfolioExceptionSummary) => void;
}) {
  return (
    <WorkbenchRailCard className="portfolio-side-card portfolio-readiness-card">
      <DetailCard
        title="Reporting Readiness"
        subtitle="Only unresolved book gaps that still need attention."
        actions={
          !exceptions.length && workspace.readiness.reporting.status.toUpperCase() !== "READY" ? (
            <StateInfoHint
              body="Reporting needs the core book prerequisites to be in place: holdings coverage, pricing/valuation, transaction history, and a source-ready reporting state."
              label="Why reporting is unavailable"
            />
          ) : undefined
        }
      >
        {exceptions.length ? (
          <div className="portfolio-readiness-exception-list" role="list" aria-label="Readiness exceptions">
            {exceptions.map((exception) => (
              <div key={exception.key} role="listitem">
                <button
                  type="button"
                  className={`portfolio-readiness-exception portfolio-readiness-exception-${exception.tone}`}
                  onClick={() => onOpenException(exception)}
                >
                  <strong>{exception.title}</strong>
                  <p>{exception.detail}</p>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="portfolio-readiness-clear-state">
            <strong>No active readiness exceptions</strong>
            <p className="muted">
              Holdings, pricing, transactions, and reporting are currently in a usable state.
            </p>
          </div>
        )}
        {showDetailFootnote ? (
          <DefinitionList
            ariaLabel="Readiness operational dates"
            className="portfolio-readiness-footnote"
            rowClassName="portfolio-readiness-footnote-row"
            items={[
              {
                label: "Latest transaction",
                value: formatDate(workspace.operations?.latest_booked_transaction_date),
              },
              {
                label: "Latest position snapshot",
                value: formatDate(workspace.operations?.latest_booked_position_snapshot_date),
              },
            ]}
          />
        ) : null}
      </DetailCard>
    </WorkbenchRailCard>
  );
}

export type { PortfolioDetailDrawerState };
