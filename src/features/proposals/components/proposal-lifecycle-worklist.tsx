"use client";

import { SemanticBadge, Text, WorkbenchRecordSelector } from "@/design-system";

import type { ProposalLifecycleRow } from "../proposal-lifecycle-workspace-view-model";
import styles from "./proposal-lifecycle-workspace.module.css";

export default function ProposalLifecycleWorklist({
  ariaLabel,
  rows,
  selectedProposalId,
  onSelectProposal,
}: {
  ariaLabel: string;
  rows: ProposalLifecycleRow[];
  selectedProposalId: string;
  onSelectProposal: (proposalId: string) => void;
}) {
  return (
    <section
      className={styles.worklistPane}
      aria-labelledby={`${ariaLabel}-title`}
    >
      <div className={styles.paneHeader}>
        <div>
          <Text variant="microLabel">Review worklist</Text>
          <Text variant="subsectionTitle" as="h3" id={`${ariaLabel}-title`}>
            Proposals in this view
          </Text>
        </div>
        <Text variant="secondary">Arrow keys move between proposals.</Text>
      </div>

      <WorkbenchRecordSelector
        ariaLabel={ariaLabel}
        className={styles.approvalWorklist}
        selectedKey={selectedProposalId}
        onSelectionChange={onSelectProposal}
        items={rows.map((row) => ({
          key: row.proposalId,
          title: row.title,
          subtitle: `${row.proposalId} · ${row.version}`,
          status: (
            <SemanticBadge tone={row.readinessTone}>
              {row.readiness}
            </SemanticBadge>
          ),
          facts: [
            { label: "Stage", value: row.stage },
            { label: "Recorded", value: row.createdOn },
          ],
          nextAction: row.nextAction,
        }))}
      />
    </section>
  );
}
