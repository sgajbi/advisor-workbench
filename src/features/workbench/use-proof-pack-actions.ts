"use client";

import { useState } from "react";
import {
  generateDpmProofPackFromRun,
  getDpmProofPack,
  getDpmProofPackMarkdown,
  getDpmProofPackReportInput,
  requestDpmProofPackAiPmMemo,
} from "@/features/workbench/proof-pack-api";
import { getWorkbenchApiErrorStatus } from "@/features/workbench/api-client";
import {
  buildDpmAiWorkflowOutcome,
  type DpmAiWorkflowOutcome,
} from "@/features/workbench/dpm-ai-workflow-disclosure";
import {
  buildProofPackPanelModel,
  type ProofPackPanelModel,
} from "@/features/workbench/proof-pack-view-model";
import {
  readProofPackMarkdown,
} from "@/features/workbench/proof-pack-panel-helpers";
import type { DpmProofPackGatewayResponse } from "@/features/workbench/types";

type UseProofPackActionsInput = {
  initialProofPack: DpmProofPackGatewayResponse | null;
  contextProofPackId: string | null;
  contextRebalanceRunId: string | null;
  contextMandateId: string | null;
  mandateId?: string | null;
  onProofPackChange?: (proofPack: DpmProofPackGatewayResponse) => void;
};

type UseProofPackActionsResult = {
  model: ProofPackPanelModel;
  proofPackId: string | null;
  rebalanceRunId: string | null;
  pendingAction: string | null;
  actionError: string | null;
  handoffStatus: string | null;
  aiMemoOutcome: DpmAiWorkflowOutcome | null;
  markdown: string | null;
  generateProofPack: () => void;
  loadProofPack: () => void;
  loadMarkdown: () => void;
  loadReportInput: () => void;
  requestAiPmMemo: () => void;
};

type ProofPackBoundAiMemo = {
  proofPackId: string;
  outcome: DpmAiWorkflowOutcome;
};

export function useProofPackActions({
  initialProofPack,
  contextProofPackId,
  contextRebalanceRunId,
  contextMandateId,
  mandateId,
  onProofPackChange,
}: UseProofPackActionsInput): UseProofPackActionsResult {
  const [publishedProofPack, setPublishedProofPack] =
    useState<DpmProofPackGatewayResponse | null>(null);
  const proofPack = publishedProofPack ?? initialProofPack;
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const [aiMemo, setAiMemo] = useState<ProofPackBoundAiMemo | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const model = buildProofPackPanelModel(proofPack);
  const proofPackId =
    model.proofPackId !== "N/A" ? model.proofPackId : contextProofPackId;
  const rebalanceRunId =
    contextRebalanceRunId ?? (model.rebalanceRunId !== "N/A" ? model.rebalanceRunId : null);
  const resolvedMandateId =
    mandateId ?? contextMandateId ?? (model.mandateId !== "N/A" ? model.mandateId : null);
  const aiMemoOutcome =
    aiMemo?.proofPackId === proofPackId ? aiMemo.outcome : null;

  async function runAction(label: string, action: () => Promise<void>) {
    if (pendingAction) {
      return;
    }
    setPendingAction(label);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      if (getWorkbenchApiErrorStatus(error) === 404) {
        setActionError(
          "Evidence pack is not available from Gateway. Prepare evidence to generate the current review pack."
        );
        return;
      }
      setActionError(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setPendingAction(null);
    }
  }

  function loadProofPack() {
    if (!proofPackId) {
      return;
    }
    void runAction("Load proof pack", async () => {
      const loaded = await getDpmProofPack(proofPackId);
      setPublishedProofPack(loaded);
      onProofPackChange?.(loaded);
      setHandoffStatus("Evidence pack loaded.");
    });
  }

  function generateProofPack() {
    if (!rebalanceRunId) {
      return;
    }
    void runAction("Generate proof pack", async () => {
      const generated = await generateDpmProofPackFromRun({
        rebalanceRunId,
        mandateId: resolvedMandateId,
      });
      setPublishedProofPack(generated);
      onProofPackChange?.(generated);
      setHandoffStatus("Evidence pack prepared.");
    });
  }

  function loadMarkdown() {
    if (!proofPackId) {
      return;
    }
    void runAction("Load summary", async () => {
      const response = await getDpmProofPackMarkdown(proofPackId);
      setMarkdown(readProofPackMarkdown(response));
      setHandoffStatus("Summary loaded.");
    });
  }

  function loadReportInput() {
    if (!proofPackId) {
      return;
    }
    void runAction("Check report readiness", async () => {
      const response = await getDpmProofPackReportInput(proofPackId);
      setHandoffStatus(
        response.supportability.report_input_available
          ? "Report-ready evidence is available."
          : "Report-ready evidence is not available."
      );
    });
  }

  function requestAiPmMemo() {
    if (!proofPackId) {
      return;
    }
    void runAction("Open advisor memo", async () => {
      setHandoffStatus(null);
      setAiMemo(null);
      const response = await requestDpmProofPackAiPmMemo({ proofPackId });
      setAiMemo({
        proofPackId,
        outcome: buildDpmAiWorkflowOutcome(
          "proof-pack-memo",
          response,
          proofPackId,
        ),
      });
    });
  }

  return {
    model,
    proofPackId,
    rebalanceRunId,
    pendingAction,
    actionError,
    handoffStatus,
    aiMemoOutcome,
    markdown,
    generateProofPack,
    loadProofPack,
    loadMarkdown,
    loadReportInput,
    requestAiPmMemo,
  };
}
