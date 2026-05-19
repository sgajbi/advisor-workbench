"use client";

import { Text } from "@/design-system";
import type {
  ConstructionPanelModel,
} from "@/features/workbench/construction-alternatives-view-model";

type Props = {
  model: ConstructionPanelModel;
  portfolioId: string;
  selectionPendingId: string | null;
  onSelectRecommended: (alternativeId: string) => void;
};

export default function ConstructionRecommendedActionsCard({
  model,
  portfolioId,
  selectionPendingId,
  onSelectRecommended,
}: Props) {
  const selectedAlternative = model.selectedAlternative;
  const encodedPortfolioId = encodeURIComponent(portfolioId);

  return (
    <div className="construction-source-readiness-card">
      <Text as="h3" variant="subsectionTitle">
        Recommended Actions
      </Text>
      <div className="construction-source-readiness-list">
        <button
          type="button"
          onClick={() =>
            selectedAlternative
              ? onSelectRecommended(selectedAlternative.alternativeId)
              : undefined
          }
          disabled={
            !selectedAlternative ||
            model.state === "blocked" ||
            Boolean(selectionPendingId)
          }
        >
          <strong>Select recommended path</strong>
          <span>{model.recommendedPathLabel}</span>
        </button>
        <a href={`/workbench/${encodedPortfolioId}?mode=waves`}>
          Review trade impact
        </a>
        <a href={`/workbench/${encodedPortfolioId}?mode=mandate`}>
          Resolve mandate attention item
        </a>
        <a href={`/workbench/${encodedPortfolioId}?mode=proof`}>
          Open evidence pack
        </a>
      </div>
    </div>
  );
}
