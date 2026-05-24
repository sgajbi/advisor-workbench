"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, MenuItem, Stack, TextField } from "@mui/material";

import { createProposal, simulateProposal } from "../api";
import {
  buildSimulatePayload,
  CashFlowIntentInput,
  TradeIntentInput,
} from "../simulation-payload";
import { ProposalSimulateResponse } from "../types";
import { SectionBlock, Text } from "@/design-system";
import styles from "./proposal-simulate-form.module.css";

const schema = z.object({
  idempotencyKey: z.string().min(6, "Draft control key is required"),
  createdBy: z.string().min(1, "Advisor identity is required"),
  proposalTitle: z.string().min(1, "Advisory draft title is required"),
  portfolioId: z.string().min(1, "Portfolio ID is required"),
  baseCurrency: z.string().min(3, "Base currency is required"),
  cashAmount: z.number().positive("Investable cash must be greater than 0"),
});

type FormInput = z.infer<typeof schema>;

type CashFlowIntentRow = CashFlowIntentInput & {
  id: string;
};

type TradeIntentRow = TradeIntentInput & {
  id: string;
};

function createCashFlowIntent(index: number, baseCurrency: string): CashFlowIntentRow {
  return {
    id: `cash_${index}`,
    currency: baseCurrency,
    amount: 0,
    direction: "IN",
    description: "",
  };
}

function createTradeIntent(index: number): TradeIntentRow {
  return {
    id: `trade_${index}`,
    side: "BUY",
    instrumentId: "",
    quantity: 0,
  };
}

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

export default function ProposalSimulateForm({
  initialPortfolioId = "DEMO_DPM_EUR_001",
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
      baseCurrency: "USD",
      cashAmount: 10000,
    },
  });

  const [cashFlows, setCashFlows] = useState<CashFlowIntentRow[]>([
    createCashFlowIntent(1, "USD"),
  ]);
  const [trades, setTrades] = useState<TradeIntentRow[]>([createTradeIntent(1)]);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProposalSimulateResponse | null>(null);
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null);

  const portfolioId = form.watch("portfolioId");
  const baseCurrency = form.watch("baseCurrency");
  const cashAmount = form.watch("cashAmount");

  function updateCashFlow(id: string, patch: Partial<CashFlowIntentRow>) {
    setCashFlows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateTrade(id: string, patch: Partial<TradeIntentRow>) {
    setTrades((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addCashFlow(currency: string) {
    setCashFlows((current) => [...current, createCashFlowIntent(current.length + 1, currency)]);
  }

  function addTrade() {
    setTrades((current) => [...current, createTradeIntent(current.length + 1)]);
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

  async function onSubmit(values: FormInput) {
    setError(null);
    setResult(null);
    setSavedProposalId(null);
    setLoading(true);
    try {
      const payload = buildSimulatePayload(values, cashFlows, trades);
      const response = await simulateProposal(payload, values.idempotencyKey);
      setResult(response);
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
      const payload = buildSimulatePayload(values, cashFlows, trades);
      const createResponse = await createProposal(
        {
          body: {
            created_by: values.createdBy,
            simulate_request: payload.body,
            metadata: {
              title: values.proposalTitle,
            },
          },
        },
        `${values.idempotencyKey}-create`
      );
      const proposal = (createResponse.data.proposal as { proposal_id?: string } | undefined) ?? {};
      setSavedProposalId(proposal.proposal_id ?? null);
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
            <span>Investable Cash</span>
            <strong>
              {baseCurrency || "USD"} {Number(cashAmount || 0).toLocaleString()}
            </strong>
          </div>
          <div>
            <span>Trade Lines Ready</span>
            <strong>{validTradeCount()}</strong>
          </div>
        </div>

        <div className={styles.workspaceGrid}>
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
                  name="cashAmount"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Investable Cash"
                      size="small"
                      fullWidth
                      type="number"
                      value={field.value}
                      onChange={(event) => {
                        const next = (event.target as HTMLInputElement).valueAsNumber;
                        field.onChange(Number.isNaN(next) ? 0 : next);
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? "Cash available for investment decisions"}
                    />
                  )}
                />
              </div>
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
                  <h3 id="security-orders-heading">Security Orders</h3>
                  <p>Enter proposed buy or sell lines that should be tested before advisor review.</p>
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
                      label="Quantity"
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(event) => {
                        const next = (event.target as HTMLInputElement).valueAsNumber;
                        updateTrade(item.id, { quantity: Number.isNaN(next) ? 0 : next });
                      }}
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
                Add Security Order
              </Button>
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

          <aside className={styles.actionRail} aria-label="Proposal workflow actions">
            <section className={styles.actionPanel}>
              <h3>Advisor Workflow</h3>
              <p>
                Simulate first to review portfolio impact, then save a draft for risk and compliance routing.
              </p>
              <ul>
                <li>Portfolio context captured</li>
                <li>Cash movement model ready</li>
                <li>{validTradeCount()} security order lines ready</li>
              </ul>
              <Stack spacing={1}>
                <Button type="submit" variant="contained" disabled={loading} fullWidth>
                  {loading ? "Simulating..." : "Simulate Impact"}
                </Button>
                <Button type="button" variant="outlined" onClick={onSaveDraft} disabled={savingDraft} fullWidth>
                  {savingDraft ? "Saving Draft..." : "Save Advisor Draft"}
                </Button>
                <Button component={Link} href="/proposals" variant="text" fullWidth>
                  View Proposal Queue
                </Button>
              </Stack>
            </section>
          </aside>
        </div>
      </form>

      {error ? (
        <Alert severity="error" className={styles.message}>
          {error}
        </Alert>
      ) : null}

      {result ? (
        <section className={styles.resultPanel} aria-label="Simulation summary">
          <Text variant="sectionTitle">Simulation Summary</Text>
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
