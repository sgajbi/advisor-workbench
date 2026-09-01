"use client";

import { AnalyticsTable } from "@/design-system";
import {
  ProofPackAvailabilityBadge,
  ProofPackStateBadge,
} from "@/features/workbench/components/proof-pack-badges";
import type { ProofPackPanelModel } from "@/features/workbench/proof-pack-view-model";
import styles from "./proof-pack.module.css";

type ProofPackWorkspaceProps = {
  model: ProofPackPanelModel;
  portfolioId: string;
  proofPackId: string | null;
  pendingAction: string | null;
  onRequestAiPmMemo: () => void;
  onLoadReportInput: () => void;
  onLoadMarkdown: () => void;
};

export default function ProofPackWorkspace({
  model,
  portfolioId,
  proofPackId,
  pendingAction,
  onRequestAiPmMemo,
  onLoadReportInput,
  onLoadMarkdown,
}: ProofPackWorkspaceProps) {
  const actionDisabled = Boolean(pendingAction);

  return (
    <>
      <div className={styles.workspaceGrid}>
        <section
          className={styles.evidenceCard}
          aria-labelledby="evidence-pack-areas-heading"
        >
          <div className={styles.cardHeader}>
            <h3 id="evidence-pack-areas-heading">Evidence areas</h3>
            <span>{model.evidenceRows.length} areas</span>
          </div>
          <AnalyticsTable
            ariaLabel="Evidence areas"
            className={styles.evidenceTable}
            variant="analysis"
            density="compact"
            scrollRegionLabel="Evidence areas table"
            tableMinWidth={680}
            columns={[
              { key: "area", label: "Evidence Area" },
              { key: "status", label: "Status" },
              { key: "finding", label: "Business Finding" },
              { key: "action", label: "Action" },
            ]}
            rows={model.evidenceRows.map((row) => ({
              key: row.key,
              cells: [
                row.area,
                <ProofPackStateBadge key={`${row.key}-state`} state={row.status} />,
                row.finding,
                row.action,
              ],
            }))}
            emptyState={{
              title: "No evidence areas available",
              body: "Evidence areas are not available yet.",
            }}
          />
        </section>

        <section
          className={styles.nextActions}
          aria-labelledby="evidence-pack-next-actions-heading"
        >
          <div className={styles.nextActionsHeader}>
            <h3 id="evidence-pack-next-actions-heading">Next actions</h3>
            <span>Continue from reviewed evidence</span>
          </div>
          <div
            className={styles.actionStack}
            aria-label="Evidence pack next actions"
          >
            <button
              type="button"
              disabled={
                !proofPackId || !model.aiEvidenceInputAvailable || actionDisabled
              }
              onClick={onRequestAiPmMemo}
            >
              <strong>Open advisor memo</strong>
              <span>
                Prepare advisor handoff commentary from the evidence pack.
              </span>
            </button>
            <button
              type="button"
              disabled={
                !proofPackId || !model.reportInputAvailable || actionDisabled
              }
              onClick={onLoadReportInput}
            >
              <strong>Check report readiness</strong>
              <span>
                Confirm that source evidence is ready for the reporting workflow.
              </span>
            </button>
            <button
              type="button"
              disabled={
                !proofPackId || !model.markdownAvailable || actionDisabled
              }
              onClick={onLoadMarkdown}
            >
              <strong>Load evidence summary</strong>
              <span>Open the source evidence summary for review.</span>
            </button>
            <a
              href={`/workbench/${encodeURIComponent(portfolioId)}?mode=reviews`}
            >
              Return to outcome review
            </a>
          </div>
        </section>
      </div>

      <div className={styles.detailGrid} data-testid="evidence-pack-detail">
        <section className={styles.detailCard}>
          <h3>Detail: {model.selectedEvidenceTitle}</h3>
          <p>{model.selectedEvidenceSummary}</p>
          <div className={styles.detailSubgrid}>
            <div>
              <h4>Coverage checklist</h4>
              <ul>
                {model.coverageItems.length ? (
                  model.coverageItems.map((item) => <li key={item.key}>{item.area}</li>)
                ) : (
                  <li>No completed coverage items returned.</li>
                )}
              </ul>
            </div>
            <div>
              <h4>Supporting documents</h4>
              <div className={styles.documentList}>
                {model.documents.length ? (
                  model.documents.map((document) => (
                    <span key={document.key}>
                      <strong>{document.label}</strong>
                      <em>{document.status}</em>
                    </span>
                  ))
                ) : (
                  <span>
                    <strong>No supporting document references returned</strong>
                    <em>Not available</em>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className={styles.rationaleCard}>
          <h3>Advisor rationale</h3>
          <p>{model.advisorRationale}</p>
          <div className={styles.handoffRow} aria-label="Evidence pack handoff status">
            <ProofPackAvailabilityBadge label="Summary" available={model.markdownAvailable} />
            <ProofPackAvailabilityBadge label="Report" available={model.reportInputAvailable} />
            <ProofPackAvailabilityBadge label="Memo" available={model.aiEvidenceInputAvailable} />
          </div>
        </section>
      </div>
    </>
  );
}
