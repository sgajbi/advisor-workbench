"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

import { createProposal, simulateProposal } from "../api";
import {
  buildSimulatePayload,
  CashFlowIntentInput,
  TradeIntentInput,
} from "../simulation-payload";
import { ProposalSimulateResponse } from "../types";
import { SectionBlock, Text } from "@/design-system";

const schema = z.object({
  idempotencyKey: z.string().min(6, "Idempotency key is required"),
  createdBy: z.string().min(1, "Created by is required"),
  proposalTitle: z.string().min(1, "Proposal title is required"),
  portfolioId: z.string().min(1, "Portfolio ID is required"),
  baseCurrency: z.string().min(3, "Base currency is required"),
  cashAmount: z.number().positive("Cash amount must be greater than 0"),
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
      proposalTitle: "lotus-manage proposal draft",
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

  function updateCashFlow(id: string, patch: Partial<CashFlowIntentRow>) {
    setCashFlows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateTrade(id: string, patch: Partial<TradeIntentRow>) {
    setTrades((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addCashFlow(baseCurrency: string) {
    setCashFlows((current) => [...current, createCashFlowIntent(current.length + 1, baseCurrency)]);
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
      title="Create And Simulate Proposal"
      subtitle="Build iterative intent sets, simulate impact, and persist an advisory draft."
    >
      <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
        <Stack spacing={1.2}>
          <Text variant="label">Portfolio Inputs</Text>
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
                helperText={fieldState.error?.message ?? "Internal portfolio identifier"}
              />
            )}
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
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
                  helperText={fieldState.error?.message ?? "Reporting currency (for example USD)"}
                />
              )}
            />
            <Controller
              control={form.control}
              name="cashAmount"
              render={({ field, fieldState }) => (
                <TextField
                  label="Available Cash"
                  size="small"
                  fullWidth
                  type="number"
                  value={field.value}
                  onChange={(event) => {
                    const next = (event.target as HTMLInputElement).valueAsNumber;
                    field.onChange(Number.isNaN(next) ? 0 : next);
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? "Amount available for investment decisions"}
                />
              )}
            />
          </Stack>

          <Text variant="label">Scenario Intent Builder</Text>
          <Text variant="secondary">
            Net cash impact: {netCashImpact()} | Valid trades: {validTradeCount()}
          </Text>

          <Stack spacing={1}>
            <Text variant="subsectionTitle">Cash Flow Intents</Text>
            {cashFlows.map((item) => (
              <Stack key={item.id} direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  label="Direction"
                  size="small"
                  select
                  value={item.direction}
                  onChange={(event) =>
                    updateCashFlow(item.id, { direction: event.target.value as "IN" | "OUT" })
                  }
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="IN">IN</MenuItem>
                  <MenuItem value="OUT">OUT</MenuItem>
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
                  label="Description"
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
              </Stack>
            ))}
            <Button
              type="button"
              variant="outlined"
              onClick={() => addCashFlow(form.getValues().baseCurrency || "USD")}
            >
              Add Cash Flow
            </Button>
          </Stack>

          <Stack spacing={1}>
            <Text variant="subsectionTitle">Trade Intents</Text>
            {trades.map((item) => (
              <Stack key={item.id} direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  label="Side"
                  size="small"
                  select
                  value={item.side}
                  onChange={(event) => updateTrade(item.id, { side: event.target.value as "BUY" | "SELL" })}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="BUY">BUY</MenuItem>
                  <MenuItem value="SELL">SELL</MenuItem>
                </TextField>
                <TextField
                  label="Instrument ID"
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
              </Stack>
            ))}
            <Button type="button" variant="outlined" onClick={addTrade}>
              Add Trade
            </Button>
          </Stack>

          <Text variant="label">Proposal Metadata</Text>
          <Controller
            control={form.control}
            name="idempotencyKey"
            render={({ field, fieldState }) => (
              <TextField
                label="Idempotency Key"
                size="small"
                fullWidth
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? "Used to prevent duplicate submissions"}
              />
            )}
          />
          <Controller
            control={form.control}
            name="createdBy"
            render={({ field, fieldState }) => (
              <TextField
                label="Created By"
                size="small"
                fullWidth
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? "Advisor or user identifier"}
              />
            )}
          />
          <Controller
            control={form.control}
            name="proposalTitle"
            render={({ field, fieldState }) => (
              <TextField
                label="Proposal Title"
                size="small"
                fullWidth
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? "Human-readable draft title"}
              />
            )}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.2 }}>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Simulating..." : "Simulate Proposal"}
          </Button>
          <Button type="button" variant="outlined" onClick={onSaveDraft} disabled={savingDraft}>
            {savingDraft ? "Saving Draft..." : "Save Draft"}
          </Button>
        </Stack>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 1.2 }}>
          Error: {error}
        </Alert>
      ) : null}

      {result ? (
        <Box sx={{ mt: 1.2 }}>
          <Text variant="sectionTitle">Simulation Summary</Text>
          <div className="kpi-grid" style={{ marginTop: 8 }}>
            <div className="kpi-box">
              <p className="kpi-label">Status</p>
              <p className="kpi-value">{result.data.status ?? "UNKNOWN"}</p>
            </div>
            <div className="kpi-box">
              <p className="kpi-label">Proposal Run ID</p>
              <p className="kpi-value">{String(result.data.proposal_run_id ?? "N/A")}</p>
            </div>
            <div className="kpi-box">
              <p className="kpi-label">Correlation ID</p>
              <p className="kpi-value" style={{ fontSize: "0.9rem" }}>
                {result.correlation_id}
              </p>
            </div>
          </div>
          <Divider sx={{ my: 1 }} />
          <Text variant="label">Key Output Signals</Text>
          {simulationHighlights(result).length ? (
            <Grid container spacing={1}>
              {simulationHighlights(result).map((highlight) => (
                <Grid size={{ xs: 12, md: 6 }} key={highlight.label}>
                  <div className="analytics-stat">
                    <Text variant="label">{highlight.label}</Text>
                    <Text variant="metricValueCompact">{highlight.value}</Text>
                  </div>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Text variant="secondary">No additional scalar metrics were returned by the simulation engine.</Text>
          )}
        </Box>
      ) : null}

      {savedProposalId ? (
        <Box sx={{ mt: 1.2 }}>
          <Text variant="body">Draft saved as Proposal ID: {savedProposalId}</Text>
          <Text variant="body">
            <Link href={`/proposals/${savedProposalId}`}>Open Proposal Details</Link>
          </Text>
        </Box>
      ) : null}
      <Text variant="body">
        <Link href="/proposals">View Proposal Workspace</Link>
      </Text>
    </SectionBlock>
  );
}
