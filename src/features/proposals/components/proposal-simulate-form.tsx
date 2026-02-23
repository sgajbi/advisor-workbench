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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { createProposal, simulateProposal } from "../api";
import { ProposalSimulateResponse } from "../types";

const schema = z.object({
  idempotencyKey: z.string().min(6, "Idempotency key is required"),
  createdBy: z.string().min(1, "Created by is required"),
  proposalTitle: z.string().min(1, "Proposal title is required"),
  portfolioId: z.string().min(1, "Portfolio ID is required"),
  baseCurrency: z.string().min(3, "Base currency is required"),
  cashAmount: z.number().positive("Cash amount must be greater than 0"),
});

type FormInput = z.infer<typeof schema>;

function buildSimulatePayload(values: FormInput) {
  return {
    body: {
      portfolio_snapshot: {
        portfolio_id: values.portfolioId,
        base_currency: values.baseCurrency.toUpperCase(),
        positions: [],
        cash_balances: [
          {
            currency: values.baseCurrency.toUpperCase(),
            amount: values.cashAmount.toFixed(2),
          },
        ],
      },
      market_data_snapshot: {
        prices: [],
        fx_rates: [],
      },
      shelf_entries: [],
      options: {
        enable_proposal_simulation: true,
        proposal_apply_cash_flows_first: true,
        proposal_block_negative_cash: true,
      },
      proposed_cash_flows: [],
      proposed_trades: [],
    },
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

export default function ProposalSimulateForm() {
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
      proposalTitle: "DPM proposal draft",
      portfolioId: "pf_demo_ui_1",
      baseCurrency: "USD",
      cashAmount: 10000,
    },
  });

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProposalSimulateResponse | null>(null);
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null);

  async function onSubmit(values: FormInput) {
    setError(null);
    setResult(null);
    setSavedProposalId(null);
    setLoading(true);
    try {
      const payload = buildSimulatePayload(values);
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
      const payload = buildSimulatePayload(values);
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
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Create And Simulate Proposal
      </Typography>
      <Typography className="muted" sx={{ mb: 1 }}>
        Capture core advisory inputs and generate a proposal run without exposing raw API payloads.
      </Typography>
      <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
        <Stack spacing={1.2}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
            Portfolio Inputs
          </Typography>
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

          <Typography variant="subtitle2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Proposal Metadata
          </Typography>
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
          <Typography variant="h6" component="h3">
            Simulation Summary
          </Typography>
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
          <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 0.7 }}>
            Key Output Signals
          </Typography>
          {simulationHighlights(result).length ? (
            <Grid container spacing={1}>
              {simulationHighlights(result).map((highlight) => (
                <Grid size={{ xs: 12, md: 6 }} key={highlight.label}>
                  <Box sx={{ border: "1px solid #d4d8e1", borderRadius: 1.5, p: 0.9 }}>
                    <Typography sx={{ textTransform: "capitalize", color: "text.secondary", fontSize: 12 }}>
                      {highlight.label}
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{highlight.value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography className="muted">
              No additional scalar metrics were returned by the simulation engine.
            </Typography>
          )}
        </Box>
      ) : null}

      {savedProposalId ? (
        <Box sx={{ mt: 1.2 }}>
          <Typography>Draft saved as Proposal ID: {savedProposalId}</Typography>
          <Typography>
            <Link href={`/proposals/${savedProposalId}`}>Open Proposal Details</Link>
          </Typography>
        </Box>
      ) : null}
      <Typography sx={{ mt: 1.2 }}>
        <Link href="/proposals">View Proposal Workspace</Link>
      </Typography>
    </Paper>
  );
}
