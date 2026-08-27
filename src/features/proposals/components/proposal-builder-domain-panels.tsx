"use client";

import Link from "next/link";
import { Alert, Button, MenuItem, TextField } from "@mui/material";

import type { PortfolioPositionView } from "@/apps/portfolio/types";
import { SemanticBadge, Text, type SemanticBadgeTone } from "@/design-system";
import type { ProposalDraftImpactModel } from "../proposal-draft-currency-authority";
import {
  formatCurrencyValue,
  formatPercentValue,
  formatUnitValue,
  proposalCashFlowToMinorUnits,
  type ProposalDraftCashFlowIntent,
  type ProposalDraftTradeIntent,
} from "../proposal-draft-preview";
import type {
  ProposalPortfolioEvidenceModel,
  ProposalPortfolioEvidenceStatus,
  ProposalPositionsEvidenceStatus,
} from "../proposal-portfolio-evidence";
import type { ProposalSimulateResponse } from "../types";

import styles from "./proposal-simulate-form.module.css";

export function ProposalPortfolioEvidencePanel({
  evidence,
  cashCurrency,
  sourceCurrency,
  onRefresh,
  refreshBlocked = false,
}: {
  evidence: ProposalPortfolioEvidenceModel;
  cashCurrency: string | null;
  sourceCurrency: string | null;
  onRefresh: () => Promise<void>;
  refreshBlocked?: boolean;
}) {
  const refreshPending = evidence.status === "checking" || evidence.status === "refreshing";
  const refreshDisabled =
    evidence.status === "not_selected" ||
    evidence.context.dateIssue === "invalid_requested_date" ||
    refreshPending ||
    refreshBlocked;

  return (
    <section
      className={`${styles.panel} ${styles.evidencePanel}`}
      aria-labelledby="proposal-evidence-heading"
      aria-busy={refreshPending}
      data-testid="proposal-portfolio-evidence"
      data-evidence-status={evidence.status}
      data-requested-as-of-date={evidence.context.requestedAsOfDate || undefined}
      data-effective-as-of-date={evidence.context.effectiveAsOfDate ?? undefined}
      data-evidence-date-issue={evidence.context.dateIssue ?? undefined}
      data-evidence-currency={sourceCurrency ?? undefined}
    >
      <div className={styles.panelHeader}>
        <div role="status" aria-live="polite" aria-atomic="true">
          <h3 id="proposal-evidence-heading">{evidence.title}</h3>
          <p>{evidence.body}</p>
        </div>
        <SemanticBadge tone={portfolioEvidenceTone(evidence.status)} emphasis="strong">
          {portfolioEvidenceLabel(evidence.status)}
        </SemanticBadge>
      </div>
      <div className={styles.evidenceGrid} aria-label="Portfolio evidence sources">
        <div className={styles.evidenceFact}>
          <Text variant="microLabel">Holdings Evidence</Text>
          <strong>
            {positionsEvidenceLabel(evidence.positions.status, evidence.positions.items.length)}
          </strong>
        </div>
        <div className={styles.evidenceFact}>
          <Text variant="microLabel">Cash Evidence</Text>
          <strong
            data-cash-evidence-state={
              evidence.cash.amount === null ? "needs_correction" : evidence.cash.authority
            }
          >
            {evidence.cash.amount === null
              ? "Needs correction"
              : cashCurrency
                ? formatCurrencyValue(evidence.cash.amount, cashCurrency)
                : "Currency not confirmed"}
          </strong>
          <Text variant="metadata">{evidence.cash.label}</Text>
        </div>
        <div className={styles.evidenceFact}>
          <Text variant="microLabel">Advisory As-of</Text>
          <strong>
            {evidence.context.dateIssue === "invalid_requested_date"
              ? "Invalid carried date"
              : evidence.context.requestedAsOfDate || "Not selected"}
          </strong>
          <Text variant="metadata">Requested proposal context</Text>
        </div>
        <div className={styles.evidenceFact}>
          <Text variant="microLabel">Source As-of</Text>
          <strong>
            {evidence.context.dateIssue === "invalid_source_date"
              ? "Invalid source date"
              : evidence.context.effectiveAsOfDate ?? "Not confirmed"}
          </strong>
          <Text variant="metadata">
            {sourceCurrency
              ? `${sourceCurrency} portfolio book`
              : "Source context unavailable"}
          </Text>
        </div>
      </div>
      <div className={styles.evidenceFooter}>
        {evidence.hint ? <Text variant="secondary">{evidence.hint}</Text> : null}
        <Button
          type="button"
          variant="outlined"
          size="small"
          disabled={refreshDisabled}
          onClick={() => void onRefresh()}
        >
          {refreshPending ? "Refreshing..." : "Refresh Portfolio Evidence"}
        </Button>
      </div>
    </section>
  );
}

