"use client";

import { useEffect, useState } from "react";
import {
  generateDpmConstructionAlternatives,
  getExternalOrderExecutionAcknowledgement,
  selectDpmConstructionAlternative,
} from "@/features/workbench/api";
import {
  buildConstructionPanelModel,
  type ConstructionPanelModel,
} from "@/features/workbench/construction-alternatives-view-model";
import {
  canSelectConstructionAlternative,
  resolveConstructionAlternativeLabel,
} from "@/features/workbench/construction-alternatives-panel-helpers";
import type {
  DpmConstructionGatewayResponse,
  ExternalOrderExecutionAcknowledgementResponse,
  WorkbenchPortfolio360,
} from "@/features/workbench/types";

type UseConstructionAlternativesActionsInput = {
  portfolio: WorkbenchPortfolio360;
};

type UseConstructionAlternativesActionsResult = {
  model: ConstructionPanelModel;
  portfolioId: string;
  generatePending: boolean;
  selectionPendingId: string | null;
  actionMessage: string | null;
  actionError: string | null;
  executionAcknowledgementResponse: ExternalOrderExecutionAcknowledgementResponse | null;
  executionAcknowledgementLoading: boolean;
  executionAcknowledgementError: string | null;
  canSelectSelectedAlternative: boolean;
  generateAlternatives: () => Promise<void>;
  selectAlternative: (alternativeId: string) => Promise<void>;
};

export function useConstructionAlternativesActions({
  portfolio,
}: UseConstructionAlternativesActionsInput): UseConstructionAlternativesActionsResult {
  const [response, setResponse] =
    useState<DpmConstructionGatewayResponse | null>(null);
  const [generatePending, setGeneratePending] = useState(false);
  const [selectionPendingId, setSelectionPendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [executionAcknowledgementResponse, setExecutionAcknowledgementResponse] =
    useState<ExternalOrderExecutionAcknowledgementResponse | null>(null);
  const [executionAcknowledgementLoading, setExecutionAcknowledgementLoading] =
    useState(false);
  const [executionAcknowledgementError, setExecutionAcknowledgementError] =
    useState<string | null>(null);
  const model = buildConstructionPanelModel(response);
  const portfolioId = portfolio.portfolio.portfolio_id;
  const canSelectSelectedAlternative = canSelectConstructionAlternative({
    selectedAlternative: model.selectedAlternative,
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
              : "External OMS acknowledgement supportability could not be loaded."
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
          : "Construction alternative generation failed"
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
      alternativeId
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
        error instanceof Error ? error.message : "Construction selection failed"
      );
    } finally {
      setSelectionPendingId(null);
    }
  }

  return {
    model,
    portfolioId,
    generatePending,
    selectionPendingId,
    actionMessage,
    actionError,
    executionAcknowledgementResponse,
    executionAcknowledgementLoading,
    executionAcknowledgementError,
    canSelectSelectedAlternative,
    generateAlternatives,
    selectAlternative,
  };
}
