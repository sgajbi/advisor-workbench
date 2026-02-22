"use client";

import { useEffect, useState } from "react";

import {
  approveCompliance,
  approveRisk,
  getProposal,
  getProposalApprovals,
  getProposalWorkflowEvents,
  recordClientConsent,
  submitProposal,
} from "../api";
import {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalWorkflowEventsData,
} from "../types";

type Props = {
  proposalId: string;
};

export default function ProposalDetailView({ proposalId }: Props) {
  const [data, setData] = useState<ProposalDetailData | null>(null);
  const [workflow, setWorkflow] = useState<ProposalWorkflowEventsData | null>(null);
  const [approvals, setApprovals] = useState<ProposalApprovalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [detail, workflowData, approvalsData] = await Promise.all([
          getProposal(proposalId, false),
          getProposalWorkflowEvents(proposalId),
          getProposalApprovals(proposalId),
        ]);
        if (!cancelled) {
          setData(detail);
          setWorkflow(workflowData);
          setApprovals(approvalsData);
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

  async function onSubmitForReview(reviewType: "RISK" | "COMPLIANCE") {
    if (!data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await submitProposal(proposalId, {
        actor_id: "advisor_1",
        expected_state: data.proposal.current_state,
        review_type: reviewType,
        reason: { source: "ui" },
      });
      await reloadAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  async function onApproveRisk() {
    if (!data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await approveRisk(proposalId, {
        actor_id: "risk_officer_1",
        expected_state: data.proposal.current_state,
        details: { source: "ui" },
      });
      await reloadAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  async function onApproveCompliance() {
    if (!data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await approveCompliance(proposalId, {
        actor_id: "compliance_officer_1",
        expected_state: data.proposal.current_state,
        details: { source: "ui" },
      });
      await reloadAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  async function onRecordClientConsent() {
    if (!data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await recordClientConsent(proposalId, {
        actor_id: "advisor_1",
        expected_state: data.proposal.current_state,
        details: { channel: "IN_PERSON", source: "ui" },
      });
      await reloadAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  async function reloadAll() {
    const [detail, workflowData, approvalsData] = await Promise.all([
      getProposal(proposalId, false),
      getProposalWorkflowEvents(proposalId),
      getProposalApprovals(proposalId),
    ]);
    setData(detail);
    setWorkflow(workflowData);
    setApprovals(approvalsData);
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
      {data.proposal.current_state === "DRAFT" ? (
        <div>
          <button type="button" onClick={() => void onSubmitForReview("RISK")} disabled={acting}>
            Submit To Risk Review
          </button>
          <button
            type="button"
            onClick={() => void onSubmitForReview("COMPLIANCE")}
            disabled={acting}
            style={{ marginLeft: "0.5rem" }}
          >
            Submit To Compliance Review
          </button>
        </div>
      ) : null}
      {data.proposal.current_state === "RISK_REVIEW" ? (
        <button type="button" onClick={onApproveRisk} disabled={acting}>
          Approve Risk
        </button>
      ) : null}
      {data.proposal.current_state === "COMPLIANCE_REVIEW" ? (
        <button type="button" onClick={onApproveCompliance} disabled={acting}>
          Approve Compliance
        </button>
      ) : null}
      {data.proposal.current_state === "AWAITING_CLIENT_CONSENT" ? (
        <button type="button" onClick={onRecordClientConsent} disabled={acting}>
          Record Client Consent
        </button>
      ) : null}
      {data.proposal.current_state === "EXECUTION_READY" ? (
        <p>Proposal is execution ready.</p>
      ) : null}

      <h3 style={{ marginTop: "1rem" }}>Workflow Timeline</h3>
      {workflow?.events?.length ? (
        <ul>
          {workflow.events.map((event) => (
            <li key={event.event_id}>
              {event.event_type} ({event.from_state ?? "N/A"} -&gt; {event.to_state}) by {event.actor_id}
            </li>
          ))}
        </ul>
      ) : (
        <p>No workflow events.</p>
      )}

      <h3 style={{ marginTop: "1rem" }}>Approvals</h3>
      {approvals?.approvals?.length ? (
        <ul>
          {approvals.approvals.map((approval) => (
            <li key={approval.approval_id}>
              {approval.approval_type}: {approval.approved ? "APPROVED" : "REJECTED"} by{" "}
              {approval.actor_id}
            </li>
          ))}
        </ul>
      ) : (
        <p>No approvals recorded.</p>
      )}
      <details style={{ marginTop: "0.75rem" }}>
        <summary>Raw proposal detail</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </section>
  );
}
