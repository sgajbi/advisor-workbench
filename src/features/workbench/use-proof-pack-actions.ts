"use client";

import { useState } from "react";
import {
  generateDpmProofPackFromRun,
  getDpmProofPack,
  getDpmProofPackMarkdown,
  getDpmProofPackReportInput,
  requestDpmProofPackAiPmMemo,
} from "@/features/workbench/proof-pack-api";
import {
  buildProofPackPanelModel,
  type ProofPackPanelModel,
} from "@/features/workbench/proof-pack-view-model";
import {
  readProofPackAiWorkflowPackStatus,
  readProofPackMarkdown,
} from "@/features/workbench/proof-pack-panel-helpers";
import type { DpmProofPackGatewayResponse } from "@/features/workbench/types";

type UseProofPackActionsInput = {
  initialProofPack: DpmProofPackGatewayResponse | null;
  contextProofPackId: string | null;
  contextRebalanceRunId: string | null;
  contextMandateId: string | null;
  mandateId?: string | null;
};

type UseProofPackActionsResult = {
  model: ProofPackPanelModel;
  proofPackId: string | null;
  rebalanceRunId: string | null;
  pendingAction: string | null;
  actionError: string | null;
  handoffStatus: string | null;
  markdown: string | null;
  generateProofPack: () => void;
  loadProofPack: () => void;
  loadMarkdown: () => void;
  loadReportInput: () => void;
  requestAiPmMemo: () => void;
};

export function useProofPackActions({
  initialProofPack,
  contextProofPackId,
  contextRebalanceRunId,
  contextMandateId,
  mandateId,
}: UseProofPackActionsInput): UseProofPackActionsResult {
  const [proofPack, setProofPack] = useState<DpmProofPackGatewayResponse | null>(initialProofPack);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const model = buildProofPackPanelModel(proofPack);
  const proofPackId = model.proofPackId !== "N/A" ? model.proofPackId : contextProofPackId;
  const rebalanceRunId =
    contextRebalanceRunId ?? (model.rebalanceRunId !== "N/A" ? model.rebalanceRunId : null);
  const resolvedMandateId =
    mandateId ?? contextMandateId ?? (model.mandateId !== "N/A" ? model.mandateId : null);

  async function runAction(label: string, action: () => Promise<void>) {
    if (pendingAction) {
      return;
    }
    setPendingAction(label);
    setActionError(null);
    try {
      await action();
    } catch (error) {
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
      setProofPack(await getDpmProofPack(proofPackId));
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
      setProofPack(generated);
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
    void runAction("Generate client report", async () => {
      const response = await getDpmProofPackReportInput(proofPackId);
      setHandoffStatus(
        `Client report ${response.supportability.report_input_available ? "ready for generation" : "not available"}.`
      );
    });
  }

  function requestAiPmMemo() {
    if (!proofPackId) {
      return;
    }
    void runAction("Open advisor memo", async () => {
      const response = await requestDpmProofPackAiPmMemo({ proofPackId });
      setHandoffStatus(`Advisor memo ${readProofPackAiWorkflowPackStatus(response.data)}`);
    });
  }

  return {
    model,
    proofPackId,
    rebalanceRunId,
    pendingAction,
    actionError,
    handoffStatus,
    markdown,
    generateProofPack,
    loadProofPack,
    loadMarkdown,
    loadReportInput,
    requestAiPmMemo,
  };
}
