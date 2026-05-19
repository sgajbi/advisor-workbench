"use client";

import {
  ActionButton,
  AnalyticsTable,
  SemanticBadge,
  Text,
} from "@/design-system";
import type {
  ConstructionPanelModel,
} from "@/features/workbench/construction-alternatives-view-model";
import { constructionBadgeTone } from "@/features/workbench/construction-alternatives-panel-helpers";

type Props = {
  model: ConstructionPanelModel;
  selectionPendingId: string | null;
  onSelectAlternative: (alternativeId: string) => void;
};

export default function ConstructionAlternativesComparisonCard({
  model,
  selectionPendingId,
  onSelectAlternative,
}: Props) {
  return (
    <div className="construction-alternatives-card">
      <div className="construction-alternatives-card-header">
        <Text as="h3" variant="subsectionTitle">
          Alternatives Comparison
        </Text>
        <span>{model.alternatives.length} paths</span>
      </div>
      <AnalyticsTable
        ariaLabel="Alternatives comparison"
        variant="analysis"
        density="compact"
        columns={[
          { key: "alternative", label: "Alternative" },
          { key: "objective", label: "Objective" },
          { key: "turnover", label: "Turnover", align: "right" },
          { key: "cash", label: "Cash After", align: "right" },
          { key: "drift", label: "Drift Improvement", align: "right" },
          { key: "fit", label: "Mandate Fit" },
          { key: "action", label: "Action" },
        ]}
        rows={model.alternatives.map((alternative) => {
          const selected =
            model.selectedAlternativeId === alternative.alternativeId;
          const selectable =
            !selected &&
            model.state !== "blocked" &&
            model.state !== "unsupported";
          return {
            key: alternative.alternativeId,
            cells: [
              <span
                className="construction-alternative-label"
                key={`${alternative.alternativeId}-label`}
              >
                {alternative.label}
                {alternative.isRecommended ? (
                  <SemanticBadge tone="success">Recommended</SemanticBadge>
                ) : null}
                {selected ? (
                  <SemanticBadge tone="success">Selected</SemanticBadge>
                ) : null}
              </span>,
              alternative.objective,
              alternative.turnoverPct,
              alternative.cashAfterPct,
              alternative.driftImprovementPct,
              <SemanticBadge
                key={`${alternative.alternativeId}-fit`}
                tone={constructionBadgeTone(alternative.mandateFit)}
              >
                {alternative.mandateFit}
              </SemanticBadge>,
              <ActionButton
                key={`${alternative.alternativeId}-action`}
                priority={alternative.isRecommended ? "primary" : "secondary"}
                onClick={() => onSelectAlternative(alternative.alternativeId)}
                disabled={!selectable || Boolean(selectionPendingId)}
              >
                {selected
                  ? "Selected"
                  : selectionPendingId === alternative.alternativeId
                    ? "Selecting"
                    : alternative.actionLabel}
              </ActionButton>,
            ],
          };
        })}
        emptyState={{
          title: "No construction alternatives returned",
          body: "Generate an alternative set to compare construction choices.",
        }}
      />
    </div>
  );
}
