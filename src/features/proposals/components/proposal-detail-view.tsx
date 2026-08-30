"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  isQuerySourceSettledAndAvailable,
  projectQuerySourcePosture,
  querySourceAvailability,
} from "@/features/platform-runtime/query-source-posture";
import {
  ModeTabs,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
  modePanelId,
  modeTabId,
} from "@/design-system";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";
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
  proposalStageLabel,
} from "../proposal-workflow-copy";
import ProposalAdvisoryWorkspace from "./proposal-advisory-workspace";
import { buildProposalDetailEvidenceModel } from "../proposal-detail-evidence-view-model";
import {
  confirmRefreshedProposalActionEvidence,
  evaluateProposalActionEvidence,
} from "../proposal-action-evidence";
import {
  buildProposalDetailReturnHref,
  getProposalDetailReturnTitle,
  type ProposalDetailOrigin,
} from "../proposal-detail-return-navigation";
import type { ProposalSourceWindowContext } from "../proposal-source-window-navigation";
import {
  buildReviewContextHref,
  type WorkspaceReviewContext,
} from "@/shell/review-context";
import {
  ProposalAdvisorActionsPanel,
  ProposalEvidenceControlsPanel,
  ProposalLineageAuditPanel,
  ProposalReviewHistoryPanel,
} from "./proposal-detail-domain-panels";

type Props = {
  proposalId: string;
  returnPortfolioId?: string;
  returnReviewContext?: WorkspaceReviewContext;
  returnMode?: ProposalDetailOrigin;
  returnSourceWindow?: ProposalSourceWindowContext;
};

type ProposalDetailWorkspaceProps = Props & {
  revision: number;
  onAdvanceRevision: (proposalId: string) => void;
};

type ProposalReviewMode = "narrative" | "memo";

function proposalRefreshGenerationKey(proposalId: string) {
  return ["proposal-detail-refresh-generation", proposalId] as const;
}

function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /\(404\)/.test(error.message) || /not found/i.test(error.message);
}

