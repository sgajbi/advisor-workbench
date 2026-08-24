"use client";

import {
  ActionButton,
  ActionLink,
  SemanticBadge,
  Text,
  useAdmittedSourceSelection,
  WorkbenchWorklist,
} from "@/design-system";

import type { AdvisorCockpitActionRow } from "../advisor-cockpit-view-model";
import styles from "./advisor-cockpit-action-worklist.module.css";

export type AdvisorCockpitAcknowledgementTransaction = {
  actionItemId: string | null;
  status:
    | "idle"
    | "recording"
    | "confirming"
    | "confirmed"
    | "confirmed-partial"
    | "failed";
};

type Props = {
  selectionScopeKey: string;
  rows: AdvisorCockpitActionRow[];
  evidenceConfirmed: boolean;
  transaction: AdvisorCockpitAcknowledgementTransaction;
  onAcknowledge: (row: AdvisorCockpitActionRow) => void;
};

type AcknowledgementPresentation = {
  label: string;
  detail: string;
  isSelected: boolean;
};

export default function AdvisorCockpitActionWorklist({
  selectionScopeKey,
  rows,
  evidenceConfirmed,
  transaction,
  onAcknowledge,
}: Props) {
  const transactionPending =
    transaction.status === "recording" || transaction.status === "confirming";
  const [selectedActionItemId, setSelectedActionItemId] =
    useAdmittedSourceSelection({
      scopeKey: selectionScopeKey,
      admittedKeys: rows.map((row) => row.actionItemId),
      sourceResolved: true,
    });
  const selectedRow =
    rows.find((row) => row.actionItemId === selectedActionItemId) ?? rows[0];

  if (!selectedRow) {
    return null;
  }

  return (
    <div
      className={styles.worklist}
      data-testid="advisor-cockpit-action-worklist"
    >
      <div data-testid="advisor-cockpit-action-records">
        <WorkbenchWorklist
          ariaLabel="Advisor action review worklist"
          relationshipIdBase="advisor-cockpit-action-worklist"
          eyebrow="Advisor priorities"
          title="Actions requiring a decision"
          items={rows.map((row) => ({
            key: row.actionItemId,
            title: row.title,
            status: (
              <SemanticBadge tone={row.statusTone}>{row.status}</SemanticBadge>
            ),
            facts: [
              { label: "Priority", value: row.priority },
              { label: "Owner", value: row.owner },
              { label: "Review window", value: row.sla },
            ],
          }))}
          selectedKey={selectedRow.actionItemId}
          onSelectionChange={setSelectedActionItemId}
          decisionLabel="Selected advisor action"
          decision={
            <SelectedAdvisorAction
              row={selectedRow}
              evidenceConfirmed={evidenceConfirmed}
              transaction={transaction}
              transactionPending={transactionPending}
              onAcknowledge={onAcknowledge}
            />
          }
        />
      </div>
    </div>
  );
}

function SelectedAdvisorAction({
  row,
  evidenceConfirmed,
  transaction,
  transactionPending,
  onAcknowledge,
}: {
  row: AdvisorCockpitActionRow;
  evidenceConfirmed: boolean;
  transaction: AdvisorCockpitAcknowledgementTransaction;
  transactionPending: boolean;
  onAcknowledge: (row: AdvisorCockpitActionRow) => void;
}) {
  return (
    <article
      className={styles.decisionPanel}
      data-testid="advisor-cockpit-selected-action"
    >
      <header className={styles.decisionHeader}>
        <div>
          <Text variant="microLabel">Next business action</Text>
          <Text variant="subsectionTitle" as="h4">
            {row.nextRequiredAction}
          </Text>
        </div>
        <SemanticBadge tone={row.priorityTone}>{row.priority}</SemanticBadge>
      </header>

      <dl className={styles.evidenceGrid}>
        <div>
          <dt>Action category</dt>
          <dd>{row.family}</dd>
        </div>
        <div>
          <dt>Workflow reasons</dt>
          <dd>{row.reasonSummary}</dd>
        </div>
        <div>
          <dt>Decision evidence</dt>
          <dd>{row.evidenceSummary}</dd>
        </div>
        <div>
          <dt>Source readiness</dt>
          <dd>{row.sourceGapSummary}</dd>
        </div>
        <div>
          <dt>Dependencies</dt>
          <dd>{row.dependencySummary}</dd>
        </div>
        <div>
          <dt>Client-use boundary</dt>
          <dd>{row.unsupportedClaims}</dd>
        </div>
      </dl>

      <div className={styles.decisionAction}>
        <SourceHandoff row={row} />
        <AcknowledgementControl
          row={row}
          evidenceConfirmed={evidenceConfirmed}
          transaction={transaction}
          transactionPending={transactionPending}
          onAcknowledge={onAcknowledge}
        />
      </div>
    </article>
  );
}

