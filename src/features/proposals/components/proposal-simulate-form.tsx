"use client";

import { useMemo, useState } from "react";

import { simulateProposal } from "../api";
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

export default function ProposalSimulateForm() {
  const defaultText = useMemo(
    () => JSON.stringify(DEFAULT_PAYLOAD, null, 2),
    []
  );

  const [payloadText, setPayloadText] = useState(defaultText);
  const [idempotencyKey, setIdempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `ui-${crypto.randomUUID()}`;
    }
    return `ui-${Date.now()}`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProposalSimulateResponse | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const payload = JSON.parse(payloadText) as { body: Record<string, unknown> };
      const response = await simulateProposal(payload, idempotencyKey);
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Proposal Simulation</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="idem-key">Idempotency Key</label>
        <input
          id="idem-key"
          value={idempotencyKey}
          onChange={(e) => setIdempotencyKey(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: "0.75rem" }}
        />

        <label htmlFor="payload">Request Payload</label>
        <textarea
          id="payload"
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={20}
          style={{ display: "block", width: "100%", fontFamily: "monospace" }}
        />

        <button type="submit" disabled={loading} style={{ marginTop: "0.75rem" }}>
          {loading ? "Simulating..." : "Simulate Proposal"}
        </button>
      </form>

      {error ? (
        <p style={{ color: "crimson", marginTop: "0.75rem" }}>Error: {error}</p>
      ) : null}

      {result ? (
        <div style={{ marginTop: "0.75rem" }}>
          <h3>Result</h3>
          <p>Status: {result.data.status ?? "UNKNOWN"}</p>
          <p>Proposal Run ID: {String(result.data.proposal_run_id ?? "N/A")}</p>
          <details>
            <summary>Raw response</summary>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
