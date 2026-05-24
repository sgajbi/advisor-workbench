"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
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
import ProposalNarrativePosturePanel from "./proposal-narrative-posture-panel";
import ProposalMemoPosturePanel from "./proposal-memo-posture-panel";
import detailStyles from "./proposal-detail-view.module.css";
import {
  buildProposalActionIdempotencyKey,
  isValidProposalId,
  proposalStageDescription,
  proposalStageOrder,
} from "../proposal-workflow-copy";
import ProposalAdvisoryWorkspace from "./proposal-advisory-workspace";

type Props = {
  proposalId: string;
};

function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /\(404\)/.test(error.message) || /not found/i.test(error.message);
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
          Proposal ID `{proposalId}` is not a valid route key. Use alphanumeric IDs with hyphen or underscore separators only.
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
  const workflowStage = proposalStageOrder(data.proposal.current_state);
  const stageLabels = [
    { label: "Draft", reached: workflowStage >= 1 },
    { label: "Review", reached: workflowStage >= 2 },
    { label: "Client Consent", reached: workflowStage >= 3 },
    { label: "Execution Ready", reached: workflowStage >= 4 },
  ];
  const stageCopy = proposalStageDescription(data.proposal.current_state);
  const visibleWorkflowEvents = workflow?.events?.slice(0, 8) ?? [];
  const hiddenWorkflowEventCount = Math.max((workflow?.events?.length ?? 0) - visibleWorkflowEvents.length, 0);

  return (
    <main className={detailStyles.page} aria-label="Proposal advisory workspace">
      <header className={detailStyles.pageHeader}>
        <div>
          <Text variant="eyebrow">Private Banking Proposal Workspace</Text>
          <Text variant="pageTitle" as="h1">
            Proposal {data.proposal.proposal_id}
          </Text>
          <Text variant="secondary">
            {data.proposal.portfolio_id ?? "Portfolio not linked"} · Advisor-use proposal posture · Version{" "}
            {String(data.proposal.current_version_no ?? "N/A")}
          </Text>
        </div>
        <div className={detailStyles.headerStatus}>
          <SemanticBadge tone={data.proposal.current_state === "EXECUTION_READY" ? "success" : "warn"}>
            {stageCopy}
          </SemanticBadge>
          <Text variant="metadata">Client-ready release remains blocked until source evidence and review gates promote it.</Text>
        </div>
      </header>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <ProposalAdvisoryWorkspace
        data={data}
        workflow={workflow}
        approvals={approvals}
        lineage={lineage}
        generatedAt={generatedAt}
        artifactHash={artifactHash}
        requestHash={requestHash}
        simulationHash={simulationHash}
      />

      <div className={detailStyles.workspaceGrid}>
        <section className={detailStyles.reviewStack} aria-label="Advisor review work areas">
          <ProposalNarrativePosturePanel
            proposalId={data.proposal.proposal_id}
            currentVersionNo={data.proposal.current_version_no}
          />

          <ProposalMemoPosturePanel
            proposalId={data.proposal.proposal_id}
            currentVersionNo={data.proposal.current_version_no}
          />
        </section>

        <aside className={detailStyles.evidenceRail} aria-label="Proposal controls and evidence">
          <section className={detailStyles.railPanel}>
            <div className={detailStyles.railPanelHeader}>
              <Text variant="panelTitle">Advisor Actions</Text>
              <SemanticBadge tone={data.proposal.current_state === "EXECUTION_READY" ? "success" : "warn"}>
                {data.proposal.current_state}
              </SemanticBadge>
            </div>
            <Text variant="secondary">{stageCopy}</Text>
            <div className={detailStyles.stageList}>
              {stageLabels.map((stage) => (
                <span key={stage.label} className={stage.reached ? detailStyles.stageDone : detailStyles.stagePending}>
                  {stage.label}
                </span>
              ))}
            </div>
            <div className={detailStyles.actionStack}>
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
            </div>
          </section>

          <section className={detailStyles.railPanel}>
            <div className={detailStyles.railPanelHeader}>
              <Text variant="panelTitle">Evidence Controls</Text>
            </div>
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
              label="Load Full Evidence Bundle"
            />
            <div className={detailStyles.versionControls}>
              <label>
                <Text variant="label">Version Number</Text>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={versionLookupNo}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    setVersionLookupNo(Number.isNaN(next) ? 1 : next);
                  }}
                />
              </label>
              <Button type="button" variant="outlined" onClick={() => void onLoadVersion()}>
                Load Version
              </Button>
              <Button type="button" variant="outlined" onClick={() => void onCreateNextVersion()} disabled={creatingVersion}>
                {creatingVersion ? "Creating Version..." : "Create Next Version"}
              </Button>
            </div>
            {createdVersionNo ? (
              <Text variant="secondary">Version created successfully: {createdVersionNo}</Text>
            ) : null}
            {versionLookup ? (
              <div className={detailStyles.loadedVersion}>
                <Text variant="cardTitle">Loaded Version {String(versionLookup.version_no ?? versionLookupNo)}</Text>
                <Text variant="metadata">Status at creation: {String(versionLookup.status_at_creation ?? "N/A")}</Text>
                <Text variant="metadata">Created at: {String(versionLookup.created_at ?? "N/A")}</Text>
                <Text variant="metadata">Artifact hash: {String(versionLookup.artifact_hash ?? "N/A")}</Text>
              </div>
            ) : null}
            {versionActionError ? <Alert severity="warning">{versionActionError}</Alert> : null}
          </section>

          <section className={detailStyles.railPanel}>
            <Text variant="panelTitle">Lineage And Audit</Text>
            <div className={detailStyles.hashList}>
              <div>
                <span>Artifact Hash</span>
                <strong>{artifactHash ?? "Not available"}</strong>
              </div>
              <div>
                <span>Request Hash</span>
                <strong>{requestHash ?? "Not available"}</strong>
              </div>
              <div>
                <span>Simulation Hash</span>
                <strong>{simulationHash ?? "Not available"}</strong>
              </div>
            </div>
            <Text variant="secondary">
              {generatedAt
                ? `Latest artifact generated at ${generatedAt}.`
                : "Evidence metadata is not available in the current Gateway response."}
            </Text>
            {lineage?.versions?.length ? (
              <div className={detailStyles.timelineList}>
                {lineage.versions.map((version) => (
                  <div key={`lineage-${String(version.version_no ?? "na")}`}>
                    <strong>Version {String(version.version_no ?? "N/A")}</strong>
                    <span>{String(version.created_at ?? "Created time unavailable")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Text variant="secondary">No lineage metadata returned for this proposal yet.</Text>
            )}
          </section>

          <section className={detailStyles.railPanel}>
            <Text variant="panelTitle">Review History</Text>
            {visibleWorkflowEvents.length ? (
              <div className={detailStyles.timelineList}>
                {visibleWorkflowEvents.map((event) => (
                  <div key={event.event_id}>
                    <strong>{event.event_type}</strong>
                    <span>
                      {(event.from_state ?? "Start")} to {event.to_state} · {event.actor_id}
                    </span>
                  </div>
                ))}
                {hiddenWorkflowEventCount > 0 ? (
                  <div className={detailStyles.timelineMore}>
                    <strong>{hiddenWorkflowEventCount} earlier events retained in Gateway history</strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <Text variant="secondary">No workflow events.</Text>
            )}
            <Divider sx={{ my: 1 }} />
            {approvals?.approvals?.length ? (
              <div className={detailStyles.timelineList}>
                {approvals.approvals.map((approval) => (
                  <div key={approval.approval_id}>
                    <strong>{approval.approval_type}</strong>
                    <span>
                      {approval.approved ? "Approved" : "Rejected"} by {approval.actor_id}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Text variant="secondary">No approvals recorded.</Text>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
