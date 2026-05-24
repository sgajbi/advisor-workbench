"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  CircularProgress,
  Stack,
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
} from "../proposal-workflow-copy";
import ProposalAdvisoryWorkspace from "./proposal-advisory-workspace";
import { buildProposalDetailEvidenceModel } from "../proposal-detail-evidence-view-model";
import {
  ProposalAdvisorActionsPanel,
  ProposalEvidenceControlsPanel,
  ProposalLineageAuditPanel,
  ProposalReviewHistoryPanel,
} from "./proposal-detail-domain-panels";

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
  const evidenceModel = buildProposalDetailEvidenceModel({ data, workflow, lineage });
  const stageCopy = proposalStageDescription(data.proposal.current_state);

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
        generatedAt={evidenceModel.generatedAt}
        artifactHash={evidenceModel.artifactHash}
        requestHash={evidenceModel.requestHash}
        simulationHash={evidenceModel.simulationHash}
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
          <ProposalAdvisorActionsPanel
            currentState={data.proposal.current_state}
            stageCopy={stageCopy}
            stageItems={evidenceModel.stageItems}
            acting={acting}
            onSubmitForRiskReview={() => void onSubmitForReview("RISK")}
            onSubmitForComplianceReview={() => void onSubmitForReview("COMPLIANCE")}
            onApproveRisk={() => void onApproveRisk()}
            onApproveCompliance={() => void onApproveCompliance()}
            onRecordClientConsent={() => void onRecordClientConsent()}
          />

          <ProposalEvidenceControlsPanel
            includeEvidence={includeEvidence}
            onIncludeEvidenceChange={setIncludeEvidence}
            versionLookupNo={versionLookupNo}
            onVersionLookupNoChange={setVersionLookupNo}
            onLoadVersion={() => void onLoadVersion()}
            onCreateNextVersion={() => void onCreateNextVersion()}
            creatingVersion={creatingVersion}
            createdVersionNo={createdVersionNo}
            versionLookup={versionLookup}
            versionActionError={versionActionError}
          />

          <ProposalLineageAuditPanel
            artifactHash={evidenceModel.artifactHash}
            requestHash={evidenceModel.requestHash}
            simulationHash={evidenceModel.simulationHash}
            generatedAt={evidenceModel.generatedAt}
            lineageVersions={evidenceModel.lineageVersions}
          />

          <ProposalReviewHistoryPanel
            workflowEvents={evidenceModel.visibleWorkflowEvents}
            hiddenWorkflowEventCount={evidenceModel.hiddenWorkflowEventCount}
            approvals={approvals?.approvals ?? []}
          />
        </aside>
      </div>
    </main>
  );
}
