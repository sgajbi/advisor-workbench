"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

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
  const [revision, setRevision] = useState(0);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(() => ["proposal-detail", proposalId, revision], [proposalId, revision]);
  const detailQuery = useQuery({
    queryKey,
    queryFn: async () => await getProposal(proposalId, false),
  });
  const workflowQuery = useQuery({
    queryKey: ["proposal-workflow", proposalId, revision],
    queryFn: async () => await getProposalWorkflowEvents(proposalId),
  });
  const approvalsQuery = useQuery({
    queryKey: ["proposal-approvals", proposalId, revision],
    queryFn: async () => await getProposalApprovals(proposalId),
  });

  async function onSubmitForReview(reviewType: "RISK" | "COMPLIANCE") {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await submitProposal(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        review_type: reviewType,
        reason: { source: "ui" },
      });
      setRevision((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  async function onApproveRisk() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await approveRisk(proposalId, {
        actor_id: "risk_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      });
      setRevision((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  async function onApproveCompliance() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await approveCompliance(proposalId, {
        actor_id: "compliance_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      });
      setRevision((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  async function onRecordClientConsent() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await recordClientConsent(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { channel: "IN_PERSON", source: "ui" },
      });
      setRevision((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  if (detailQuery.isLoading || workflowQuery.isLoading || approvalsQuery.isLoading) {
    return (
      <Paper className="section-card">
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography>Loading proposal...</Typography>
        </Stack>
      </Paper>
    );
  }

  const queryError = detailQuery.error ?? workflowQuery.error ?? approvalsQuery.error;

  if (error || queryError) {
    return (
      <Alert severity="error">
        Error: {error ?? (queryError instanceof Error ? queryError.message : "Unknown error")}
      </Alert>
    );
  }

  if (!detailQuery.data?.proposal) {
    return <Typography>Proposal not found.</Typography>;
  }

  const data = detailQuery.data as ProposalDetailData;
  const workflow = workflowQuery.data as ProposalWorkflowEventsData | undefined;
  const approvals = approvalsQuery.data as ProposalApprovalsData | undefined;

  return (
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Proposal {data.proposal.proposal_id}
      </Typography>
      <Typography sx={{ mb: 0.4 }}>State: {data.proposal.current_state}</Typography>
      <Typography sx={{ mb: 0.4 }}>Portfolio: {data.proposal.portfolio_id ?? "N/A"}</Typography>
      <Typography sx={{ mb: 1.2 }}>Current version: {String(data.proposal.current_version_no ?? "N/A")}</Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
      {data.proposal.current_state === "DRAFT" ? (
        <>
          <Button type="button" variant="contained" onClick={() => void onSubmitForReview("RISK")} disabled={acting}>
            Submit To Risk Review
          </Button>
          <Button
            type="button"
            variant="outlined"
            onClick={() => void onSubmitForReview("COMPLIANCE")}
            disabled={acting}
          >
            Submit To Compliance Review
          </Button>
        </>
      ) : null}
      {data.proposal.current_state === "RISK_REVIEW" ? (
        <Button type="button" variant="contained" onClick={onApproveRisk} disabled={acting}>
          Approve Risk
        </Button>
      ) : null}
      {data.proposal.current_state === "COMPLIANCE_REVIEW" ? (
        <Button type="button" variant="contained" onClick={onApproveCompliance} disabled={acting}>
          Approve Compliance
        </Button>
      ) : null}
      {data.proposal.current_state === "AWAITING_CLIENT_CONSENT" ? (
        <Button type="button" variant="contained" onClick={onRecordClientConsent} disabled={acting}>
          Record Client Consent
        </Button>
      ) : null}
      {data.proposal.current_state === "EXECUTION_READY" ? (
        <Typography color="success.main">Proposal is execution ready.</Typography>
      ) : null}
      </Stack>

      <Typography variant="h6" component="h3" sx={{ mt: 1.2 }}>
        Workflow Timeline
      </Typography>
      {workflow?.events?.length ? (
        <Box component="ul" sx={{ pl: 2.2, mt: 0.7 }}>
          {workflow.events.map((event) => (
            <li key={event.event_id}>
              {event.event_type} ({event.from_state ?? "N/A"} -&gt; {event.to_state}) by {event.actor_id}
            </li>
          ))}
        </Box>
      ) : (
        <Typography className="muted">No workflow events.</Typography>
      )}

      <Typography variant="h6" component="h3" sx={{ mt: 1.2 }}>
        Approvals
      </Typography>
      {approvals?.approvals?.length ? (
        <Box component="ul" sx={{ pl: 2.2, mt: 0.7 }}>
          {approvals.approvals.map((approval) => (
            <li key={approval.approval_id}>
              {approval.approval_type}: {approval.approved ? "APPROVED" : "REJECTED"} by{" "}
              {approval.actor_id}
            </li>
          ))}
        </Box>
      ) : (
        <Typography className="muted">No approvals recorded.</Typography>
      )}
      <details style={{ marginTop: "0.75rem" }}>
        <summary>Raw proposal detail</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </Paper>
  );
}
