"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listProposals } from "../api";
import { ProposalSummary } from "../types";

export default function ProposalListView() {
  const [items, setItems] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listProposals();
        if (!cancelled) {
          setItems(data.items ?? []);
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
  }, []);

  if (loading) {
    return <p>Loading proposals...</p>;
  }

  if (error) {
    return <p style={{ color: "crimson" }}>Error: {error}</p>;
  }

  return (
    <section>
      <h2>Proposal Workspace</h2>
      {items.length === 0 ? <p>No proposals found.</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.proposal_id}>
            <Link href={`/proposals/${item.proposal_id}`}>{item.proposal_id}</Link>
            {" "}- state: {item.current_state}
          </li>
        ))}
      </ul>
    </section>
  );
}