function SourceHandoff({ row }: { row: AdvisorCockpitActionRow }) {
  if (!row.sourceHandoff) {
    return null;
  }

  return (
    <div className={styles.sourceHandoff}>
      <span>{row.sourceHandoff.recordLabel}</span>
      <ActionLink
        href={row.sourceHandoff.href}
        className={styles.sourceHandoffLink}
      >
        <span aria-hidden="true">{row.sourceHandoff.label}</span>
        <span className={styles.srOnly}>
          {row.sourceHandoff.accessibleLabel}
        </span>
      </ActionLink>
    </div>
  );
}

function AcknowledgementControl({
  row,
  evidenceConfirmed,
  transaction,
  transactionPending,
  onAcknowledge,
}: {
  row: AdvisorCockpitActionRow;
  evidenceConfirmed: boolean;
  transaction: AdvisorCockpitAcknowledgementTransaction;
  transactionPending: boolean;
  onAcknowledge: (row: AdvisorCockpitActionRow) => void;
}) {
  const presentation = getAcknowledgementPresentation(row, transaction);
  const interactionBlocked =
    !row.canAcknowledge || transactionPending || !evidenceConfirmed;
  const preserveSelectedFocus =
    presentation.isSelected && transaction.status !== "idle";

  return (
    <div
      className={styles.acknowledgement}
      data-action-item-id={row.actionItemId}
      data-transaction-selected={presentation.isSelected ? "true" : "false"}
      data-transaction-state={
        presentation.isSelected ? transaction.status : "idle"
      }
    >
      <ActionButton
        priority="secondary"
        aria-disabled={interactionBlocked || undefined}
        disabled={interactionBlocked && !preserveSelectedFocus}
        onClick={() => {
          if (!interactionBlocked) {
            onAcknowledge(row);
          }
        }}
      >
        {presentation.label}
      </ActionButton>
      <span
        className={styles.acknowledgementDetail}
        role={
          presentation.isSelected && transaction.status !== "idle"
            ? "status"
            : undefined
        }
      >
        {presentation.detail}
      </span>
    </div>
  );
}

export function getAcknowledgementPresentation(
  row: AdvisorCockpitActionRow,
  transaction: AdvisorCockpitAcknowledgementTransaction,
): AcknowledgementPresentation {
  const isSelected = transaction.actionItemId === row.actionItemId;
  if (!isSelected) {
    return {
      label: row.acknowledgementLabel,
      detail: row.acknowledgementDetail,
      isSelected: false,
    };
  }

  switch (transaction.status) {
    case "recording":
      return {
        label: "Recording...",
        detail: "Recording this review in the source workflow.",
        isSelected: true,
      };
    case "confirming":
      return {
        label: "Confirming...",
        detail: "Review recorded; confirming current advisor evidence.",
        isSelected: true,
      };
    case "confirmed-partial":
      return {
        label: row.acknowledgementLabel,
        detail:
          "Review recorded; latest advisor evidence is not fully confirmed.",
        isSelected: true,
      };
    case "confirmed":
      return {
        label: row.acknowledgementLabel,
        detail: "Acknowledgement recorded in the source workflow.",
        isSelected: true,
      };
    case "failed":
      return {
        label: row.acknowledgementLabel,
        detail: "Acknowledgement could not be recorded.",
        isSelected: true,
      };
    case "idle":
      return {
        label: row.acknowledgementLabel,
        detail: row.acknowledgementDetail,
        isSelected: true,
      };
  }
}
