"use client";

import {
  ActionButton,
  ScreenStatePanel,
  SemanticBadge,
  Text,
} from "@/design-system";
import ConstructionAuthorityEvidenceCard from "@/features/workbench/components/construction-authority-evidence-card";
import type {
  ConstructionPanelModel,
} from "@/features/workbench/construction-alternatives-view-model";
import { constructionBadgeTone } from "@/features/workbench/construction-alternatives-panel-helpers";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  model: ConstructionPanelModel;
  selectionPendingId: string | null;
  canSelectSelectedAlternative: boolean;
  onSelectAlternative: (alternativeId: string) => void;
};

export default function ConstructionSelectedDetailCard({
  model,
  selectionPendingId,
  canSelectSelectedAlternative,
  onSelectAlternative,
}: Props) {
  const selectedAlternative = model.selectedAlternative;

  return (
    <div className="construction-alternatives-detail-card">
      <div className="construction-alternatives-detail-header">
        <Text as="h3" variant="subsectionTitle">
          Selected: {selectedAlternative?.label ?? "N/A"}
        </Text>
        <ActionButton
          priority="primary"
          onClick={() =>
            selectedAlternative
              ? onSelectAlternative(selectedAlternative.alternativeId)
              : undefined
          }
          disabled={!canSelectSelectedAlternative}
        >
          {selectionPendingId === selectedAlternative?.alternativeId
            ? "Applying selection"
            : model.selectedAlternativeId === selectedAlternative?.alternativeId
              ? "Selection Applied"
              : "Apply Selection"}
        </ActionButton>
      </div>

      <div className="construction-alternatives-detail-grid">
        <div className="construction-alternatives-detail-main">
          <section>
            <h4>Business Rationale</h4>
            <p className="construction-alternatives-rationale">
              {model.selectedBusinessRationale}
            </p>
          </section>

          <section>
            <h4>Trade Impact Summary</h4>
            <div className="construction-trade-impact-strip">
              <div>
                <strong>{model.tradeImpact.tradeCount}</strong>
                <span>Total Trades</span>
              </div>
              <div>
                <strong>{model.tradeImpact.buyCount}</strong>
                <span>Buys</span>
              </div>
              <div>
                <strong>{model.tradeImpact.trimCount}</strong>
                <span>Trims</span>
              </div>
              <div>
                <strong>{model.tradeImpact.cashReductionCount}</strong>
                <span>Cash Red.</span>
              </div>
            </div>
          </section>

          {model.allocationRows.length > 0 ? (
            <section>
              <h4>Allocation Comparison</h4>
              <div
                className="construction-allocation-list"
                aria-label="Allocation comparison"
              >
                {model.allocationRows.map((row) => (
                  <div key={row.key}>
                    <div>
                      <strong>{row.label}</strong>
                      <span>
                        {row.before} to {row.after}
                      </span>
                    </div>
                    <div aria-hidden="true">
                      <i style={{ width: row.beforeWidth }} />
                      <b style={{ width: row.afterWidth }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="construction-alternatives-detail-side">
          <Text as="h3" variant="subsectionTitle">
            Mandate Integrity Checks
          </Text>
          {model.constraints.length > 0 ? (
            <div className="construction-constraint-list">
              {model.constraints.map((constraint) => (
                <div key={constraint.key}>
                  <strong>{businessStateLabel(constraint.name)}</strong>
                  <SemanticBadge tone={constructionBadgeTone(constraint.state)}>
                    {businessStateLabel(constraint.state)}
                  </SemanticBadge>
                </div>
              ))}
            </div>
          ) : (
            <ScreenStatePanel
              kind="empty"
              surface="portfolio"
              title="No constraint matrix returned"
              body="Constraint rows are not available for the selected alternative."
            />
          )}
          <ConstructionAuthorityEvidenceCard model={model} />
        </div>
      </div>
    </div>
  );
}
