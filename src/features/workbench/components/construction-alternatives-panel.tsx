"use client";

import { useEffect, useState } from "react";
import {
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
import {
  getExternalOrderExecutionAcknowledgement,
  generateDpmConstructionAlternatives,
  selectDpmConstructionAlternative,
} from "@/features/workbench/api";
import type {
  DpmConstructionGatewayResponse,
  ExternalOrderExecutionAcknowledgementResponse,
  WorkbenchPortfolio360,
} from "@/features/workbench/types";
import ConstructionAlternativesComparisonCard from "@/features/workbench/components/construction-alternatives-comparison-card";
import ConstructionCommandSummaryCard from "@/features/workbench/components/construction-command-summary-card";
import ConstructionRecommendedActionsCard from "@/features/workbench/components/construction-recommended-actions-card";
import ConstructionSelectedDetailCard from "@/features/workbench/components/construction-selected-detail-card";
import ExecutionAcknowledgementSupportabilityPanel from "@/features/workbench/components/execution-acknowledgement-supportability-panel";
import {
  buildConstructionPanelModel,
} from "@/features/workbench/construction-alternatives-view-model";
import {
  canSelectConstructionAlternative,
  constructionBadgeTone,
  resolveConstructionAlternativeLabel,
} from "@/features/workbench/construction-alternatives-panel-helpers";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  portfolio: WorkbenchPortfolio360;
};

export default function ConstructionAlternativesPanel({ portfolio }: Props) {
  const [response, setResponse] =
    useState<DpmConstructionGatewayResponse | null>(null);
  const [generatePending, setGeneratePending] = useState(false);
  const [selectionPendingId, setSelectionPendingId] = useState<string | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [
    executionAcknowledgementResponse,
    setExecutionAcknowledgementResponse,
  ] = useState<ExternalOrderExecutionAcknowledgementResponse | null>(null);
  const [executionAcknowledgementLoading, setExecutionAcknowledgementLoading] =
    useState(false);
  const [executionAcknowledgementError, setExecutionAcknowledgementError] =
    useState<string | null>(null);
  const model = buildConstructionPanelModel(response);
  const portfolioId = portfolio.portfolio.portfolio_id;
  const selectedAlternative = model.selectedAlternative;
  const canSelectSelectedAlternative = canSelectConstructionAlternative({
    selectedAlternative,
    alternativeSetId: model.alternativeSetId,
    state: model.state,
    selectedAlternativeId: model.selectedAlternativeId,
    selectionPendingId,
  });

  useEffect(() => {
    let cancelled = false;
    setExecutionAcknowledgementLoading(true);
    setExecutionAcknowledgementError(null);
    void getExternalOrderExecutionAcknowledgement({ portfolio })
      .then((nextResponse) => {
        if (!cancelled) {
          setExecutionAcknowledgementResponse(nextResponse);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setExecutionAcknowledgementResponse(null);
          setExecutionAcknowledgementError(
            error instanceof Error
              ? error.message
              : "External OMS acknowledgement supportability could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setExecutionAcknowledgementLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [portfolio]);

  async function generateAlternatives() {
    if (generatePending) {
      return;
    }
    setGeneratePending(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const generated = await generateDpmConstructionAlternatives({
        portfolio,
      });
      setResponse(generated);
      setActionMessage("Construction alternatives generated.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Construction alternative generation failed",
      );
    } finally {
      setGeneratePending(false);
    }
  }

  async function selectAlternative(alternativeId: string) {
    if (
      selectionPendingId ||
      model.alternativeSetId === "N/A" ||
      model.state === "blocked" ||
      model.state === "unsupported"
    ) {
      return;
    }
    setSelectionPendingId(alternativeId);
    setActionError(null);
    setActionMessage(null);
    const selectedLabel = resolveConstructionAlternativeLabel(
      model.alternatives,
      alternativeId,
    );
    try {
      const selected = await selectDpmConstructionAlternative({
        alternativeSetId: model.alternativeSetId,
        alternativeId,
      });
      setResponse(selected);
      setActionMessage(`Selected ${selectedLabel}.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Construction selection failed",
      );
    } finally {
      setSelectionPendingId(null);
    }
  }

  return (
    <SectionBlock
      title="Construction Alternatives"
      subtitle="Compare suitable implementation paths before advisor approval."
      className="construction-alternatives-panel"
      actions={
        <div className="construction-alternatives-badge-row">
          <SemanticBadge tone={constructionBadgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge tone="success">Evidence Available</SemanticBadge>
        </div>
      }
    >
      <ConstructionCommandSummaryCard
        model={model}
        portfolioId={portfolioId}
        generatePending={generatePending}
        actionMessage={actionMessage}
        actionError={actionError}
        onGenerateAlternatives={generateAlternatives}
      />

      <ExecutionAcknowledgementSupportabilityPanel
        response={executionAcknowledgementResponse}
        loading={executionAcknowledgementLoading}
        error={executionAcknowledgementError}
      />

      <div className="construction-alternatives-grid">
        <div className="construction-alternatives-primary">
          <ConstructionAlternativesComparisonCard
            model={model}
            selectionPendingId={selectionPendingId}
            onSelectAlternative={selectAlternative}
          />

          <ConstructionSelectedDetailCard
            model={model}
            selectionPendingId={selectionPendingId}
            canSelectSelectedAlternative={canSelectSelectedAlternative}
            onSelectAlternative={selectAlternative}
          />
        </div>

        <ConstructionRecommendedActionsCard
          model={model}
          portfolioId={portfolioId}
          selectionPendingId={selectionPendingId}
          onSelectRecommended={selectAlternative}
        />
      </div>
    </SectionBlock>
  );
}
