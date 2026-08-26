"use client";

import { AnalyticsTable } from "@/design-system";
import { ProofPackAvailabilityBadge, ProofPackStateBadge } from "@/features/workbench/components/proof-pack-badges";
import type { ProofPackPanelModel } from "@/features/workbench/proof-pack-view-model";

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
      <div className="proof-pack-workspace-grid">
        <div className="proof-pack-card">
          <div className="proof-pack-card-header">
            <h3>Evidence Areas</h3>
            <span>{model.evidenceRows.length} areas</span>
          </div>
          <AnalyticsTable
            ariaLabel="Evidence areas"
            variant="analysis"
            density="compact"
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
        </div>

        <div className="proof-pack-action-stack" aria-label="Recommended evidence actions">
          <button
            type="button"
            disabled={!proofPackId || !model.aiEvidenceInputAvailable || actionDisabled}
            onClick={onRequestAiPmMemo}
          >
            <strong>Open advisor memo</strong>
            <span>Prepare advisor handoff commentary from the evidence pack.</span>
          </button>
          <button
            type="button"
            disabled={!proofPackId || !model.reportInputAvailable || actionDisabled}
            onClick={onLoadReportInput}
          >
            <strong>Generate client report</strong>
            <span>Use the report-ready evidence payload for client-facing material.</span>
          </button>
          <button
            type="button"
            disabled={!proofPackId || !model.markdownAvailable || actionDisabled}
            onClick={onLoadMarkdown}
          >
            <strong>Load evidence summary</strong>
            <span>Open the evidence summary returned by Gateway.</span>
          </button>
          <a href={`/workbench/${encodeURIComponent(portfolioId)}?mode=reviews`}>Return to outcome review</a>
        </div>
      </div>

      <div className="proof-pack-detail-grid">
        <section className="proof-pack-detail-card">
          <h3>Detail: {model.selectedEvidenceTitle}</h3>
          <p>{model.selectedEvidenceSummary}</p>
          <div className="proof-pack-subgrid">
            <div>
              <h4>Coverage Checklist</h4>
              <ul>
                {model.coverageItems.length ? (
                  model.coverageItems.map((item) => <li key={item.key}>{item.area}</li>)
                ) : (
                  <li>No completed coverage items returned.</li>
                )}
              </ul>
            </div>
            <div>
              <h4>Supporting Documents</h4>
              <div className="proof-pack-document-list">
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
        <section className="proof-pack-rationale-card">
          <h3>Advisor Rationale</h3>
          <p>{model.advisorRationale}</p>
          <div className="proof-pack-handoff-row" aria-label="Evidence pack handoff status">
            <ProofPackAvailabilityBadge label="Summary" available={model.markdownAvailable} />
            <ProofPackAvailabilityBadge label="Report" available={model.reportInputAvailable} />
            <ProofPackAvailabilityBadge label="Memo" available={model.aiEvidenceInputAvailable} />
          </div>
        </section>
      </div>
    </>
  );
}
