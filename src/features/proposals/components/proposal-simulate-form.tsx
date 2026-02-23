"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

import { createProposal, simulateProposal } from "../api";
import { ProposalSimulateResponse } from "../types";

const DEFAULT_PAYLOAD = {
  body: {
    portfolio_snapshot: {
      portfolio_id: "pf_demo_ui_1",
      base_currency: "USD",
      positions: [],
      cash_balances: [{ currency: "USD", amount: "10000.00" }],
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

const schema = z.object({
  idempotencyKey: z.string().min(6, "Idempotency key is required"),
  createdBy: z.string().min(1, "Created by is required"),
  proposalTitle: z.string().min(1, "Proposal title is required"),
  payloadText: z.string().min(2, "Payload is required"),
});

type FormInput = z.infer<typeof schema>;

export default function ProposalSimulateForm() {
  const defaultText = useMemo(() => JSON.stringify(DEFAULT_PAYLOAD, null, 2), []);
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
      payloadText: defaultText,
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
      const payload = JSON.parse(values.payloadText) as { body: Record<string, unknown> };
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
      const payload = JSON.parse(values.payloadText) as { body: Record<string, unknown> };
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
        Proposal Simulation
      </Typography>
      <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
        <Stack spacing={1}>
          <Controller
            control={form.control}
            name="idempotencyKey"
            render={({ field, fieldState }) => (
              <TextField
                label="Idempotency Key"
                size="small"
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
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
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
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
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="payloadText"
            render={({ field, fieldState }) => (
              <TextField
                label="Request Payload"
                multiline
                minRows={16}
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                sx={{ "& textarea": { fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 13 } }}
              />
            )}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
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
            Result
          </Typography>
          <Typography>Status: {result.data.status ?? "UNKNOWN"}</Typography>
          <Typography>Proposal Run ID: {String(result.data.proposal_run_id ?? "N/A")}</Typography>
          <details>
            <summary>Raw response</summary>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
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
