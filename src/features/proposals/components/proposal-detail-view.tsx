"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
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

function stageOrder(state: string): number {
  if (state === "DRAFT") {
    return 1;
  }
  if (state === "RISK_REVIEW" || state === "COMPLIANCE_REVIEW") {
    return 2;
  }
  if (state === "AWAITING_CLIENT_CONSENT") {
    return 3;
  }
  if (state === "EXECUTION_READY") {
    return 4;
  }
  return 0;
}

function stageDescription(state: string): string {
  if (state === "DRAFT") {
    return "Advisor draft is ready for review submission.";
  }
  if (state === "RISK_REVIEW") {
    return "Risk team review is currently pending.";
  }
  if (state === "COMPLIANCE_REVIEW") {
    return "Compliance team review is currently pending.";
  }
  if (state === "AWAITING_CLIENT_CONSENT") {
    return "Client consent is required before execution.";
  }
  if (state === "EXECUTION_READY") {
    return "Proposal has cleared all gates and is ready for execution.";
  }
  return "Workflow state is not mapped yet.";
}

export default function ProposalDetailView({ proposalId }: Props) {
  const [revision, setRevision] = useState(0);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeEvidence, setIncludeEvidence] = useState(false);

  const queryKey = useMemo(
    () => ["proposal-detail", proposalId, revision, includeEvidence],
    [proposalId, revision, includeEvidence]
  );
  const detailQuery = useQuery({
    queryKey,
    queryFn: async () => await getProposal(proposalId, includeEvidence),
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
  const currentVersion = (data.current_version as Record<string, unknown> | undefined) ?? {};
  const artifact = (currentVersion.artifact as Record<string, unknown> | undefined) ?? {};
  const evidence =
    ((artifact.evidence_bundle as Record<string, unknown> | undefined) ??
      (currentVersion.evidence_bundle as Record<string, unknown> | undefined)) ??
    null;
  const evidenceHashes =
    ((evidence?.hashes as Record<string, unknown> | undefined) ??
      (currentVersion.hashes as Record<string, unknown> | undefined)) ??
    {};
  const artifactHash = (currentVersion.artifact_hash as string | undefined) ?? (evidenceHashes.artifact_hash as string | undefined);
  const requestHash = evidenceHashes.request_hash as string | undefined;
  const simulationHash = evidenceHashes.simulation_hash as string | undefined;
  const generatedAt =
    (artifact.generated_at as string | undefined) ??
    (currentVersion.created_at as string | undefined) ??
    (evidence?.generated_at as string | undefined);

  return (
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Proposal {data.proposal.proposal_id}
      </Typography>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={includeEvidence}
            onChange={(event) => {
              setIncludeEvidence(event.target.checked);
            }}
          />
        }
        label="Include Evidence Bundle"
        sx={{ mb: 1 }}
      />
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5, flex: 1 }}>
          <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Current State</Typography>
          <Typography sx={{ fontWeight: 700 }}>{data.proposal.current_state}</Typography>
          <Typography sx={{ fontSize: 13, mt: 0.4 }}>{stageDescription(data.proposal.current_state)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5, flex: 1 }}>
          <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Portfolio</Typography>
          <Typography sx={{ fontWeight: 700 }}>{data.proposal.portfolio_id ?? "N/A"}</Typography>
          <Typography sx={{ fontSize: 13, mt: 0.4 }}>
            Version: {String(data.proposal.current_version_no ?? "N/A")}
          </Typography>
        </Paper>
      </Stack>

      <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 0.6 }}>
        Workflow Progress
      </Typography>
      <Stack direction="row" spacing={0.7} flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip label="Draft" color={stageOrder(data.proposal.current_state) >= 1 ? "primary" : "default"} />
        <Chip label="Review" color={stageOrder(data.proposal.current_state) >= 2 ? "primary" : "default"} />
        <Chip label="Client Consent" color={stageOrder(data.proposal.current_state) >= 3 ? "primary" : "default"} />
        <Chip label="Execution Ready" color={stageOrder(data.proposal.current_state) >= 4 ? "success" : "default"} />
      </Stack>

      <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 0.6 }}>
        Available Actions
      </Typography>
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
          <Alert severity="success" sx={{ py: 0, alignItems: "center" }}>
            Proposal is execution ready.
          </Alert>
        ) : null}
      </Stack>

      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" component="h3">
        Evidence And Auditability
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 0.7, mb: 1.1 }}>
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5, flex: 1 }}>
          <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Artifact Hash</Typography>
          <Typography sx={{ fontSize: 13 }}>{artifactHash ?? "Not available"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5, flex: 1 }}>
          <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Request Hash</Typography>
          <Typography sx={{ fontSize: 13 }}>{requestHash ?? "Not available"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5, flex: 1 }}>
          <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Simulation Hash</Typography>
          <Typography sx={{ fontSize: 13 }}>{simulationHash ?? "Not available"}</Typography>
        </Paper>
      </Stack>
      <Typography className="muted" sx={{ mb: 1.1 }}>
        {generatedAt
          ? `Latest artifact generated at ${generatedAt}.`
          : "Evidence metadata not available in current response. Turn on evidence or confirm backend evidence storage settings."}
      </Typography>

      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" component="h3" sx={{ mt: 1.2 }}>
        Workflow Timeline
      </Typography>
      {workflow?.events?.length ? (
        <Box component="ul" sx={{ pl: 2.2, mt: 0.7, mb: 0 }}>
          {workflow.events.map((event) => (
            <li key={event.event_id} style={{ marginBottom: 8 }}>
              <strong>{event.event_type}</strong> ({event.from_state ?? "N/A"} -&gt; {event.to_state}) by{" "}
              {event.actor_id}
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
        <Box component="ul" sx={{ pl: 2.2, mt: 0.7, mb: 0 }}>
          {approvals.approvals.map((approval) => (
            <li key={approval.approval_id} style={{ marginBottom: 8 }}>
              <strong>{approval.approval_type}</strong>: {approval.approved ? "APPROVED" : "REJECTED"} by{" "}
              {approval.actor_id}
            </li>
          ))}
        </Box>
      ) : (
        <Typography className="muted">No approvals recorded.</Typography>
      )}
    </Paper>
  );
}
