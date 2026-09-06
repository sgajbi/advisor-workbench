"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";

import {
  approveCompliance,
  approveRisk,
  recordClientConsent,
  submitProposal,
} from "../api";
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
import {
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api-client";
import {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "../types";
import ProposalNarrativePosturePanel from "./proposal-narrative-posture-panel";
import ProposalMemoPosturePanel from "./proposal-memo-posture-panel";
import ProposalActionSupportDetails from "./proposal-action-support-details";
import detailStyles from "./proposal-detail-view.module.css";
import {
  buildProposalActionIdempotencyKey,
  isValidProposalId,
  proposalStageDescription,
  proposalStageLabel,
} from "../proposal-workflow-copy";
import {
  proposalActionFailureCopy,
  proposalActionFailureSupportEvidence,
} from "../proposal-action-error";
import ProposalAdvisoryWorkspace from "./proposal-advisory-workspace";
import { buildProposalDetailEvidenceModel } from "../proposal-detail-evidence-view-model";
import { evaluateProposalActionEvidence } from "../proposal-action-evidence";
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
import { useProposalDetailQueryState } from "../use-proposal-detail-query-state";

type Props = {
  proposalId: string;
  returnPortfolioId?: string;
  returnReviewContext?: WorkspaceReviewContext;
  returnMode?: ProposalDetailOrigin;
  returnSourceWindow?: ProposalSourceWindowContext;
};

type ProposalReviewMode = "narrative" | "memo";

function isNotFound(error: unknown): boolean {
  return getWorkbenchApiErrorStatus(error) === 404;
}

export default function ProposalDetailView({
  proposalId,
  returnPortfolioId,
  returnReviewContext,
  returnMode,
  returnSourceWindow,
}: Props) {
  return (
    <ProposalDetailWorkspace
      key={proposalId}
      proposalId={proposalId}
      returnPortfolioId={returnPortfolioId}
      returnReviewContext={returnReviewContext}
      returnMode={returnMode}
      returnSourceWindow={returnSourceWindow}
    />
  );
}

function ProposalDetailWorkspace({
  proposalId,
  returnPortfolioId,
  returnReviewContext,
  returnMode,
  returnSourceWindow,
}: Props) {
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
  const [reviewMode, setReviewMode] = useState<ProposalReviewMode>("narrative");
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [versionLookupNo, setVersionLookupNo] = useState<number>(1);

  const proposalIdValid = isValidProposalId(proposalId);
  const {
    actionMutation,
    approvalsQuery,
    createVersionMutation,
    detailQuery,
    hasPendingCommand,
    lineageQuery,
    persistedCommandCount,
    persistedConfirmationFailure,
    versionLookupMutation,
    workflowQuery,
  } = useProposalDetailQueryState({ includeEvidence, proposalId, proposalIdValid });
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
  const actionSourcesChecking = actionSourcePostures.some(
    (posture) => posture.isInitialLoading || posture.isRefreshing
  );
  const acting = actionMutation.isPending;
  const creatingVersion = createVersionMutation.isPending;
  const actionEvidenceBlocked = persistedConfirmationFailure !== null;
  const actionError = actionMutation.error;
  const error = actionError ? proposalActionFailureCopy(actionError, "advance_proposal") : null;
  const errorSupportEvidence = actionError
    ? proposalActionFailureSupportEvidence(actionError)
    : null;
  const actionMessage = actionMutation.data ?? null;
  const versionError = createVersionMutation.error ?? versionLookupMutation.error;
  const versionActionError = versionError
    ? proposalActionFailureCopy(
        versionError,
        createVersionMutation.error ? "create_version" : "load_version",
      )
    : null;
  const versionActionErrorSupportEvidence = versionError
    ? proposalActionFailureSupportEvidence(versionError)
    : null;
  const actionDisabled = persistedCommandCount > 0 || actionEvidenceBlocked || !actionSourcesReady;
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

  function runProposalAction(
    action: () => ReturnType<typeof submitProposal>,
    expectedState: string,
    successPrefix: string,
  ) {
    const previousState = detailQuery.data?.proposal?.current_state;
    if (
      !previousState
      || hasPendingCommand()
      || !actionSourcesReady
      || actionEvidenceBlocked
    ) {
      return;
    }
    actionMutation.mutate({ action, expectedState, previousState, successPrefix });
  }

  function onSubmitForReview(reviewType: "RISK" | "COMPLIANCE") {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, `submit-${reviewType.toLowerCase()}`);
      return await submitProposal(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        review_type: reviewType,
        reason: { source: "ui" },
      }, idempotencyKey);
    }, reviewType === "RISK" ? "RISK_REVIEW" : "COMPLIANCE_REVIEW",
    `Proposal submitted for ${reviewType === "RISK" ? "risk" : "compliance"} review.`);
  }

  function onApproveRisk() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "approve-risk");
      return await approveRisk(proposalId, {
        actor_id: "risk_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      }, idempotencyKey);
    }, "AWAITING_CLIENT_CONSENT", "Risk review recorded.");
  }

  function onApproveCompliance() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "approve-compliance");
      return await approveCompliance(proposalId, {
        actor_id: "compliance_officer_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { source: "ui" },
      }, idempotencyKey);
    }, "AWAITING_CLIENT_CONSENT", "Compliance review recorded.");
  }

  function onRecordClientConsent() {
    if (!detailQuery.data?.proposal?.current_state) {
      return;
    }
    runProposalAction(async () => {
      const idempotencyKey = buildProposalActionIdempotencyKey(proposalId, "record-client-consent");
      return await recordClientConsent(proposalId, {
        actor_id: "advisor_1",
        expected_state: detailQuery.data.proposal.current_state,
        details: { channel: "IN_PERSON", source: "ui" },
      }, idempotencyKey);
    }, "EXECUTION_READY", "Client consent recorded.");
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

  function onLoadVersion() {
    if (
      hasPendingCommand()
      || versionLookupMutation.isPending
      || actionEvidenceBlocked
    ) {
      return;
    }
    createVersionMutation.reset();
    versionLookupMutation.mutate({ includeEvidence, versionNo: versionLookupNo });
  }

  function onCreateNextVersion() {
    if (
      hasPendingCommand()
      || actionEvidenceBlocked
      || !actionSourcesReady
    ) {
      return;
    }
    const currentVersionData = (detailQuery.data as ProposalDetailData | undefined)?.current_version as
      | Record<string, unknown>
      | undefined;
    const simulateRequest = (currentVersionData?.simulate_request as Record<string, unknown> | undefined) ?? null;
    const previousVersionNo = detailQuery.data?.proposal?.current_version_no;
    if (typeof previousVersionNo !== "number" || !Number.isInteger(previousVersionNo)) {
      return;
    }
    if (!simulateRequest) {
      versionLookupMutation.reset();
      createVersionMutation.mutate({ previousVersionNo, simulateRequest: null });
      return;
    }
    versionLookupMutation.reset();
    createVersionMutation.mutate({ previousVersionNo, simulateRequest });
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
    const supportEvidence = proposalActionFailureSupportEvidence(detailQuery.error);
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
        {supportEvidence ? (
          <ProposalActionSupportDetails evidence={supportEvidence} />
        ) : null}
      </SectionBlock>
    );
  }

  if (queryError && !detailQuery.data?.proposal) {
    const permissionBlocked = isWorkbenchPermissionBlockedError(queryError);
    const supportEvidence = proposalActionFailureSupportEvidence(queryError);
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
              ? "Your current role cannot view this proposal record. Return to the proposal worklist or contact your access administrator if review is required."
              : "The proposal record is temporarily unavailable. Return to the originating worklist and retry."
          }
          action={
            <Link href={fallbackReturnHref} className="nav-link">
              {returnLabel}
            </Link>
          }
          surface="default"
        />
        {supportEvidence ? (
          <ProposalActionSupportDetails evidence={supportEvidence} />
        ) : null}
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
        sourceWindow:
          addressedPortfolioId === sourcePortfolioId
            ? returnSourceWindow
            : undefined,
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

      {error ? (
        <>
          <Alert severity="error" role="alert">{error}</Alert>
          {errorSupportEvidence ? (
            <ProposalActionSupportDetails evidence={errorSupportEvidence} />
          ) : null}
        </>
      ) : null}
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
              persistedCommandCount > 0
              || versionLookupMutation.isPending
              || actionEvidenceBlocked
              || !actionSourcesReady
            }
            onIncludeEvidenceChange={(value) => {
              if (
                persistedCommandCount === 0
                && !versionLookupMutation.isPending
                && !actionEvidenceBlocked
                && actionSourcesReady
              ) {
                versionLookupMutation.reset();
                setIncludeEvidence(value);
              }
            }}
            versionLookupNo={versionLookupNo}
            onVersionLookupNoChange={setVersionLookupNo}
            onLoadVersion={() => void onLoadVersion()}
            onCreateNextVersion={() => void onCreateNextVersion()}
            creatingVersion={creatingVersion}
            createdVersionNo={createVersionMutation.data ?? null}
            versionLookup={versionLookupMutation.data ?? null}
            versionActionError={versionActionError}
            versionActionErrorSupportEvidence={versionActionErrorSupportEvidence}
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
