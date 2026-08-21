"use client";

import { useId } from "react";

import { SemanticBadge, Text, WorkbenchRecordSelector } from "@/design-system";

import type { ProposalLifecycleRow } from "../proposal-lifecycle-workspace-view-model";
import styles from "./proposal-lifecycle-workspace.module.css";

export default function ProposalLifecycleWorklist({
  ariaLabel,
  rows,
  selectedProposalId,
  onSelectProposal,
  defaultNextAction,
  selectedPresentation,
}: {
  ariaLabel: string;
  rows: ProposalLifecycleRow[];
  selectedProposalId: string;
  onSelectProposal: (proposalId: string) => void;
  defaultNextAction?: string;
  selectedPresentation?: {
    label: string;
    tone: "default" | "success" | "warn" | "danger";
    nextAction: string;
  };
}) {
  const titleId = useId();

  return (
    <section className={styles.worklistPane} aria-labelledby={titleId}>
      <div className={styles.paneHeader}>
        <div>
          <Text variant="microLabel">Review worklist</Text>
          <Text variant="subsectionTitle" as="h3" id={titleId}>
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
        items={rows.map((row) => {
          const presentation =
            row.proposalId === selectedProposalId
              ? selectedPresentation
              : undefined;
          return {
            key: row.proposalId,
            title: row.title,
            subtitle: `${row.proposalId} · ${row.version}`,
            status: (
              <SemanticBadge tone={presentation?.tone ?? row.stageTone}>
                {presentation?.label ?? row.stage}
              </SemanticBadge>
            ),
            facts: [
              { label: "Creator record", value: row.creator },
              { label: "Recorded", value: row.createdOn },
            ],
            nextAction:
              presentation?.nextAction ?? defaultNextAction ?? row.nextAction,
          };
        })}
      />
    </section>
  );
}