export function CurrentPositionsPanel({
  positions,
  evidenceStatus,
  baseCurrency,
  onAddPositionTrade,
}: {
  positions: PortfolioPositionView[];
  evidenceStatus: ProposalPositionsEvidenceStatus;
  baseCurrency: string | null;
  onAddPositionTrade: (position: PortfolioPositionView, side: "BUY" | "SELL") => void;
}) {
  const draftActionsDisabled = evidenceStatus !== "ready";

  return (
    <section className={styles.panel} aria-labelledby="current-positions-heading">
      <div className={styles.panelHeader}>
        <div>
          <h3 id="current-positions-heading">Current Positions</h3>
          <p>
            Review portfolio-book holdings, then add position changes when the source evidence
            matches the advisory context.
          </p>
        </div>
        <span>{positionsEvidenceLabel(evidenceStatus, positions.length)}</span>
      </div>
      {positions.length ? (
        <div className={styles.positionsTableWrap}>
          <table className={styles.positionsTable}>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Asset Class</th>
                <th>Units</th>
                <th>Market Value</th>
                <th>Weight</th>
                <th>Draft Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.slice(0, 12).map((position) => (
                <tr key={position.security_id}>
                  <td>
                    <strong>{position.instrument_name}</strong>
                    <span>{position.security_id}</span>
                  </td>
                  <td>{position.asset_class ?? "Unclassified"}</td>
                  <td>{formatUnitValue(position.quantity)}</td>
                  <td>
                    {baseCurrency
                      ? formatCurrencyValue(position.market_value_base ?? 0, baseCurrency)
                      : "Currency not confirmed"}
                  </td>
                  <td>{formatPercentValue(position.weight_pct ?? 0)}</td>
                  <td>
                    <div className={styles.positionActions}>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        disabled={draftActionsDisabled}
                        onClick={() => onAddPositionTrade(position, "BUY")}
                      >
                        Buy More
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={draftActionsDisabled}
                        onClick={() => onAddPositionTrade(position, "SELL")}
                      >
                        Sell Down
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {positions.length > 12 ? (
            <Text variant="metadata">
              Showing first 12 holdings. Use the instrument field below to add another held or
              off-book security.
            </Text>
          ) : null}
        </div>
      ) : (
        <div className={styles.emptyBookNotice}>
          {positionsEmptyStateCopy(evidenceStatus)}
        </div>
      )}
    </section>
  );
}

function portfolioEvidenceLabel(status: ProposalPortfolioEvidenceStatus): string {
  switch (status) {
    case "ready":
      return "Confirmed";
    case "refreshing":
      return "Refreshing";
    case "checking":
      return "Checking";
    case "partial":
      return "Partial";
    case "context_mismatch":
      return "Context mismatch";
    case "refresh_failed":
      return "Refresh failed";
    case "unavailable":
      return "Unavailable";
    case "not_selected":
      return "Portfolio required";
  }
}

function portfolioEvidenceTone(status: ProposalPortfolioEvidenceStatus): SemanticBadgeTone {
  if (status === "ready") {
    return "success";
  }
  if (status === "unavailable") {
    return "danger";
  }
  if (
    status === "partial" ||
    status === "context_mismatch" ||
    status === "refresh_failed"
  ) {
    return "warn";
  }
  return "default";
}

function positionsEvidenceLabel(
  status: ProposalPositionsEvidenceStatus,
  count: number
): string {
  switch (status) {
    case "loading":
      return "Loading";
    case "refreshing":
      return `${count} ${count === 1 ? "position" : "positions"} · refreshing`;
    case "cached":
      return `${count} ${count === 1 ? "position" : "positions"} · previously loaded`;
    case "partial":
      return `${count} ${count === 1 ? "position" : "positions"} · incomplete evidence`;
    case "context_mismatch":
      return `${count} ${count === 1 ? "position" : "positions"} · different context`;
    case "unavailable":
      return "Unavailable";
    case "empty":
      return "Confirmed empty";
    case "ready":
      return `${count} ${count === 1 ? "position" : "positions"}`;
  }
}

function positionsEmptyStateCopy(status: ProposalPositionsEvidenceStatus): string {
  switch (status) {
    case "loading":
      return "Loading current holdings from the portfolio book.";
    case "unavailable":
      return "Current holdings could not be loaded. No empty-book fallback is shown.";
    case "context_mismatch":
      return "The returned portfolio book belongs to a different context. Refresh before adding draft trades.";
    case "partial":
      return "Current holdings are visible, but the combined portfolio evidence is incomplete. Refresh before adding draft trades.";
    case "empty":
      return "The portfolio book is confirmed with no current investment positions. Add cash or an off-book instrument to begin the draft.";
    case "cached":
      return "The previously confirmed empty book remains visible, but its latest refresh did not complete.";
    case "refreshing":
      return "The confirmed empty book remains visible while its source refreshes.";
    case "ready":
      return "No current investment positions were returned by the confirmed portfolio book.";
  }
}

export function CashMovementsPanel({
  cashFlows,
  netCashImpact,
  onUpdateCashFlow,
  onRemoveCashFlow,
  onAddCashFlow,
}: {
  cashFlows: ProposalDraftCashFlowIntent[];
  netCashImpact: string;
  onUpdateCashFlow: (id: string, patch: Partial<ProposalDraftCashFlowIntent>) => void;
  onRemoveCashFlow: (id: string) => void;
  onAddCashFlow: () => void;
}) {
  return (
    <section className={styles.panel} aria-labelledby="cash-movements-heading">
      <div className={styles.panelHeader}>
        <div>
          <h3 id="cash-movements-heading">Cash Movements</h3>
          <p>Model client subscriptions, withdrawals, and liquidity changes.</p>
        </div>
        <span>Net {netCashImpact}</span>
      </div>
      <div className={styles.intentRows}>
        {cashFlows.map((item) => {
          const amountNeedsCorrection = proposalCashFlowToMinorUnits(item) === null;
          return (
          <div key={item.id} className={styles.cashRow}>
            <TextField
              label="Movement"
              size="small"
              select
              value={item.direction}
              onChange={(event) =>
                onUpdateCashFlow(item.id, { direction: event.target.value as "IN" | "OUT" })
              }
            >
              <MenuItem value="IN">Inflow</MenuItem>
              <MenuItem value="OUT">Outflow</MenuItem>
            </TextField>
            <TextField
              label="Currency"
              size="small"
              value={item.currency}
              onChange={(event) => onUpdateCashFlow(item.id, { currency: event.target.value })}
            />
            <TextField
              label="Amount"
              size="small"
              type="text"
              value={item.amountInput ?? String(item.amount)}
              error={amountNeedsCorrection}
              helperText={
                amountNeedsCorrection
                  ? "Use no more than 2 decimal places and remain within the reliable draft range."
                  : undefined
              }
              inputProps={{ inputMode: "decimal", spellCheck: false }}
              onChange={(event) => {
                const amountInput = event.target.value;
                const parsedAmount = Number(amountInput);
                onUpdateCashFlow(item.id, {
                  amountInput,
                  amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
                });
              }}
            />
            <TextField
              label="Advisor Note"
              size="small"
              fullWidth
              value={item.description ?? ""}
              onChange={(event) => onUpdateCashFlow(item.id, { description: event.target.value })}
            />
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              disabled={cashFlows.length === 1}
              onClick={() => onRemoveCashFlow(item.id)}
            >
              Remove
            </Button>
          </div>
          );
        })}
      </div>
      <Button type="button" variant="outlined" onClick={onAddCashFlow}>
        Add Cash Movement
      </Button>
    </section>
  );
}

export function DraftOrderBlotterPanel({
  trades,
  readyTradeCount,
  onUpdateTrade,
  onRemoveTrade,
  onAddTrade,
}: {
  trades: ProposalDraftTradeIntent[];
  readyTradeCount: number;
  onUpdateTrade: (id: string, patch: Partial<ProposalDraftTradeIntent>) => void;
  onRemoveTrade: (id: string) => void;
  onAddTrade: () => void;
}) {
  return (
    <section className={styles.panel} aria-labelledby="security-orders-heading">
      <div className={styles.panelHeader}>
        <div>
          <h3 id="security-orders-heading">Draft Order Blotter</h3>
          <p>
            Edit units for held positions or add an off-book instrument that is not already in the
            portfolio.
          </p>
        </div>
        <span>{readyTradeCount} ready</span>
      </div>
      <div className={styles.intentRows}>
        {trades.map((item) => (
          <div key={item.id} className={styles.tradeRow}>
            <TextField
              label="Order"
              size="small"
              select
              value={item.side}
              onChange={(event) =>
                onUpdateTrade(item.id, { side: event.target.value as "BUY" | "SELL" })
              }
            >
              <MenuItem value="BUY">Buy</MenuItem>
              <MenuItem value="SELL">Sell</MenuItem>
            </TextField>
            <TextField
              label="Instrument"
              size="small"
              fullWidth
              value={item.instrumentId}
              onChange={(event) => onUpdateTrade(item.id, { instrumentId: event.target.value })}
            />
            <TextField
              label="Asset Class"
              size="small"
              value={item.assetClass ?? ""}
              onChange={(event) => onUpdateTrade(item.id, { assetClass: event.target.value })}
              placeholder="Equities"
            />
            <TextField
              label="Quantity"
              size="small"
              type="number"
              value={item.quantity}
              onChange={(event) => {
                const next = (event.target as HTMLInputElement).valueAsNumber;
                onUpdateTrade(item.id, { quantity: Number.isNaN(next) ? 0 : next });
              }}
            />
            <TextField
              label="Reference Price"
              size="small"
              type="number"
              value={item.referencePrice ?? 0}
              onChange={(event) => {
                const next = (event.target as HTMLInputElement).valueAsNumber;
                onUpdateTrade(item.id, { referencePrice: Number.isNaN(next) ? 0 : next });
              }}
              helperText={item.source === "NEW_INSTRUMENT" ? "Used for indicative preview" : undefined}
            />
            <TextField
              label="Price Currency"
              size="small"
              value={item.referencePriceCurrency ?? ""}
              onChange={(event) =>
                onUpdateTrade(item.id, { referencePriceCurrency: event.target.value })
              }
              helperText="Required for a priced order"
              inputProps={{ maxLength: 3 }}
            />
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              disabled={trades.length === 1}
              onClick={() => onRemoveTrade(item.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outlined" onClick={onAddTrade}>
        Add Off-Book Instrument
      </Button>
    </section>
  );
}

export function IndicativeDraftImpactPanel({
  impactModel,
}: {
  impactModel: ProposalDraftImpactModel;
}) {
  if (impactModel.status === "unavailable") {
    const { currencyAuthority } = impactModel;
    return (
      <section
        className={styles.panel}
        aria-labelledby="draft-impact-heading"
        data-testid="proposal-draft-impact"
        data-preview-status={impactModel.status}
        data-preview-blocked-by={impactModel.blockedBy}
        data-preview-currency-status={currencyAuthority.status}
        data-requested-currency={currencyAuthority.requestedCurrency ?? undefined}
        data-source-currency={currencyAuthority.sourceCurrency ?? undefined}
      >
        <div className={styles.panelHeader}>
          <div>
            <h3 id="draft-impact-heading">Indicative Draft Impact</h3>
            <p>
              Monetary projection is shown only when current portfolio evidence and draft entries
              share one confirmed currency.
            </p>
          </div>
        </div>
        <Alert severity="warning" role="status" aria-live="polite">
          <strong>{impactModel.title}</strong> {impactModel.body}
        </Alert>
      </section>
    );
  }

  const { currencyAuthority, preview: draftPreview } = impactModel;
  const baseCurrency = currencyAuthority.currency;
  return (
    <section
      className={styles.panel}
      aria-labelledby="draft-impact-heading"
      data-testid="proposal-draft-impact"
      data-preview-status={impactModel.status}
      data-preview-currency-status={currencyAuthority.status}
      data-preview-currency={baseCurrency}
      data-requested-currency={currencyAuthority.requestedCurrency ?? undefined}
      data-source-currency={currencyAuthority.sourceCurrency ?? undefined}
    >
      <div className={styles.panelHeader}>
        <div>
          <h3 id="draft-impact-heading">Indicative Draft Impact</h3>
          <p>
            Live advisor preview from current holdings, draft orders, and cash movements. Formal
            suitability, risk, and allocation proof is produced by simulation. All monetary values
            use {baseCurrency}.
          </p>
        </div>
        <span>{formatCurrencyValue(draftPreview.proposedPortfolioValue, baseCurrency)}</span>
      </div>
      <div className={styles.impactSummaryGrid}>
        <div>
          <span>Current Value</span>
          <strong>{formatCurrencyValue(draftPreview.currentPortfolioValue, baseCurrency)}</strong>
        </div>
        <div>
          <span>Proposed Value</span>
          <strong>{formatCurrencyValue(draftPreview.proposedPortfolioValue, baseCurrency)}</strong>
        </div>
        <div>
          <span>Largest Position</span>
          <strong>
            {formatPercentValue(draftPreview.currentLargestWeight)} →{" "}
            {formatPercentValue(draftPreview.proposedLargestWeight)}
          </strong>
        </div>
        <div>
          <span>Unpriced Draft Lines</span>
          <strong>{draftPreview.unpricedTradeCount}</strong>
        </div>
      </div>
      <div className={styles.positionsTableWrap}>
        <table className={styles.positionsTable}>
          <thead>
            <tr>
              <th>Asset Class</th>
              <th>Current Weight</th>
              <th>Proposed Weight</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {draftPreview.allocationRows.map((row) => (
              <tr key={row.assetClass}>
                <td>{row.assetClass}</td>
                <td>{formatPercentValue(row.currentWeight)}</td>
                <td>{formatPercentValue(row.proposedWeight)}</td>
                <td className={row.proposedWeight >= row.currentWeight ? styles.positive : styles.negative}>
                  {row.proposedWeight >= row.currentWeight ? "+" : ""}
                  {formatPercentValue(row.proposedWeight - row.currentWeight)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {draftPreview.unpricedTradeCount ? (
        <Alert severity="warning">
          Add reference prices for all draft lines to complete the indicative allocation preview.
        </Alert>
      ) : null}
    </section>
  );
}

export function AdviseEvaluationSummaryPanel({
  result,
  highlights,
  reviewIssueCount,
  blockingIssueCount,
  draftTradeCount,
}: {
  result: ProposalSimulateResponse;
  highlights: Array<{ label: string; value: string }>;
  reviewIssueCount?: unknown;
  blockingIssueCount?: unknown;
  draftTradeCount?: unknown;
}) {
  return (
    <section
      className={styles.resultPanel}
      aria-label="Proposal evaluation summary"
      aria-atomic="true"
      aria-live="polite"
      role="status"
    >
      <Text variant="sectionTitle">Advise Evaluation Summary</Text>
      <div className={styles.resultGrid}>
        <div>
          <span>Status</span>
          <strong>{result.data.status ?? "UNKNOWN"}</strong>
        </div>
        <div>
          <span>Proposal Run</span>
          <strong>{String(result.data.proposal_run_id ?? "N/A")}</strong>
        </div>
        <div>
          <span>Correlation</span>
          <strong>{result.correlation_id}</strong>
        </div>
      </div>
      {highlights.length ? (
        <div className={styles.outputGrid}>
          {highlights.map((highlight) => (
            <div key={highlight.label}>
              <span>{highlight.label}</span>
              <strong>{highlight.value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <Text variant="secondary">No additional scalar metrics were returned by the simulation engine.</Text>
      )}
      {reviewIssueCount !== undefined || blockingIssueCount !== undefined || draftTradeCount !== undefined ? (
        <div className={styles.outputGrid}>
          <div>
            <span>Review Issues</span>
            <strong>{String(reviewIssueCount ?? 0)}</strong>
          </div>
          <div>
            <span>Blocking Issues</span>
            <strong>{String(blockingIssueCount ?? 0)}</strong>
          </div>
          <div>
            <span>Draft Trades</span>
            <strong>{String(draftTradeCount ?? 0)}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function SavedAdvisoryDraftPanel({ proposalId }: { proposalId: string }) {
  return (
    <section className={styles.resultPanel} aria-label="Saved advisory draft">
      <Text variant="body">Draft saved as Proposal ID: {proposalId}</Text>
      <Text variant="body">
        <Link href={`/proposals/${proposalId}`}>Open Proposal Details</Link>
      </Text>
    </section>
  );
}
