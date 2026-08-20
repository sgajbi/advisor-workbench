"use client";

import {
  ActionButton,
  OperationalRecordList,
  SemanticBadge,
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
  rows,
  evidenceConfirmed,
  transaction,
  onAcknowledge,
}: Props) {
  const transactionPending =
    transaction.status === "recording" || transaction.status === "confirming";

  return (
    <div
      className={styles.worklist}
      data-testid="advisor-cockpit-action-worklist"
    >
      <div
        className={styles.tablePresentation}
        data-testid="advisor-cockpit-action-table"
      >
        <div
          className={styles.tableRegion}
          role="region"
          aria-label="Advisor action comparison table"
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Advisor action review worklist
            </caption>
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Status</th>
                <th scope="col">Owner</th>
                <th scope="col">Review window</th>
                <th scope="col">Evidence</th>
                <th scope="col">Next action</th>
                <th scope="col">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.actionItemId}>
                  <th scope="row">
                    <span className={styles.actionTitle}>{row.title}</span>
                    <span className={styles.meta}>{row.family}</span>
                    <span className={styles.meta}>{row.reasonSummary}</span>
                  </th>
                  <td>
                    <SemanticBadge tone={row.statusTone}>
                      {row.status}
                    </SemanticBadge>
                    <span className={styles.meta}>{row.priority}</span>
                  </td>
                  <td>{row.owner}</td>
                  <td>{row.sla}</td>
                  <td className={styles.evidenceCell}>
                    <p>{row.evidenceSummary}</p>
                    <span className={styles.meta}>{row.sourceGapSummary}</span>
                    <span className={styles.meta}>{row.dependencySummary}</span>
                  </td>
                  <td>{row.nextRequiredAction}</td>
                  <td>
                    <AcknowledgementControl
                      row={row}
                      evidenceConfirmed={evidenceConfirmed}
                      transaction={transaction}
                      transactionPending={transactionPending}
                      onAcknowledge={onAcknowledge}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={styles.compactPresentation}
        data-testid="advisor-cockpit-action-records"
      >
        <OperationalRecordList
          ariaLabel="Advisor action review records"
          items={rows.map((row) => ({
            key: row.actionItemId,
            title: row.title,
            description: (
              <span className={styles.recordDescription}>
                <span>{row.family}</span>
                <span>{row.reasonSummary}</span>
              </span>
            ),
            status: (
              <span className={styles.recordStatus}>
                <SemanticBadge tone={row.statusTone}>{row.status}</SemanticBadge>
                <span>{row.priority}</span>
              </span>
            ),
            facts: [
              { label: "Owner", value: row.owner },
              { label: "Review window", value: row.sla },
            ],
            detail: (
              <div className={styles.recordDetail}>
                <section className={styles.recordEvidence}>
                  <p className={styles.recordLabel}>Evidence</p>
                  <strong>{row.evidenceSummary}</strong>
                  <span>{row.sourceGapSummary}</span>
                  <span>{row.dependencySummary}</span>
                </section>
                <section className={styles.recordNextAction}>
                  <p className={styles.recordLabel}>Next business action</p>
                  <strong>{row.nextRequiredAction}</strong>
                  <AcknowledgementControl
                    row={row}
                    evidenceConfirmed={evidenceConfirmed}
                    transaction={transaction}
                    transactionPending={transactionPending}
                    onAcknowledge={onAcknowledge}
                  />
                </section>
              </div>
            ),
          }))}
        />
      </div>
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
        detail: "Review recorded; latest advisor evidence is not fully confirmed.",
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