export default function ProposalDetailView({
  proposalId,
  returnPortfolioId,
  returnReviewContext,
  returnMode,
  returnSourceWindow,
}: Props) {
  const queryClient = useQueryClient();
  const { data: revision = 0 } = useQuery({
    queryKey: proposalRefreshGenerationKey(proposalId),
    queryFn: async () => 0,
    initialData: 0,
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const advanceRevision = useCallback((refreshedProposalId: string) => {
    queryClient.setQueryData<number>(
      proposalRefreshGenerationKey(refreshedProposalId),
      (current) => (current ?? 0) + 1
    );
  }, [queryClient]);

  return (
    <ProposalDetailWorkspace
      key={proposalId}
      proposalId={proposalId}
      returnPortfolioId={returnPortfolioId}
      returnReviewContext={returnReviewContext}
      returnMode={returnMode}
      returnSourceWindow={returnSourceWindow}
      revision={revision}
      onAdvanceRevision={advanceRevision}
    />
  );
}

function ProposalDetailWorkspace({
  proposalId,
  returnPortfolioId,
  returnReviewContext,
  returnMode,
  returnSourceWindow,
  revision,
  onAdvanceRevision,
}: ProposalDetailWorkspaceProps) {
  const fallbackReturnHref =
    returnPortfolioId && returnMode
      ? buildProposalDetailReturnHref({
          portfolioId: returnPortfolioId,
          reviewContext: returnReviewContext,
          origin: returnMode,
          sourceWindow: returnSourceWindow,
        })
      : "/book";
  const returnLabel = returnPortfolioId && returnMode
    ? `Return to ${getProposalDetailReturnTitle(returnMode)}`
    : "Open My book";
  const proposalDraftHref = returnPortfolioId
    ? buildReviewContextHref("/proposals/simulate", {
        ...returnReviewContext,
        portfolioId: returnPortfolioId,
      })
    : null;
  const [acting, setActing] = useState(false);
  const [actionEvidenceBlocked, setActionEvidenceBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<ProposalReviewMode>("narrative");
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [versionLookupNo, setVersionLookupNo] = useState<number>(1);
  const [versionLookup, setVersionLookup] = useState<ProposalVersionData | null>(null);
  const [versionActionError, setVersionActionError] = useState<string | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [createdVersionNo, setCreatedVersionNo] = useState<number | null>(null);
  const activeActionRef = useRef<{ proposalId: string; token: symbol } | null>(null);
  const actionEvidenceBlockedRef = useRef(false);
  const activeVersionCreationRef = useRef<{ proposalId: string; token: symbol } | null>(null);
  const detailContextTransitionRef = useRef(false);

  const proposalIdValid = isValidProposalId(proposalId);
  const queryKey = useMemo(
    () => ["proposal-detail", proposalId, revision, includeEvidence],
    [proposalId, revision, includeEvidence]
  );
  const detailQuery = useQuery({
    queryKey,
    queryFn: async () => await getProposal(proposalId, includeEvidence),
    enabled: proposalIdValid,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === proposalId ? previousData : undefined,
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
  const workflowSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(workflowQuery.data),
    isLoading: workflowQuery.isLoading || (!workflowQuery.data && !workflowQuery.error),
    isFetching: workflowQuery.isFetching,
    hasError: Boolean(workflowQuery.error),
  });
  const approvalsSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(approvalsQuery.data),
    isLoading: approvalsQuery.isLoading || (!approvalsQuery.data && !approvalsQuery.error),
    isFetching: approvalsQuery.isFetching,
    hasError: Boolean(approvalsQuery.error),
  });
  const lineageSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(lineageQuery.data),
    isLoading: lineageQuery.isLoading || (!lineageQuery.data && !lineageQuery.error),
    isFetching: lineageQuery.isFetching,
    hasError: Boolean(lineageQuery.error),
  });
  const detailSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(detailQuery.data?.proposal),
    isLoading: detailQuery.isLoading || (!detailQuery.data && !detailQuery.error),
    isFetching: detailQuery.isFetching,
    hasError: Boolean(detailQuery.error),
  });
  const actionSourcePostures = [
    detailSourcePosture,
    workflowSourcePosture,
    approvalsSourcePosture,
    lineageSourcePosture,
  ];
  const actionSourcesTransportReady = actionSourcePostures.every(isQuerySourceSettledAndAvailable);
  const currentEvidenceAgreement = evaluateProposalActionEvidence({
    approvals: approvalsQuery.data,
    detail: detailQuery.data,
    expectedProposalId: proposalId,
    lineage: lineageQuery.data,
    workflow: workflowQuery.data,
  });
  const actionSourcesReady = actionSourcesTransportReady && currentEvidenceAgreement.issue === null;
  const detailSourceReady = isQuerySourceSettledAndAvailable(detailSourcePosture);
  const actionSourcesChecking = actionSourcePostures.some(
    (posture) => posture.isInitialLoading || posture.isRefreshing
  );
  const actionDisabled = acting || creatingVersion || actionEvidenceBlocked || !actionSourcesReady;
  const actionDisabledReason = actionEvidenceBlocked
    ? "Proposal actions remain unavailable because refreshed review evidence could not be confirmed. Reload the proposal before continuing."
    : acting
      ? "Recording the source action and refreshing review evidence."
      : creatingVersion
        ? "Creating the next proposal version and refreshing review evidence."
      : !actionSourcesTransportReady
        ? actionSourcesChecking
          ? "Checking current proposal evidence before actions are available."
          : "Proposal actions are unavailable until all review evidence can be confirmed. Reload the proposal to continue."
        : currentEvidenceAgreement.issue !== null
          ? "Proposal actions are unavailable because current detail, workflow, approvals, and version lineage do not agree. Reload the proposal to continue."
        : undefined;

  useEffect(() => {
    if (
      detailContextTransitionRef.current
      && detailSourceReady
      && detailQuery.data?.proposal?.proposal_id === proposalId
    ) {
      detailContextTransitionRef.current = false;
    }
  }, [detailQuery.data?.proposal?.proposal_id, detailSourceReady, proposalId]);

  async function refreshActionEvidence(
    previousState: string,
    expectedProposalId: string,
  ): Promise<string> {
    const [detailResult, workflowResult, approvalsResult, lineageResult] = await Promise.all([
      detailQuery.refetch(),
      workflowQuery.refetch(),
      approvalsQuery.refetch(),
      lineageQuery.refetch(),
    ]);
    if (detailResult.error || workflowResult.error || approvalsResult.error || lineageResult.error) {
      throw new Error(
        "The source action completed, but the refreshed review evidence could not be confirmed. Reload the proposal before continuing."
      );
    }
    return confirmRefreshedProposalActionEvidence({
      approvals: approvalsResult.data,
      detail: detailResult.data,
      expectedProposalId,
      lineage: lineageResult.data,
      previousState,
      workflow: workflowResult.data,
    });
  }

  async function runProposalAction(
    action: () => Promise<unknown>,
    successPrefix: string,
  ) {
    const previousState = detailQuery.data?.proposal?.current_state;
    if (
      !previousState
      || activeActionRef.current
      || activeVersionCreationRef.current
      || detailContextTransitionRef.current
      || actionEvidenceBlockedRef.current
      || !actionSourcesReady
    ) return;
    const actionContext = { proposalId, token: Symbol("proposal-action") };
    activeActionRef.current = actionContext;
    setActing(true);
    setError(null);
    setActionMessage(null);
    let sourceActionCompleted = false;
    try {
      await action();
      sourceActionCompleted = true;
      const refreshedState = await refreshActionEvidence(previousState, actionContext.proposalId);
      if (activeActionRef.current?.token !== actionContext.token) return;
      setActionMessage(`${successPrefix} Current posture: ${proposalStageDescription(refreshedState)}`);
    } catch (err) {
      if (activeActionRef.current?.token !== actionContext.token) return;
      if (sourceActionCompleted) {
        actionEvidenceBlockedRef.current = true;
        setActionEvidenceBlocked(true);
      }
      const message = err instanceof Error ? err.message : "";
      setError(
        message.startsWith("The source action")
          ? message
          : "The proposal action could not be completed. Review the current posture and try again."
      );
    } finally {
      if (activeActionRef.current?.token === actionContext.token) {
        activeActionRef.current = null;
        setActing(false);
      }
    }
  }

  async function onSubmitForReview(reviewType: "RISK" | "COMPLIANCE") {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    await runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, `submit-${reviewType.toLowerCase()}`);
      await submitProposal(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        review_type: reviewType,
        reason: { source: "ui" },
      }, idempotencyKey);
    }, `Proposal submitted for ${reviewType === "RISK" ? "risk" : "compliance"} review.`);
  }

  async function onApproveRisk() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    await runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "approve-risk");
      await approveRisk(proposalId, {
        actor_id: "risk_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      }, idempotencyKey);
    }, "Risk review recorded.");
  }

  async function onApproveCompliance() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    await runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "approve-compliance");
      await approveCompliance(proposalId, {
        actor_id: "compliance_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      }, idempotencyKey);
    }, "Compliance review recorded.");
  }

  async function onRecordClientConsent() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    await runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "record-client-consent");
      await recordClientConsent(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { channel: "IN_PERSON", source: "ui" },
      }, idempotencyKey);
    }, "Client consent recorded.");
  }

  if (detailQuery.isLoading) {
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
    if (
      activeActionRef.current
      || activeVersionCreationRef.current
      || detailContextTransitionRef.current
    ) {
      return;
    }
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
    if (
      activeActionRef.current
      || activeVersionCreationRef.current
      || detailContextTransitionRef.current
      || actionEvidenceBlockedRef.current
      || !actionSourcesReady
    ) {
      return;
    }
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
    const versionContext = { proposalId, token: Symbol("proposal-version") };
    activeVersionCreationRef.current = versionContext;
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
      if (activeVersionCreationRef.current?.token !== versionContext.token) {
        return;
      }
      const proposalData = (response.data.proposal as Record<string, unknown> | undefined) ?? undefined;
      const currentVersionNo = (proposalData?.current_version_no as number | undefined) ?? undefined;
      setCreatedVersionNo(currentVersionNo ?? null);
      detailContextTransitionRef.current = true;
      onAdvanceRevision(proposalId);
    } catch (err) {
      if (activeVersionCreationRef.current?.token !== versionContext.token) {
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setVersionActionError(message);
    } finally {
      if (activeVersionCreationRef.current?.token === versionContext.token) {
        activeVersionCreationRef.current = null;
        setCreatingVersion(false);
      }
    }
  }

  const queryError = detailQuery.error;

  if (!proposalIdValid) {
    return (
      <SectionBlock title="Invalid Proposal Identifier">
        <Text variant="secondary" className="muted">
          Proposal ID `{proposalId}` is not a valid route key. Use alphanumeric IDs with hyphen or underscore separators only.
        </Text>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Link href={fallbackReturnHref} className="nav-link">
            {returnLabel}
          </Link>
          {proposalDraftHref ? (
            <Link href={proposalDraftHref} className="nav-link">
              Create New Proposal Draft
            </Link>
          ) : null}
        </Stack>
      </SectionBlock>
    );
  }

  if (!detailQuery.data?.proposal && detailQuery.error && isNotFound(detailQuery.error)) {
    return (
      <SectionBlock title="Proposal Not Found">
        <Text variant="secondary" className="muted">
          Proposal `{proposalId}` was not found in the active advisory pipeline.
        </Text>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Link href={fallbackReturnHref} className="nav-link">
            {returnLabel}
          </Link>
          {proposalDraftHref ? (
            <Link href={proposalDraftHref} className="nav-link">
              Create New Proposal Draft
            </Link>
          ) : null}
        </Stack>
      </SectionBlock>
    );
  }

  if (queryError && !detailQuery.data?.proposal) {
    const permissionBlocked = isWorkbenchPermissionBlockedError(queryError);
    return (
      <SectionBlock title={permissionBlocked ? "Proposal Access Restricted" : "Proposal Unavailable"}>
        <ScreenStatePanel
          kind={permissionBlocked ? "permission_blocked" : "error"}
          title={
            permissionBlocked
              ? "Proposal review is restricted"
              : "Proposal review could not be loaded"
          }
          body={
            permissionBlocked
              ? "Your current role cannot view this proposal record. No approval or workflow posture is inferred."
              : "The source proposal record is unavailable. Return to the originating worklist and retry when Gateway recovers."
          }
          action={
            <Link href={fallbackReturnHref} className="nav-link">
              {returnLabel}
            </Link>
          }
          surface="default"
        />
      </SectionBlock>
    );
  }

  if (!detailQuery.data?.proposal) {
    return (
      <SectionBlock title="Proposal Not Found">
        <Text variant="secondary">
          This proposal record is not available in the active advisory pipeline.
        </Text>
        <Link href={fallbackReturnHref} className="nav-link">
          {returnLabel}
        </Link>
      </SectionBlock>
    );
  }

  const data = detailQuery.data as ProposalDetailData;
  const workflow = workflowQuery.data as ProposalWorkflowEventsData | undefined;
  const approvals = approvalsQuery.data as ProposalApprovalsData | undefined;
  const lineage = lineageQuery.data as ProposalLineageData | undefined;
  const evidenceModel = buildProposalDetailEvidenceModel({ data, workflow, lineage });
  const stageCopy = proposalStageDescription(data.proposal.current_state);
  const ancillaryFailures = [
    workflowQuery.error ? "Workflow history" : null,
    approvalsQuery.error ? "Approval evidence" : null,
    lineageQuery.error ? "Version lineage" : null,
  ].filter((item): item is string => item !== null);
  const disclosureSourcesChecking = [
    workflowSourcePosture,
    approvalsSourcePosture,
    lineageSourcePosture,
  ].some((posture) => querySourceAvailability(posture) === "checking");
  const sourcePortfolioId = data.proposal.portfolio_id?.trim() || returnPortfolioId;
  const addressedPortfolioId =
    returnReviewContext?.portfolioId ?? returnPortfolioId;
  const sourceReturnReviewContext =
    sourcePortfolioId && addressedPortfolioId === sourcePortfolioId
      ? returnReviewContext
      : sourcePortfolioId
        ? { portfolioId: sourcePortfolioId }
        : undefined;
  const sourceReturnHref = sourcePortfolioId
    ? buildProposalDetailReturnHref({
        portfolioId: sourcePortfolioId,
        reviewContext: sourceReturnReviewContext,
        origin: returnMode ?? "approval-queue",
        sourceWindow: returnSourceWindow,
      })
    : fallbackReturnHref;
  const sourceReturnLabel = sourcePortfolioId
    ? `Return to ${getProposalDetailReturnTitle(returnMode ?? "approval-queue")}`
    : returnLabel;

  return (
    <main className={detailStyles.page} aria-label="Proposal advisory workspace">
      <header className={detailStyles.pageHeader}>
        <div>
          <Text variant="eyebrow">Private Banking Proposal Workspace</Text>
          <Text variant="pageTitle" as="h1">
            Proposal {data.proposal.proposal_id}
          </Text>
          <Text variant="secondary">
            Portfolio {data.proposal.portfolio_id ?? "not linked"} · Version{" "}
            {String(data.proposal.current_version_no ?? "N/A")}
          </Text>
        </div>
        <div className={detailStyles.headerStatus}>
          <Link className={detailStyles.returnLink} href={sourceReturnHref}>
            {sourceReturnLabel}
          </Link>
          <SemanticBadge tone={data.proposal.current_state === "EXECUTION_READY" ? "success" : "warn"}>
            {proposalStageLabel(data.proposal.current_state)}
          </SemanticBadge>
          <Text variant="metadata">Advisor use only. Client release requires source evidence and completed review gates.</Text>
        </div>
      </header>

      {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
      {actionMessage ? (
        <Alert severity="success" role="status" data-testid="proposal-action-status">
          {actionMessage}
        </Alert>
      ) : null}

      <ProposalAdvisoryWorkspace
        data={data}
        workflow={workflow}
        approvals={approvals}
        lineage={lineage}
        generatedAt={evidenceModel.generatedAt}
        artifactHash={evidenceModel.artifactHash}
        requestHash={evidenceModel.requestHash}
        simulationHash={evidenceModel.simulationHash}
        workflowSourcePosture={workflowSourcePosture}
        approvalsSourcePosture={approvalsSourcePosture}
        lineageSourcePosture={lineageSourcePosture}
      />

      <div className={detailStyles.workspaceGrid}>
        <section className={detailStyles.reviewWorkspace} aria-labelledby="proposal-review-heading">
          <div className={detailStyles.reviewHeader}>
            <div>
              <Text variant="panelTitle" as="h2" id="proposal-review-heading">
                Advisor review
              </Text>
              <Text variant="secondary">
                Review the advisor narrative or prepare the evidence-backed discussion memo.
              </Text>
            </div>
            <ModeTabs
              value={reviewMode}
              onChange={setReviewMode}
              options={[
                { key: "narrative", label: "Narrative review" },
                { key: "memo", label: "Memo & evidence pack" },
              ]}
              ariaLabel="Proposal review work area"
              idBase="proposal-review"
              variant="contained"
            />
          </div>
          <div
            role="tabpanel"
            id={modePanelId("proposal-review", "narrative")}
            aria-labelledby={modeTabId("proposal-review", "narrative")}
            hidden={reviewMode !== "narrative"}
          >
            <ProposalNarrativePosturePanel
              proposalId={data.proposal.proposal_id}
              currentVersionNo={data.proposal.current_version_no}
            />
          </div>
          <div
            role="tabpanel"
            id={modePanelId("proposal-review", "memo")}
            aria-labelledby={modeTabId("proposal-review", "memo")}
            hidden={reviewMode !== "memo"}
          >
            <ProposalMemoPosturePanel
              proposalId={data.proposal.proposal_id}
              currentVersionNo={data.proposal.current_version_no}
            />
          </div>
        </section>

        <aside className={detailStyles.actionRail} aria-label="Proposal action">
          <ProposalAdvisorActionsPanel
            currentState={data.proposal.current_state}
            stageCopy={stageCopy}
            stageItems={evidenceModel.stageItems}
            actionDisabled={actionDisabled}
            actionDisabledReason={actionDisabledReason}
            onSubmitForRiskReview={() => void onSubmitForReview("RISK")}
            onSubmitForComplianceReview={() => void onSubmitForReview("COMPLIANCE")}
            onApproveRisk={() => void onApproveRisk()}
            onApproveCompliance={() => void onApproveCompliance()}
            onRecordClientConsent={() => void onRecordClientConsent()}
          />
          {ancillaryFailures.length ? (
            <section className={detailStyles.partialEvidence} role="status">
              <Text variant="cardTitle">Review evidence partially available</Text>
              <Text variant="secondary">
                {ancillaryFailures.join(", ")} could not be refreshed. Available proposal evidence remains visible.
              </Text>
            </section>
          ) : null}
        </aside>
      </div>

      <details className={detailStyles.evidenceDisclosure} data-testid="proposal-evidence-disclosure">
        <summary>
          <span>
            <strong>Evidence, versions and review history</strong>
            <small>
              {disclosureSourcesChecking
                ? "Checking version lineage and review history"
                : ancillaryFailures.length
                  ? `${ancillaryFailures.length} evidence source${ancillaryFailures.length === 1 ? "" : "s"} unavailable`
                  : `${evidenceModel.lineageVersions.length} version${evidenceModel.lineageVersions.length === 1 ? "" : "s"} · ${evidenceModel.visibleWorkflowEvents.length} recent event${evidenceModel.visibleWorkflowEvents.length === 1 ? "" : "s"}`}
            </small>
          </span>
        </summary>
        <div className={detailStyles.evidenceGrid}>
          <ProposalEvidenceControlsPanel
            includeEvidence={includeEvidence}
            controlsDisabled={
              acting
              || creatingVersion
              || actionEvidenceBlocked
              || !actionSourcesReady
            }
            onIncludeEvidenceChange={(value) => {
              if (
                !activeActionRef.current
                && !activeVersionCreationRef.current
                && !detailContextTransitionRef.current
                && !actionEvidenceBlockedRef.current
                && actionSourcesReady
              ) {
                detailContextTransitionRef.current = true;
                setIncludeEvidence(value);
              }
            }}
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
            sourcePosture={lineageSourcePosture}
          />
          <ProposalReviewHistoryPanel
            workflowEvents={evidenceModel.visibleWorkflowEvents}
            hiddenWorkflowEventCount={evidenceModel.hiddenWorkflowEventCount}
            approvals={approvals?.approvals ?? []}
            workflowSourcePosture={workflowSourcePosture}
            approvalsSourcePosture={approvalsSourcePosture}
          />
        </div>
      </details>
    </main>
  );
}
