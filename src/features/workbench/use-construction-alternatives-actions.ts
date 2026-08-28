"use client";

import { useEffect, useState } from "react";
import {
  generateDpmConstructionAlternatives,
  getExternalOrderExecutionAcknowledgement,
  selectDpmConstructionAlternative,
} from "@/features/workbench/construction-api";
import {
  buildConstructionPanelModel,
  type ConstructionPanelModel,
} from "@/features/workbench/construction-alternatives-view-model";
import {
  canSelectConstructionAlternative,
  constructionGenerationMessage,
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

type ExecutionAcknowledgementState = {
  portfolioKey: string;
  status: "loading" | "ready" | "error";
  response: ExternalOrderExecutionAcknowledgementResponse | null;
  error: string | null;
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
  const model = buildConstructionPanelModel(response);
  const portfolioId = portfolio.portfolio.portfolio_id;
  const portfolioKey = `${portfolioId}|${portfolio.as_of_date}|${portfolio.contract_version}`;
  const [executionAcknowledgementState, setExecutionAcknowledgementState] =
    useState<ExecutionAcknowledgementState>({
      portfolioKey,
      status: "loading",
      response: null,
      error: null,
    });
  const activeExecutionAcknowledgementState =
    executionAcknowledgementState.portfolioKey === portfolioKey
      ? executionAcknowledgementState
      : {
          portfolioKey,
          status: "loading" as const,
          response: null,
          error: null,
        };
  const canSelectSelectedAlternative = canSelectConstructionAlternative({
    selectedAlternative: model.selectedAlternative,
    alternativeSetId: model.alternativeSetId,
    state: model.state,
    selectedAlternativeId: model.selectedAlternativeId,
    selectionPendingId,
  });

  useEffect(() => {
    let cancelled = false;
    void getExternalOrderExecutionAcknowledgement({ portfolio })
      .then((nextResponse) => {
        if (!cancelled) {
          setExecutionAcknowledgementState({
            portfolioKey,
            status: "ready",
            response: nextResponse,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setExecutionAcknowledgementState({
            portfolioKey,
            status: "error",
            response: null,
            error:
              error instanceof Error
                ? error.message
                : "External OMS acknowledgement supportability could not be loaded.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [portfolio, portfolioKey]);

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
      setActionMessage(
        constructionGenerationMessage(buildConstructionPanelModel(generated).state),
      );
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
    executionAcknowledgementResponse: activeExecutionAcknowledgementState.response,
    executionAcknowledgementLoading: activeExecutionAcknowledgementState.status === "loading",
    executionAcknowledgementError: activeExecutionAcknowledgementState.error,
    canSelectSelectedAlternative,
    generateAlternatives,
    selectAlternative,
  };
}
