"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, MenuItem, Stack, TextField } from "@mui/material";

import { getPortfolioBook, getPortfolioWorkspaceShell } from "@/apps/portfolio/api";
import type { PortfolioPositionView } from "@/apps/portfolio/types";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import {
  applyAdvisoryWorkspaceDraftAction,
  createAdvisoryWorkspace,
  evaluateAdvisoryWorkspace,
  handoffAdvisoryWorkspace,
} from "../api";
import {
  buildProposalDraftPreview,
  createCashFlowIntent,
  createTradeIntent,
  createTradeIntentFromPosition,
  formatCurrencyValue,
  formatPercentValue,
  formatUnitValue,
  type ProposalDraftCashFlowIntent,
  type ProposalDraftTradeIntent,
} from "../proposal-draft-preview";
import type { AdvisoryWorkspaceEnvelopeResponse, ProposalSimulateResponse } from "../types";
import { SectionBlock, Text } from "@/design-system";
import styles from "./proposal-simulate-form.module.css";

const schema = z.object({
  idempotencyKey: z.string().min(6, "Draft control key is required"),
  createdBy: z.string().min(1, "Advisor identity is required"),
  proposalTitle: z.string().min(1, "Advisory draft title is required"),
  portfolioId: z.string().min(1, "Portfolio ID is required"),
  asOfDate: z.string().min(10, "As-of date is required"),
  mandateId: z.string().optional(),
  baseCurrency: z.string().min(3, "Base currency is required"),
  cashAmount: z.number().positive("Investable cash must be greater than 0"),
});

type FormInput = z.infer<typeof schema>;

const DEFAULT_ADVISORY_AS_OF_DATE = "2026-04-10";
const DEFAULT_CANONICAL_PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";

function simulationHighlights(result: ProposalSimulateResponse): Array<{ label: string; value: string }> {
  const highlights: Array<{ label: string; value: string }> = [];
  Object.entries(result.data).forEach(([key, value]) => {
    if (key === "status" || key === "proposal_run_id") {
      return;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      highlights.push({
        label: key.replaceAll("_", " "),
        value: String(value),
      });
    }
  });
  return highlights.slice(0, 8);
}

