import Link from "next/link";

import {
  ActionButton,
  SemanticBadge,
  Text,
  WorkbenchRailCard,
} from "@/design-system";
import type { ProposalActionSupportEvidence } from "../proposal-action-error";
import ProposalActionSupportDetails from "./proposal-action-support-details";
import styles from "./proposal-builder-workflow-rail.module.css";

type ProposalBuilderWorkflowRailProps = {
  queuePortfolioId: string | null;
  canRunWorkflow: boolean;
  isPortfolioEvidenceConfirmed: boolean;
  actionReason: string;
  scenarioCashState: string;
  readyTradeCount: number;
  cappedTradeCount: number;
  evaluatedWorkspaceId: string | null;
  savedProposalId: string | null;
  evaluationAvailable: boolean;
  isHydrated: boolean;
  isEvaluating: boolean;
  isSaving: boolean;
  error: string | null;
  errorSupportEvidence: ProposalActionSupportEvidence | null;
  onSaveDraft: () => void;
};

function buildActionLabel({
  isHydrated,
  isPending,
  pendingLabel,
  readyLabel,
}: {
  isHydrated: boolean;
  isPending: boolean;
  pendingLabel: string;
  readyLabel: string;
}): string {
  if (!isHydrated) {
    return "Preparing workspace…";
  }
  return isPending ? pendingLabel : readyLabel;
}

export default function ProposalBuilderWorkflowRail({
  queuePortfolioId,
  canRunWorkflow,
  isPortfolioEvidenceConfirmed,
  actionReason,
  scenarioCashState,
  readyTradeCount,
  cappedTradeCount,
  evaluatedWorkspaceId,
  savedProposalId,
  evaluationAvailable,
  isHydrated,
  isEvaluating,
  isSaving,
  error,
  errorSupportEvidence,
  onSaveDraft,
}: ProposalBuilderWorkflowRailProps) {
  const isActionPending = isEvaluating || isSaving;
  const actionsDisabled = !isHydrated || isActionPending || !canRunWorkflow;
  const evaluateLabel = buildActionLabel({
    isHydrated,
    isPending: isEvaluating,
    pendingLabel: "Evaluating proposal…",
    readyLabel: "Evaluate Workspace",
  });
  const saveLabel = buildActionLabel({
    isHydrated,
    isPending: isSaving,
    pendingLabel: "Retaining draft…",
    readyLabel: "Save Advisor Draft",
  });
  const queueHref = queuePortfolioId
    ? `/proposals?portfolioId=${encodeURIComponent(queuePortfolioId)}`
    : null;

  return (
    <section
      className={styles.railRoot}
      aria-labelledby="proposal-builder-control-heading"
      data-testid="proposal-builder-workflow-rail"
      data-scenario-cash-state={scenarioCashState}
      data-workflow-admission={canRunWorkflow ? "ready" : "blocked"}
    >
      <WorkbenchRailCard className={styles.railCard}>
        <div className={styles.header}>
          <div>
            <Text variant="microLabel">Proposal control</Text>
            <h3 id="proposal-builder-control-heading">Review and retain</h3>
          </div>
          <SemanticBadge tone={canRunWorkflow ? "success" : "warn"}>
            {canRunWorkflow ? "Ready to evaluate" : "Action required"}
          </SemanticBadge>
        </div>

        <p className={styles.intro}>
          Confirm the proposed changes and source evidence before retaining an
          advisor-use draft.
        </p>

        <dl className={styles.readiness} aria-label="Proposal readiness">
          <div>
            <dt>Portfolio evidence</dt>
            <dd>
              {isPortfolioEvidenceConfirmed
                ? "Confirmed"
                : "Awaiting confirmation"}
            </dd>
          </div>
          <div>
            <dt>Security orders</dt>
            <dd>
              {readyTradeCount ? `${readyTradeCount} ready` : "None added"}
            </dd>
          </div>
          {cappedTradeCount ? (
            <div>
              <dt>Quantity controls</dt>
              <dd>
                {cappedTradeCount} sell{" "}
                {cappedTradeCount === 1 ? "line" : "lines"} capped to available
                units
              </dd>
            </div>
          ) : null}
        </dl>

        <div className={styles.actions}>
          <ActionButton
            type="submit"
            priority="primary"
            disabled={actionsDisabled}
            aria-describedby="proposal-builder-action-reason"
          >
            {evaluateLabel}
          </ActionButton>
          <ActionButton
            type="button"
            priority="secondary"
            onClick={onSaveDraft}
            disabled={actionsDisabled}
            aria-describedby="proposal-builder-action-reason"
          >
            {saveLabel}
          </ActionButton>
          {queueHref ? (
            <Link className={styles.queueLink} href={queueHref}>
              View proposal queue
            </Link>
          ) : null}
        </div>

        <p id="proposal-builder-action-reason" className={styles.actionReason}>
          {isActionPending
            ? "The current source action must finish before another proposal action can begin."
            : actionReason}
        </p>

        {error ? (
          <>
            <div
              className={`${styles.feedback} ${styles.feedbackError}`}
              role="alert"
              aria-label="Proposal action failure"
              aria-atomic="true"
            >
              <strong>Proposal action not completed</strong>
              <span>{error}</span>
            </div>
            {errorSupportEvidence ? (
              <ProposalActionSupportDetails evidence={errorSupportEvidence} />
            ) : null}
          </>
        ) : isSaving ? (
          <div
            className={styles.feedback}
            role="status"
            aria-label="Proposal handoff status"
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>Retaining advisor draft</strong>
            <span>Evaluation and source handoff are still in progress.</span>
          </div>
        ) : isEvaluating ? (
          <div
            className={styles.feedback}
            role="status"
            aria-label="Proposal evaluation status"
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>Evaluating proposed changes</strong>
            <span>Waiting for the source-owned assessment.</span>
          </div>
        ) : savedProposalId ? (
          <div
            className={`${styles.feedback} ${styles.feedbackSuccess}`}
            role="status"
            aria-label="Proposal handoff status"
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>Advisor draft retained</strong>
            <span>
              Proposal {savedProposalId} is available in the review workflow.
            </span>
          </div>
        ) : evaluationAvailable ? (
          <div
            className={`${styles.feedback} ${styles.feedbackSuccess}`}
            role="status"
            aria-label="Proposal evaluation status"
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>Evaluation confirmed</strong>
            <span>
              {evaluatedWorkspaceId
                ? `Source reference ${evaluatedWorkspaceId}. Review the evaluation before retaining the draft.`
                : "Review the source-owned evaluation before retaining the draft."}
            </span>
          </div>
        ) : null}
      </WorkbenchRailCard>
    </section>
  );
}
