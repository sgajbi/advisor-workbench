"use client";

import type {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "../types";
import { buildProposalAdvisoryWorkspaceModel } from "../proposal-advisory-workspace-view-model";

import styles from "./proposal-advisory-workspace.module.css";

type Props = {
  data: ProposalDetailData;
  workflow?: ProposalWorkflowEventsData;
  approvals?: ProposalApprovalsData;
  lineage?: ProposalLineageData;
  generatedAt?: string;
  artifactHash?: string;
  requestHash?: string;
  simulationHash?: string;
  workflowAvailable?: boolean;
  approvalsAvailable?: boolean;
  lineageAvailable?: boolean;
};

function statusTone(state: string): string {
  if (state === "Ready") {
    return styles.ready;
  }
  if (state === "Blocked") {
    return styles.blocked;
  }
  return state === "Unavailable" ? styles.unavailable : styles.pending;
}

export default function ProposalAdvisoryWorkspace({
  data,
  workflow,
  approvals,
  lineage,
  generatedAt,
  artifactHash,
  requestHash,
  simulationHash,
  workflowAvailable,
  approvalsAvailable,
  lineageAvailable,
}: Props) {
  const model = buildProposalAdvisoryWorkspaceModel({
    data,
    workflow,
    approvals,
    lineage,
    generatedAt,
    artifactHash,
    requestHash,
    simulationHash,
    workflowAvailable,
    approvalsAvailable,
    lineageAvailable,
  });

  return (
    <section className={styles.workspace} aria-label="Advisor proposal workspace">
      <div className={styles.decisionStrip} aria-label="Proposal decision summary">
        <div>
          <span>Next action</span>
          <strong>{model.nextAction}</strong>
        </div>
        <div>
          <span>Current posture</span>
          <strong>{model.workflowPosture}</strong>
        </div>
        <div>
          <span>Approvals</span>
          <strong>{model.approvalCountLabel}</strong>
        </div>
        <div>
          <span>Lineage</span>
          <strong>{model.lineageCountLabel}</strong>
        </div>
        <div>
          <span>Latest event</span>
          <strong>{model.latestEventLabel}</strong>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="proposal-changes-heading">
          <div className={styles.panelHeader}>
            <h2 id="proposal-changes-heading">Proposed changes</h2>
            <span>
              {model.trades.length
                ? `${model.trades.length} line item${model.trades.length === 1 ? "" : "s"}`
                : "No trades"}
            </span>
          </div>
          {model.trades.length ? (
            <div className={styles.tableShell}>
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Instrument</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {model.trades.map((trade) => (
                    <tr key={trade.key}>
                      <td className={trade.side === "SELL" ? styles.sell : styles.buy}>{trade.side}</td>
                      <td>{trade.instrument}</td>
                      <td>{trade.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.emptyState}>Gateway did not return proposed trade lines for this proposal.</p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="allocation-impact-heading">
          <div className={styles.panelHeader}>
            <h2 id="allocation-impact-heading">Portfolio allocation impact</h2>
            <span>Source-owned</span>
          </div>
          {model.allocationRows.length ? (
            <div className={styles.allocationRows}>
              {model.allocationRows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>
                    {row.current} → {row.proposed}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>
              Allocation impact is pending source evidence; Workbench does not infer portfolio drift locally.
            </p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="review-gates-heading">
          <div className={styles.panelHeader}>
            <h2 id="review-gates-heading">Review gates</h2>
            <span>Advisor workflow</span>
          </div>
          <div className={styles.readinessList}>
            {model.readiness.map((item) => (
              <div key={item.label} className={styles.readinessRow}>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
                <span className={statusTone(item.state)}>{item.state}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </section>
  );
}