function recordValue(source: unknown): Record<string, unknown> | null {
  return source && typeof source === "object" && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function decimalString(value: number, digits: number): string {
  return value.toFixed(digits);
}

function signedCashAmount(item: ProposalDraftCashFlowIntent): string {
  const amount = Math.abs(item.amount || 0);
  return decimalString(item.direction === "OUT" ? -amount : amount, 2);
}

function extractWorkspace(envelope: AdvisoryWorkspaceEnvelopeResponse): Record<string, unknown> {
  const data = recordValue(envelope.data) ?? {};
  return recordValue(data.workspace) ?? data;
}

function extractWorkspaceId(envelope: AdvisoryWorkspaceEnvelopeResponse): string | null {
  return stringValue(extractWorkspace(envelope).workspace_id);
}

function extractLatestProposalResult(
  envelope: AdvisoryWorkspaceEnvelopeResponse
): Record<string, unknown> | null {
  return recordValue(extractWorkspace(envelope).latest_proposal_result);
}

function extractEvaluationSummary(
  envelope: AdvisoryWorkspaceEnvelopeResponse | null
): Record<string, unknown> | null {
  return envelope ? recordValue(extractWorkspace(envelope).evaluation_summary) : null;
}

function extractHandoffProposalId(envelope: AdvisoryWorkspaceEnvelopeResponse): string | null {
  const data = recordValue(envelope.data) ?? {};
  const proposalEnvelope = recordValue(data.proposal);
  const proposal = recordValue(proposalEnvelope?.proposal) ?? recordValue(proposalEnvelope?.data)?.proposal;
  const proposalRecord = recordValue(proposal);
  return stringValue(proposalRecord?.proposal_id);
}

export default function ProposalSimulateForm({
  initialPortfolioId = DEFAULT_CANONICAL_PORTFOLIO_ID,
}: {
  initialPortfolioId?: string;
}) {
  const defaultIdempotencyKey = useMemo(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `ui-${crypto.randomUUID()}`;
    }
    return `ui-${Date.now()}`;
  }, []);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      idempotencyKey: defaultIdempotencyKey,
      createdBy: "advisor_1",
      proposalTitle: "Tactical rebalance proposal",
      portfolioId: initialPortfolioId,
      asOfDate: DEFAULT_ADVISORY_AS_OF_DATE,
      mandateId:
        initialPortfolioId === "PB_SG_GLOBAL_BAL_001"
          ? "MANDATE_PB_SG_GLOBAL_BAL_001"
          : "",
      baseCurrency: "USD",
      cashAmount: 10000,
    },
  });

  const [cashFlows, setCashFlows] = useState<ProposalDraftCashFlowIntent[]>([
    createCashFlowIntent(1, "USD"),
  ]);
  const [trades, setTrades] = useState<ProposalDraftTradeIntent[]>([createTradeIntent(1)]);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProposalSimulateResponse | null>(null);
  const [workspaceEnvelope, setWorkspaceEnvelope] =
    useState<AdvisoryWorkspaceEnvelopeResponse | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null);

  const portfolioId = form.watch("portfolioId");
  const asOfDate = form.watch("asOfDate");
  const baseCurrency = form.watch("baseCurrency");
  const cashAmount = form.watch("cashAmount");
  const { data: portfolioBook, isLoading: positionsLoading } = useQuery({
    queryKey: ["proposal-position-builder-book", portfolioId, baseCurrency],
    queryFn: async () =>
      await getPortfolioBook(portfolioId, {
        reportingCurrency: baseCurrency || "USD",
      }),
    enabled: portfolioId.trim().length > 0,
    ...workbenchStrictQueryDefaults,
  });
  const { data: portfolioShell } = useQuery({
    queryKey: ["proposal-position-builder-shell", portfolioId],
    queryFn: async () => await getPortfolioWorkspaceShell(portfolioId),
    enabled: portfolioId.trim().length > 0,
    ...workbenchStrictQueryDefaults,
  });
  const positions = useMemo(() => portfolioBook?.positions ?? [], [portfolioBook?.positions]);
  const sourceCashAmount = portfolioShell?.summary?.total_cash_base ?? cashAmount ?? 0;
  const draftPreview = useMemo(
    () => buildProposalDraftPreview(positions, sourceCashAmount, cashFlows, trades),
    [cashFlows, positions, sourceCashAmount, trades]
  );

  function updateCashFlow(id: string, patch: Partial<ProposalDraftCashFlowIntent>) {
    setCashFlows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateTrade(id: string, patch: Partial<ProposalDraftTradeIntent>) {
    setTrades((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addCashFlow(currency: string) {
    setCashFlows((current) => [...current, createCashFlowIntent(current.length + 1, currency)]);
  }

  function addTrade() {
    setTrades((current) => [...current, createTradeIntent(current.length + 1)]);
  }

  function addPositionTrade(position: PortfolioPositionView, side: "BUY" | "SELL") {
    setTrades((current) => [
      ...current,
      createTradeIntentFromPosition(current.length + 1, position, side),
    ]);
  }

  function netCashImpact(): string {
    const total = cashFlows.reduce((sum, item) => {
      const amount = Math.abs(item.amount || 0);
      return item.direction === "OUT" ? sum - amount : sum + amount;
    }, 0);
    return total.toFixed(2);
  }

  function validTradeCount(): number {
    return trades.filter((item) => item.instrumentId.trim().length > 0 && item.quantity > 0).length;
  }

  function validCashFlowRows(): ProposalDraftCashFlowIntent[] {
    return cashFlows.filter((item) => item.currency.trim().length > 0 && item.amount > 0);
  }

  function validTradeRows(): ProposalDraftTradeIntent[] {
    return trades.filter((item) => item.instrumentId.trim().length > 0 && item.quantity > 0);
  }

  function syncEvaluationFromWorkspace(envelope: AdvisoryWorkspaceEnvelopeResponse) {
    setWorkspaceEnvelope(envelope);
    const latestProposalResult = extractLatestProposalResult(envelope);
    if (latestProposalResult) {
      setResult({
        correlation_id: envelope.correlation_id,
        contract_version: envelope.contract_version,
        data: latestProposalResult,
      });
    }
  }

  async function createEvaluatedWorkspace(values: FormInput): Promise<AdvisoryWorkspaceEnvelopeResponse> {
    const mandateId = values.mandateId?.trim();
    const workspaceResponse = await createAdvisoryWorkspace({
      body: {
        workspace_name: values.proposalTitle,
        created_by: values.createdBy,
        input_mode: "stateful",
        stateful_input: {
          portfolio_id: values.portfolioId,
          as_of: values.asOfDate,
          ...(mandateId ? { mandate_id: mandateId } : {}),
        },
      },
    });
    const workspaceId = extractWorkspaceId(workspaceResponse);
    if (!workspaceId) {
      throw new Error("Advisory workspace was created without a workspace identifier.");
    }

    setActiveWorkspaceId(workspaceId);
    let latestResponse = workspaceResponse;
    let actionCount = 0;

    for (const item of validCashFlowRows()) {
      latestResponse = await applyAdvisoryWorkspaceDraftAction(workspaceId, {
        body: {
          actor_id: values.createdBy,
          action_type: "ADD_CASH_FLOW",
          cash_flow: {
            intent_type: "CASH_FLOW",
            currency: item.currency.toUpperCase(),
            amount: signedCashAmount(item),
            ...(item.description?.trim() ? { description: item.description.trim() } : {}),
          },
        },
      });
      actionCount += 1;
    }

    for (const item of validTradeRows()) {
      latestResponse = await applyAdvisoryWorkspaceDraftAction(workspaceId, {
        body: {
          actor_id: values.createdBy,
          action_type: "ADD_TRADE",
          trade: {
            intent_type: "SECURITY_TRADE",
            side: item.side,
            instrument_id: item.instrumentId.trim(),
            quantity: decimalString(item.quantity, 4),
          },
        },
      });
      actionCount += 1;
    }

    if (actionCount === 0) {
      latestResponse = await evaluateAdvisoryWorkspace(workspaceId);
    }

    syncEvaluationFromWorkspace(latestResponse);
    return latestResponse;
  }

  async function onSubmit(values: FormInput) {
    setError(null);
    setResult(null);
    setSavedProposalId(null);
    setWorkspaceEnvelope(null);
    setLoading(true);
    try {
      await createEvaluatedWorkspace(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveDraft() {
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    const values = form.getValues();
    setError(null);
    setSavingDraft(true);
    try {
      const evaluatedWorkspace = await createEvaluatedWorkspace(values);
      const workspaceId = extractWorkspaceId(evaluatedWorkspace);
      if (!workspaceId) {
        throw new Error("Advisory workspace cannot be handed off without a workspace identifier.");
      }
      const handoffResponse = await handoffAdvisoryWorkspace(
        workspaceId,
        {
          body: {
            handoff_by: values.createdBy,
            metadata: {
              title: values.proposalTitle,
              ...(values.mandateId?.trim() ? { mandate_id: values.mandateId.trim() } : {}),
            },
          },
        },
        `${values.idempotencyKey}-handoff`
      );
      setSavedProposalId(extractHandoffProposalId(handoffResponse));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <SectionBlock
      title="Create Advisory Proposal"
      subtitle="Prepare advisor-use proposal inputs, simulate portfolio impact, and save a governed draft."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
        <Controller
          control={form.control}
          name="idempotencyKey"
          render={({ field }) => <input type="hidden" {...field} />}
        />
        <Controller
          control={form.control}
          name="createdBy"
          render={({ field }) => <input type="hidden" {...field} />}
        />

        <div className={styles.summaryStrip} aria-label="Proposal setup summary">
          <div>
            <span>Portfolio</span>
            <strong>{portfolioId || "Not selected"}</strong>
          </div>
          <div>
            <span>Base Currency</span>
            <strong>{baseCurrency || "N/A"}</strong>
          </div>
          <div>
            <span>Source Cash</span>
            <strong>
              {formatCurrencyValue(sourceCashAmount, baseCurrency || "USD")}
            </strong>
          </div>
          <div>
            <span>Trade Lines Ready</span>
            <strong>{validTradeCount()}</strong>
          </div>
          <div>
            <span>As-of Date</span>
            <strong>{asOfDate || "Not selected"}</strong>
          </div>
          <div>
            <span>Indicative Cash After Draft</span>
            <strong>{formatCurrencyValue(draftPreview.proposedCash, baseCurrency || "USD")}</strong>
          </div>
        </div>

        <div className={styles.workspaceGrid}>
          <aside className={styles.actionRail} aria-label="Proposal workflow actions">
            <section className={styles.actionPanel}>
              <div>
                <h3>Advisor Workflow</h3>
                <p>
                  Simulate first to review portfolio impact, then save a draft for risk and compliance routing.
                </p>
              </div>
              <ul>
                <li>Portfolio context captured</li>
                <li>Cash movement model ready</li>
                <li>{validTradeCount()} security order lines ready</li>
                {activeWorkspaceId ? <li>Workspace {activeWorkspaceId} evaluated by Advise</li> : null}
              </ul>
              <Stack spacing={1} className={styles.actionButtons}>
                <Button type="submit" variant="contained" disabled={loading} fullWidth>
                  {loading ? "Evaluating..." : "Evaluate Workspace"}
                </Button>
                <Button type="button" variant="outlined" onClick={onSaveDraft} disabled={savingDraft} fullWidth>
                  {savingDraft ? "Handing Off..." : "Save Advisor Draft"}
                </Button>
                <Button component={Link} href="/proposals" variant="text" fullWidth>
                  View Proposal Queue
                </Button>
              </Stack>
            </section>
          </aside>

          <div className={styles.mainLane}>
            <section className={styles.panel} aria-labelledby="portfolio-context-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="portfolio-context-heading">Portfolio Context</h3>
                  <p>Confirm the account, currency, and available liquidity before building the draft.</p>
                </div>
              </div>
              <div className={styles.inputGrid}>
                <Controller
                  control={form.control}
                  name="portfolioId"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Portfolio ID"
                      size="small"
                      fullWidth
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? "Private banking portfolio under review"}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="baseCurrency"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Base Currency"
                      size="small"
                      fullWidth
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? "Reporting currency for the proposal"}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="asOfDate"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Advisory As-of Date"
                      size="small"
                      fullWidth
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? "Source portfolio context resolved by Advise"}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="mandateId"
                  render={({ field }) => (
                    <TextField
                      label="Mandate ID"
                      size="small"
                      fullWidth
                      {...field}
                      helperText="Optional advisory mandate context"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="cashAmount"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Fallback Cash"
                      size="small"
                      fullWidth
                      type="number"
                      value={field.value}
                      onChange={(event) => {
                        const next = (event.target as HTMLInputElement).valueAsNumber;
                        field.onChange(Number.isNaN(next) ? 0 : next);
                      }}
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message ??
                        "Used only when portfolio-book cash is unavailable; Advise resolves source cash"
                      }
                    />
                  )}
                />
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="current-positions-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="current-positions-heading">Current Positions</h3>
                  <p>
                    Start from the live portfolio book, then buy more units or sell down holdings into
                    the advisor-use draft.
                  </p>
                </div>
                <span>{positionsLoading ? "Loading" : `${positions.length} positions`}</span>
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
                            {formatCurrencyValue(position.market_value_base ?? 0, baseCurrency || "USD")}
                          </td>
                          <td>{formatPercentValue(position.weight_pct ?? 0)}</td>
                          <td>
                            <div className={styles.positionActions}>
                              <Button
                                type="button"
                                size="small"
                                variant="outlined"
                                onClick={() => addPositionTrade(position, "BUY")}
                              >
                                Buy More
                              </Button>
                              <Button
                                type="button"
                                size="small"
                                variant="outlined"
                                color="inherit"
                                onClick={() => addPositionTrade(position, "SELL")}
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
                      Showing first 12 holdings. Use the instrument field below to add another held or off-book security.
                    </Text>
                  ) : null}
                </div>
              ) : (
                <div className={styles.emptyBookNotice}>
                  {positionsLoading
                    ? "Loading current holdings from the portfolio book."
                    : "No current positions are available. Add cash or an off-book instrument to begin the draft."}
                </div>
              )}
            </section>

            <section className={styles.panel} aria-labelledby="cash-movements-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="cash-movements-heading">Cash Movements</h3>
                  <p>Model client subscriptions, withdrawals, and liquidity changes.</p>
                </div>
                <span>Net {netCashImpact()}</span>
              </div>
              <div className={styles.intentRows}>
                {cashFlows.map((item) => (
                  <div key={item.id} className={styles.cashRow}>
                    <TextField
                      label="Movement"
                      size="small"
                      select
                      value={item.direction}
                      onChange={(event) =>
                        updateCashFlow(item.id, { direction: event.target.value as "IN" | "OUT" })
                      }
                    >
                      <MenuItem value="IN">Inflow</MenuItem>
                      <MenuItem value="OUT">Outflow</MenuItem>
                    </TextField>
                    <TextField
                      label="Currency"
                      size="small"
                      value={item.currency}
                      onChange={(event) => updateCashFlow(item.id, { currency: event.target.value })}
                    />
                    <TextField
                      label="Amount"
                      size="small"
                      type="number"
                      value={item.amount}
                      onChange={(event) => {
                        const next = (event.target as HTMLInputElement).valueAsNumber;
                        updateCashFlow(item.id, { amount: Number.isNaN(next) ? 0 : next });
                      }}
                    />
                    <TextField
                      label="Advisor Note"
                      size="small"
                      fullWidth
                      value={item.description ?? ""}
                      onChange={(event) => updateCashFlow(item.id, { description: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      color="inherit"
                      disabled={cashFlows.length === 1}
                      onClick={() => setCashFlows((current) => current.filter((row) => row.id !== item.id))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outlined"
                onClick={() => addCashFlow(form.getValues().baseCurrency || "USD")}
              >
                Add Cash Movement
              </Button>
            </section>

            <section className={styles.panel} aria-labelledby="security-orders-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="security-orders-heading">Draft Order Blotter</h3>
                  <p>
                    Edit units for held positions or add an off-book instrument that is not already in
                    the portfolio.
                  </p>
                </div>
                <span>{validTradeCount()} ready</span>
              </div>
              <div className={styles.intentRows}>
                {trades.map((item) => (
                  <div key={item.id} className={styles.tradeRow}>
                    <TextField
                      label="Order"
                      size="small"
                      select
                      value={item.side}
                      onChange={(event) => updateTrade(item.id, { side: event.target.value as "BUY" | "SELL" })}
                    >
                      <MenuItem value="BUY">Buy</MenuItem>
                      <MenuItem value="SELL">Sell</MenuItem>
                    </TextField>
                    <TextField
                      label="Instrument"
                      size="small"
                      fullWidth
                      value={item.instrumentId}
                      onChange={(event) => updateTrade(item.id, { instrumentId: event.target.value })}
                    />
                    <TextField
                      label="Asset Class"
                      size="small"
                      value={item.assetClass ?? ""}
                      onChange={(event) => updateTrade(item.id, { assetClass: event.target.value })}
                      placeholder="Equities"
                    />
                    <TextField
                      label="Quantity"
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(event) => {
                        const next = (event.target as HTMLInputElement).valueAsNumber;
                        updateTrade(item.id, { quantity: Number.isNaN(next) ? 0 : next });
                      }}
                    />
                    <TextField
                      label="Reference Price"
                      size="small"
                      type="number"
                      value={item.referencePrice ?? 0}
                      onChange={(event) => {
                        const next = (event.target as HTMLInputElement).valueAsNumber;
                        updateTrade(item.id, { referencePrice: Number.isNaN(next) ? 0 : next });
                      }}
                      helperText={item.source === "NEW_INSTRUMENT" ? "Used for indicative preview" : undefined}
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      color="inherit"
                      disabled={trades.length === 1}
                      onClick={() => setTrades((current) => current.filter((row) => row.id !== item.id))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outlined" onClick={addTrade}>
                Add Off-Book Instrument
              </Button>
            </section>

            <section className={styles.panel} aria-labelledby="draft-impact-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="draft-impact-heading">Indicative Draft Impact</h3>
                  <p>
                    Live advisor preview from current holdings, draft orders, and cash movements.
                    Formal suitability, risk, and allocation proof is produced by simulation.
                  </p>
                </div>
                <span>
                  {formatCurrencyValue(draftPreview.proposedPortfolioValue, baseCurrency || "USD")}
                </span>
              </div>
              <div className={styles.impactSummaryGrid}>
                <div>
                  <span>Current Value</span>
                  <strong>
                    {formatCurrencyValue(draftPreview.currentPortfolioValue, baseCurrency || "USD")}
                  </strong>
                </div>
                <div>
                  <span>Proposed Value</span>
                  <strong>
                    {formatCurrencyValue(draftPreview.proposedPortfolioValue, baseCurrency || "USD")}
                  </strong>
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

            <section className={styles.panel} aria-labelledby="draft-details-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="draft-details-heading">Draft Details</h3>
                  <p>Name the advisor-use draft before saving it into the proposal workflow.</p>
                </div>
              </div>
              <Controller
                control={form.control}
                name="proposalTitle"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Advisory Draft Title"
                    size="small"
                    fullWidth
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? "Visible in the proposal queue"}
                  />
                )}
              />
            </section>
          </div>

        </div>
      </form>

      {error ? (
        <Alert severity="error" className={styles.message}>
          {error}
        </Alert>
      ) : null}

      {result ? (
        <section className={styles.resultPanel} aria-label="Simulation summary">
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
          {simulationHighlights(result).length ? (
            <div className={styles.outputGrid}>
              {simulationHighlights(result).map((highlight) => (
                <div key={highlight.label}>
                  <span>{highlight.label}</span>
                  <strong>{highlight.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Text variant="secondary">No additional scalar metrics were returned by the simulation engine.</Text>
          )}
          {extractEvaluationSummary(workspaceEnvelope) ? (
            <div className={styles.outputGrid}>
              <div>
                <span>Review Issues</span>
                <strong>{String(extractEvaluationSummary(workspaceEnvelope)?.review_issue_count ?? 0)}</strong>
              </div>
              <div>
                <span>Blocking Issues</span>
                <strong>{String(extractEvaluationSummary(workspaceEnvelope)?.blocking_issue_count ?? 0)}</strong>
              </div>
              <div>
                <span>Draft Trades</span>
                <strong>
                  {String(
                    recordValue(extractEvaluationSummary(workspaceEnvelope)?.impact_summary)?.trade_count ?? 0
                  )}
                </strong>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {savedProposalId ? (
        <section className={styles.resultPanel} aria-label="Saved advisory draft">
          <Text variant="body">Draft saved as Proposal ID: {savedProposalId}</Text>
          <Text variant="body">
            <Link href={`/proposals/${savedProposalId}`}>Open Proposal Details</Link>
          </Text>
        </section>
      ) : null}
    </SectionBlock>
  );
}
