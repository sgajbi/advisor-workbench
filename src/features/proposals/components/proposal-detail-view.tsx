"use client";

import { useEffect, useState } from "react";

import { getProposal, submitProposal } from "../api";
import { ProposalDetailData } from "../types";

type Props = {
  proposalId: string;
};

export default function ProposalDetailView({ proposalId }: Props) {
  const [data, setData] = useState<ProposalDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const detail = await getProposal(proposalId, false);
        if (!cancelled) {
          setData(detail);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  async function onSubmitForReview() {
    if (!data?.proposal?.current_state) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitProposal(proposalId, {
        actor_id: "advisor_1",
        expected_state: data.proposal.current_state,
        review_type: "RISK",
        reason: { source: "ui" },
      });
      const refreshed = await getProposal(proposalId, false);
      setData(refreshed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p>Loading proposal...</p>;
  }

  if (error) {
    return <p style={{ color: "crimson" }}>Error: {error}</p>;
  }

  if (!data?.proposal) {
    return <p>Proposal not found.</p>;
  }

  return (
    <section>
      <h2>Proposal {data.proposal.proposal_id}</h2>
      <p>State: {data.proposal.current_state}</p>
      <p>Portfolio: {data.proposal.portfolio_id ?? "N/A"}</p>
      <p>Current version: {String(data.proposal.current_version_no ?? "N/A")}</p>
      <button
        type="button"
        onClick={onSubmitForReview}
        disabled={submitting || data.proposal.current_state !== "DRAFT"}
      >
        {submitting ? "Submitting..." : "Submit For Review"}
      </button>
      <details style={{ marginTop: "0.75rem" }}>
        <summary>Raw proposal detail</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </section>
  );
}
