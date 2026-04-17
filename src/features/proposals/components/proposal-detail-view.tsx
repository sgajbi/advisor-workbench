"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
} from "@mui/material";

import {
  approveCompliance,
  approveRisk,
  createProposalVersion,
  getProposal,
  getProposalApprovals,
  getProposalLineage,
  getProposalVersion,
  getProposalWorkflowEvents,
  recordClientConsent,
  submitProposal,
} from "../api";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { SectionBlock, SemanticBadge, Text } from "@/design-system";
import {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalVersionData,
  ProposalWorkflowEventsData,
} from "../types";

type Props = {
  proposalId: string;
};

function buildProposalActionIdempotencyKey(proposalId: string, action: string): string {
  return `ui-${action}-${proposalId}-${Date.now()}`;
}

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

function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /\(404\)/.test(error.message) || /not found/i.test(error.message);
}

function isValidProposalId(proposalId: string): boolean {
  return /^[A-Za-z0-9-]+$/.test(proposalId);
}

export default function ProposalDetailView({ proposalId }: Props) {
  const [revision, setRevision] = useState(0);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [versionLookupNo, setVersionLookupNo] = useState<number>(1);
  const [versionLookup, setVersionLookup] = useState<ProposalVersionData | null>(null);
  const [versionActionError, setVersionActionError] = useState<string | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [createdVersionNo, setCreatedVersionNo] = useState<number | null>(null);

  const proposalIdValid = isValidProposalId(proposalId);
  const queryKey = useMemo(
    () => ["proposal-detail", proposalId, revision, includeEvidence],
    [proposalId, revision, includeEvidence]
  );
  const detailQuery = useQuery({
    queryKey,
    queryFn: async () => await getProposal(proposalId, includeEvidence),
    enabled: proposalIdValid,
    ...workbenchStrictQueryDefaults,
  });
  const workflowQuery = useQuery({
    queryKey: ["proposal-workflow", proposalId, revision],
    queryFn: async () => await getProposalWorkflowEvents(proposalId),
    enabled: !!detailQuery.data?.proposal,
    ...workbenchStrictQueryDefaults,
  });
  const approvalsQuery = useQuery({
    queryKey: ["proposal-approvals", proposalId, revision],
    queryFn: async () => await getProposalApprovals(proposalId),
    enabled: !!detailQuery.data?.proposal,
    ...workbenchStrictQueryDefaults,
  });
  const lineageQuery = useQuery({
    queryKey: ["proposal-lineage", proposalId, revision],
    queryFn: async () => await getProposalLineage(proposalId),
    enabled: !!detailQuery.data?.proposal,
    ...workbenchStrictQueryDefaults,
  });

  async function onSubmitForReview(reviewType: "RISK" | "COMPLIANCE") {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, `submit-${reviewType.toLowerCase()}`);
      await submitProposal(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        review_type: reviewType,
        reason: { source: "ui" },
      }, idempotencyKey);
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
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "approve-risk");
      await approveRisk(proposalId, {
        actor_id: "risk_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      }, idempotencyKey);
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
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "approve-compliance");
      await approveCompliance(proposalId, {
        actor_id: "compliance_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      }, idempotencyKey);
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
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "record-client-consent");
      await recordClientConsent(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { channel: "IN_PERSON", source: "ui" },
      }, idempotencyKey);
      setRevision((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActing(false);
    }
  }

  if (detailQuery.isLoading || workflowQuery.isLoading || approvalsQuery.isLoading || lineageQuery.isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading proposal...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  async function onLoadVersion() {
    setVersionActionError(null);
    try {
      const data = await getProposalVersion(proposalId, versionLookupNo, includeEvidence);
      setVersionLookup(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setVersionActionError(message);
    }
  }

  async function onCreateNextVersion() {
    const currentVersionData = (detailQuery.data as ProposalDetailData | undefined)?.current_version as
      | Record<string, unknown>
      | undefined;
    const simulateRequest = (currentVersionData?.simulate_request as Record<string, unknown> | undefined) ?? null;
    if (!simulateRequest) {
      setVersionActionError(
        "Current version simulate_request is not present in response. Enable evidence or verify backend payload shape."
      );
      return;
    }
    setVersionActionError(null);
    setCreatingVersion(true);
    setCreatedVersionNo(null);
    try {
      const idempotencyKey = `ui-version-${proposalId}-${Date.now()}`;
      const response = await createProposalVersion(
        proposalId,
        {
          body: {
            created_by: "advisor_1",
            simulate_request: simulateRequest,
          },
        },
        idempotencyKey
      );
      const proposalData = (response.data.proposal as Record<string, unknown> | undefined) ?? undefined;
      const currentVersionNo = (proposalData?.current_version_no as number | undefined) ?? undefined;
      setCreatedVersionNo(currentVersionNo ?? null);
      setRevision((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setVersionActionError(message);
    } finally {
      setCreatingVersion(false);
    }
  }

  const queryError = detailQuery.error ?? workflowQuery.error ?? approvalsQuery.error ?? lineageQuery.error;

  if (!proposalIdValid) {
    return (
      <SectionBlock title="Invalid Proposal Identifier">
        <Text variant="secondary" className="muted">
          Proposal ID `{proposalId}` is not a valid route key. Use alphanumeric IDs with hyphen separators only.
        </Text>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Link href="/proposals" className="nav-link">
            Open Proposal Workspace
          </Link>
          <Link href="/proposals/simulate" className="nav-link">
            Create New Proposal Draft
          </Link>
        </Stack>
      </SectionBlock>
    );
  }

  if (detailQuery.error && isNotFound(detailQuery.error)) {
    return (
      <SectionBlock title="Proposal Not Found">
        <Text variant="secondary" className="muted">
          Proposal `{proposalId}` was not found in the active advisory pipeline.
        </Text>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Link href="/proposals" className="nav-link">
            Open Proposal Workspace
          </Link>
          <Link href="/proposals/simulate" className="nav-link">
            Create New Proposal Draft
          </Link>
        </Stack>
      </SectionBlock>
    );
  }

  if (error || queryError) {
    return (
      <Alert severity="error">
        Error: {error ?? (queryError instanceof Error ? queryError.message : "Unknown error")}
      </Alert>
    );
  }

  if (!detailQuery.data?.proposal) {
    return <Text variant="body">Proposal not found.</Text>;
  }

  const data = detailQuery.data as ProposalDetailData;
  const workflow = workflowQuery.data as ProposalWorkflowEventsData | undefined;
  const approvals = approvalsQuery.data as ProposalApprovalsData | undefined;
  const lineage = lineageQuery.data as ProposalLineageData | undefined;
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
    <SectionBlock
      title={`Proposal ${data.proposal.proposal_id}`}
      actions={
        <SemanticBadge tone={data.proposal.current_state === "EXECUTION_READY" ? "success" : "warn"}>
          {stageDescription(data.proposal.current_state)}
        </SemanticBadge>
      }
    >
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
        <div className="analytics-stat">
          <Text variant="label">Current State</Text>
          <Text variant="metricValueCompact">{data.proposal.current_state}</Text>
          <Text variant="secondary">{stageDescription(data.proposal.current_state)}</Text>
        </div>
        <div className="analytics-stat">
          <Text variant="label">Portfolio</Text>
          <Text variant="metricValueCompact">{data.proposal.portfolio_id ?? "N/A"}</Text>
          <Text variant="secondary">Version: {String(data.proposal.current_version_no ?? "N/A")}</Text>
        </div>
      </Stack>

      <Text variant="label">Workflow Progress</Text>
      <Stack direction="row" spacing={0.7} flexWrap="wrap" sx={{ mb: 1 }}>
        <SemanticBadge tone={stageOrder(data.proposal.current_state) >= 1 ? "success" : "default"}>Draft</SemanticBadge>
        <SemanticBadge tone={stageOrder(data.proposal.current_state) >= 2 ? "success" : "default"}>Review</SemanticBadge>
        <SemanticBadge tone={stageOrder(data.proposal.current_state) >= 3 ? "success" : "default"}>Client Consent</SemanticBadge>
        <SemanticBadge tone={stageOrder(data.proposal.current_state) >= 4 ? "success" : "default"}>Execution Ready</SemanticBadge>
      </Stack>

      <Text variant="label">Available Actions</Text>
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
      <Text variant="sectionTitle">Version Management</Text>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 0.7, mb: 1 }}>
        <Button type="button" variant="outlined" onClick={() => void onCreateNextVersion()} disabled={creatingVersion}>
          {creatingVersion ? "Creating Version..." : "Create Next Version"}
        </Button>
        <Button type="button" variant="outlined" onClick={() => void onLoadVersion()}>
          Load Version
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <div className="analytics-stat" style={{ minWidth: 220 }}>
          <Text variant="label">Lookup Version Number</Text>
          <input
            className="input"
            type="number"
            min={1}
            value={versionLookupNo}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setVersionLookupNo(Number.isNaN(next) ? 1 : next);
            }}
            style={{ marginTop: 6 }}
          />
        </div>
        <div className="analytics-stat" style={{ flex: 1 }}>
          <Text variant="label">Current Version</Text>
          <Text variant="metricValueCompact">{String(data.proposal.current_version_no ?? "N/A")}</Text>
          {createdVersionNo ? (
            <Text variant="secondary">Version created successfully: {createdVersionNo}</Text>
          ) : null}
        </div>
      </Stack>
      {versionLookup ? (
        <SectionBlock className="proposal-version-lookup">
          <Text variant="cardTitle">Loaded Version {String(versionLookup.version_no ?? versionLookupNo)}</Text>
          <Text variant="body">Status At Creation: {String(versionLookup.status_at_creation ?? "N/A")}</Text>
          <Text variant="body">Created At: {String(versionLookup.created_at ?? "N/A")}</Text>
          <Text variant="body">
            Artifact Hash: {String(versionLookup.artifact_hash ?? "N/A")}
          </Text>
        </SectionBlock>
      ) : null}
      {versionActionError ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {versionActionError}
        </Alert>
      ) : null}

      <Divider sx={{ my: 1 }} />
      <Text variant="sectionTitle">Lineage Explorer</Text>
      {lineage?.versions?.length ? (
        <Stack spacing={0.8} sx={{ mt: 0.8, mb: 1 }}>
          {lineage.versions.map((version) => (
            <SectionBlock key={`lineage-${String(version.version_no ?? "na")}`}>
              <Text variant="cardTitle">Version {String(version.version_no ?? "N/A")}</Text>
              <Text variant="metadata">Request Hash: {String(version.request_hash ?? "N/A")}</Text>
              <Text variant="metadata">Simulation Hash: {String(version.simulation_hash ?? "N/A")}</Text>
              <Text variant="metadata">Artifact Hash: {String(version.artifact_hash ?? "N/A")}</Text>
              <Text variant="metadata">Created At: {String(version.created_at ?? "N/A")}</Text>
            </SectionBlock>
          ))}
        </Stack>
      ) : (
        <Text variant="secondary">No lineage metadata returned for this proposal yet.</Text>
      )}

      <Divider sx={{ my: 1 }} />
      <Text variant="sectionTitle">Evidence And Auditability</Text>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 0.7, mb: 1.1 }}>
        <div className="analytics-stat" style={{ flex: 1 }}>
          <Text variant="label">Artifact Hash</Text>
          <Text variant="metadata">{artifactHash ?? "Not available"}</Text>
        </div>
        <div className="analytics-stat" style={{ flex: 1 }}>
          <Text variant="label">Request Hash</Text>
          <Text variant="metadata">{requestHash ?? "Not available"}</Text>
        </div>
        <div className="analytics-stat" style={{ flex: 1 }}>
          <Text variant="label">Simulation Hash</Text>
          <Text variant="metadata">{simulationHash ?? "Not available"}</Text>
        </div>
      </Stack>
      <Text variant="secondary">
        {generatedAt
          ? `Latest artifact generated at ${generatedAt}.`
          : "Evidence metadata not available in current response. Turn on evidence or confirm backend evidence storage settings."}
      </Text>

      <Divider sx={{ my: 1 }} />
      <Text variant="sectionTitle">Workflow Timeline</Text>
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
        <Text variant="secondary">No workflow events.</Text>
      )}

      <Text variant="sectionTitle">Approvals</Text>
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
        <Text variant="secondary">No approvals recorded.</Text>
      )}
    </SectionBlock>
  );
}
