"use client";

import { formatBusinessReason } from "@/copy/business-state-copy";
import { CONSTRUCTION_COPY } from "@/copy/construction-copy";
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
  shouldShowConstructionAttentionReasons,
  shouldShowConstructionStatePanel,
} from "@/features/workbench/construction-alternatives-panel-helpers";

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
              ? CONSTRUCTION_COPY.unavailableTitle
              : stateCopy.title
          }
          body={actionError ? CONSTRUCTION_COPY.unavailableBody : stateCopy.body}
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

      {shouldShowConstructionAttentionReasons(
        model.state,
        model.supportabilityReasons,
      ) ? (
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
