"use client";

import Link from "next/link";
import { useState } from "react";

import { SemanticBadge, Text } from "@/design-system";

import type { ProposalLifecycleRow } from "../proposal-lifecycle-workspace-view-model";
import ProposalLifecycleWorklist from "./proposal-lifecycle-worklist";
import styles from "./proposal-lifecycle-workspace.module.css";

export default function ProposalLifecycleDecisionWorkspace({
  rows,
}: {
  rows: ProposalLifecycleRow[];
}) {
  const [preferredProposalId, setPreferredProposalId] = useState<string | null>(
    rows[0]?.proposalId ?? null,
  );
  const selectedProposal =
    rows.find((row) => row.proposalId === preferredProposalId) ??
    rows[0] ??
    null;

  if (!selectedProposal) return null;

  return (
    <div
      className={styles.decisionWorkspace}
      data-testid="proposal-approval-decision-workspace"
    >
      <ProposalLifecycleWorklist
        ariaLabel="Approval Queue proposals"
        rows={rows}
        selectedProposalId={selectedProposal.proposalId}
        onSelectProposal={setPreferredProposalId}
      />

      <section
        className={styles.selectedProposalPane}
        aria-label="Selected proposal decision"
      >
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Selected proposal: {selectedProposal.title}. {selectedProposal.stage}.
          Next action: {selectedProposal.nextAction}.
        </p>
        <div className={styles.selectedProposalHeader}>
          <div>
            <Text variant="microLabel">Selected proposal</Text>
            <Text variant="subsectionTitle" as="h3">
              {selectedProposal.title}
            </Text>
            <Text variant="metadata">{selectedProposal.proposalId}</Text>
          </div>
          <SemanticBadge tone={selectedProposal.stageTone} emphasis="strong">
            {selectedProposal.stage}
          </SemanticBadge>
        </div>

        <dl className={styles.selectedProposalFacts}>
          <div>
            <dt>Readiness</dt>
            <dd>{selectedProposal.readiness}</dd>
          </div>
          <div>
            <dt>Current version</dt>
            <dd>{selectedProposal.version}</dd>
          </div>
          <div>
            <dt>Recorded</dt>
            <dd>{selectedProposal.createdOn}</dd>
          </div>
        </dl>

        <div className={styles.selectedProposalDecision}>
          <div>
            <Text variant="microLabel">Current posture</Text>
            <strong>{selectedProposal.posture}</strong>
          </div>
          <div>
            <Text variant="microLabel">Next business action</Text>
            <strong>{selectedProposal.nextAction}</strong>
          </div>
        </div>

        <div className={styles.selectedProposalActions}>
          <p>
            Stage and readiness come from the proposal lifecycle summary. Verify
            approval and supporting evidence in the full review before advancing
            the proposal.
          </p>
          <Link
            className={styles.reviewProposalLink}
            href={selectedProposal.href}
          >
            Open proposal review
          </Link>
        </div>
      </section>
    </div>
  );
}
