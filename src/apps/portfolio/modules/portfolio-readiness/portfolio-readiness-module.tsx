"use client";

import { Panel, StateInfoHint } from "@/design-system";

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
    <Panel className="portfolio-side-card">
      <div className="portfolio-card-header">
        <div className="portfolio-empty-state-header">
          <h3 className="portfolio-side-card-title">Readiness and Exceptions</h3>
          {!exceptions.length && workspace.readiness.reporting.status.toUpperCase() !== "READY" ? (
            <StateInfoHint
              body="Reporting needs the core book prerequisites to be in place: holdings coverage, pricing/valuation, transaction history, and a source-ready reporting state."
              label="Why reporting is unavailable"
            />
          ) : null}
        </div>
        <p className="portfolio-card-subtitle">
          Only unresolved gaps that still need attention.
        </p>
      </div>
      {exceptions.length ? (
        <div className="portfolio-readiness-exception-list">
          {exceptions.map((exception) => (
            <button
              key={exception.key}
              type="button"
              className={`portfolio-readiness-exception portfolio-readiness-exception-${exception.tone}`}
              onClick={() => onOpenException(exception)}
            >
              <strong>{exception.title}</strong>
              <p>{exception.detail}</p>
            </button>
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
        <div className="portfolio-readiness-footnote">
          <span>
            Latest transaction: {formatDate(workspace.operations?.latest_booked_transaction_date)}
          </span>
          <span>
            Latest position snapshot:{" "}
            {formatDate(workspace.operations?.latest_booked_position_snapshot_date)}
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

export type { PortfolioDetailDrawerState };
