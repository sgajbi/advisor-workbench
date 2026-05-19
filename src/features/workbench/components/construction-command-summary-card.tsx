"use client";

import {
  ActionButton,
  MetricRow,
  ScreenStatePanel,
  SemanticBadge,
  Text,
} from "@/design-system";
import type { ConstructionPanelModel } from "@/features/workbench/construction-alternatives-view-model";
import {
  buildConstructionStatePanelCopy,
  shouldShowConstructionStatePanel,
} from "@/features/workbench/construction-alternatives-panel-helpers";
import { formatBusinessReason } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  model: ConstructionPanelModel;
  portfolioId: string;
  generatePending: boolean;
  actionMessage: string | null;
  actionError: string | null;
  onGenerateAlternatives: () => void;
};

export default function ConstructionCommandSummaryCard({
  model,
  portfolioId,
  generatePending,
  actionMessage,
  actionError,
  onGenerateAlternatives,
}: Props) {
  const stateCopy = buildConstructionStatePanelCopy(model.state, portfolioId);
  const shouldShowStatePanel = shouldShowConstructionStatePanel(
    model.state,
    actionError,
  );

  return (
    <>
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={actionError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={
            actionError
              ? "Construction endpoint is unavailable"
              : stateCopy.title
          }
          body={actionError ?? stateCopy.body}
        />
      ) : null}

      <div className="construction-alternatives-summary">
        <MetricRow label="Recommended Path" value={model.recommendedPathLabel} />
        <MetricRow label="Mandate Fit" value={model.mandateFitLabel} />
        <MetricRow label="Drift Improvement" value={model.driftImprovementLabel} />
        <MetricRow label="Approval Readiness" value={model.approvalReadinessLabel} />
      </div>

      <div className="construction-alternatives-action-row" aria-label="Construction actions">
        <ActionButton
          priority="secondary"
          onClick={onGenerateAlternatives}
          disabled={generatePending}
        >
          {generatePending
            ? "Generating alternatives"
            : "Generate alternatives"}
        </ActionButton>
        <div>
          {actionMessage ? (
            <Text variant="secondary" className="muted">
              {actionMessage}
            </Text>
          ) : null}
          <Text variant="secondary" className="muted">
            Alternatives are generated from the supported mandate and portfolio data available for this account.
          </Text>
        </div>
      </div>

      {model.supportabilityReasons.length > 0 ? (
        <div className="construction-alternatives-reason-row">
          {model.supportabilityReasons.map((reason) => (
            <SemanticBadge key={reason} tone="warn">
              {formatBusinessReason(reason)}
            </SemanticBadge>
          ))}
        </div>
      ) : null}
    </>
  );
}
