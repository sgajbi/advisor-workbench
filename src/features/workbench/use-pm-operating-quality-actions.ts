"use client";

import { useState } from "react";
import {
  createDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityScoreRun,
  requestDpmPmOperatingQualitySummary,
} from "@/features/workbench/api";
import {
  buildPmQualityActionError,
  buildPmQualityBlockedActionError,
  buildPmQualityFairnessCreateEvidence,
  readPmQualityFairnessAnalysisId,
  type PmQualityActionError,
  type PmQualityFairnessCreateEvidence,
} from "@/features/workbench/pm-operating-quality-actions";
import {
  buildPmOperatingQualityPanelModel,
  type PmOperatingQualityPanelModel,
} from "@/features/workbench/pm-operating-quality-view-model";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "@/features/workbench/types";

type UsePmOperatingQualityActionsInput = {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalyses?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetail?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActions?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActionDetail?: DpmPmOperatingQualityGatewayResponse | null;
};

type UsePmOperatingQualityActionsResult = {
  model: PmOperatingQualityPanelModel;
  pendingAction: boolean;
  pendingFairnessAction: boolean;
  pendingFairnessCreateAction: boolean;
  pendingSummaryAction: boolean;
  actionError: PmQualityActionError | null;
  actionMessage: string | null;
  fairnessCreateEvidence: PmQualityFairnessCreateEvidence | null;
  previewScoreRun: () => Promise<void>;
  previewFairnessAnalysis: () => Promise<void>;
  createFairnessAnalysis: () => Promise<void>;
  requestSupportSummary: () => Promise<void>;
};

export function usePmOperatingQualityActions({
  policies,
  scoreRuns,
  fairnessAnalyses = null,
  fairnessAnalysisDetail = null,
  reviewActions = null,
  reviewActionDetail = null,
}: UsePmOperatingQualityActionsInput): UsePmOperatingQualityActionsResult {
  const [previewResponse, setPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [fairnessPreviewResponse, setFairnessPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [createdFairnessAnalysisResponse, setCreatedFairnessAnalysisResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [fairnessCreateEvidence, setFairnessCreateEvidence] =
    useState<PmQualityFairnessCreateEvidence | null>(null);
  const [summaryResponse, setSummaryResponse] =
    useState<DpmPmOperatingQualitySummaryResponse | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [pendingFairnessAction, setPendingFairnessAction] = useState(false);
  const [pendingFairnessCreateAction, setPendingFairnessCreateAction] = useState(false);
  const [pendingSummaryAction, setPendingSummaryAction] = useState(false);
  const [actionError, setActionError] = useState<PmQualityActionError | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const model = buildPmOperatingQualityPanelModel({
    policies,
    scoreRuns,
    fairnessAnalyses,
    fairnessAnalysisDetail: createdFairnessAnalysisResponse ?? fairnessAnalysisDetail,
    reviewActions,
    reviewActionDetail,
    preview: previewResponse,
    fairnessPreview: fairnessPreviewResponse,
    summary: summaryResponse,
  });

  async function previewScoreRun() {
    if (pendingAction) {
      return;
    }
    if (model.scoreRunPreviewReadinessState !== "READY") {
      setActionError(buildPmQualityBlockedActionError(model.scoreRunPreviewReadiness));
      return;
    }
    setPendingAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await previewDpmPmOperatingQualityScoreRun({
        policyId: model.policyId !== "N/A" ? model.policyId : undefined,
        policyVersion: model.policyVersion !== "N/A" ? model.policyVersion : undefined,
      });
      setPreviewResponse(response);
      setActionMessage("Preview returned Manage operating-quality evidence.");
    } catch (error) {
      setActionError(buildPmQualityActionError(error, "PM operating quality preview failed"));
    } finally {
      setPendingAction(false);
    }
  }

  async function previewFairnessAnalysis() {
    if (pendingFairnessAction) {
      return;
    }
    if (model.fairnessPreviewReadinessState !== "READY") {
      setActionError(buildPmQualityBlockedActionError(model.fairnessPreviewReadiness));
      return;
    }
    if (model.policyId === "N/A" || model.policyVersion === "N/A") {
      setActionError(
        buildPmQualityBlockedActionError(
          "PM operating quality policy id/version is required for fairness preview."
        )
      );
      return;
    }
    setPendingFairnessAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await previewDpmPmOperatingQualityFairnessAnalysis({
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        asOfDate: model.fairnessAsOfDate !== "N/A" ? model.fairnessAsOfDate : undefined,
        segments: model.fairnessSegmentRequests,
      });
      setFairnessPreviewResponse(response);
      setActionMessage("Fairness preview returned Manage segment evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality fairness preview failed")
      );
    } finally {
      setPendingFairnessAction(false);
    }
  }

  async function createFairnessAnalysis() {
    if (pendingFairnessCreateAction) {
      return;
    }
    if (model.fairnessPreviewReadinessState !== "READY") {
      setActionError(buildPmQualityBlockedActionError(model.fairnessPreviewReadiness));
      return;
    }
    if (model.policyId === "N/A" || model.policyVersion === "N/A") {
      setActionError(
        buildPmQualityBlockedActionError(
          "PM operating quality policy id/version is required for fairness analysis persistence."
        )
      );
      return;
    }
    setPendingFairnessCreateAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await createDpmPmOperatingQualityFairnessAnalysis({
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        asOfDate: model.fairnessAsOfDate !== "N/A" ? model.fairnessAsOfDate : undefined,
        segments: model.fairnessSegmentRequests,
      });
      setCreatedFairnessAnalysisResponse(response);
      setFairnessCreateEvidence(buildPmQualityFairnessCreateEvidence(response));
      const fairnessAnalysisId = readPmQualityFairnessAnalysisId(response);
      if (fairnessAnalysisId) {
        const detail = await getDpmPmOperatingQualityFairnessAnalysis(
          fairnessAnalysisId,
          "client"
        );
        setCreatedFairnessAnalysisResponse(detail);
      }
      setActionMessage("Persisted fairness analysis returned Manage evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(
          error,
          "PM operating quality fairness analysis persistence failed"
        )
      );
    } finally {
      setPendingFairnessCreateAction(false);
    }
  }

  async function requestSupportSummary() {
    if (pendingSummaryAction) {
      return;
    }
    if (model.summaryRequestReadinessState !== "READY" || !model.selectedScoreRun) {
      setActionError(buildPmQualityBlockedActionError(model.summaryRequestReadiness));
      return;
    }
    setPendingSummaryAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await requestDpmPmOperatingQualitySummary({
        scoreRunId: model.selectedScoreRun.scoreRunId,
      });
      setSummaryResponse(response);
      setActionMessage("Support summary returned review-required PM quality evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality support summary request failed")
      );
    } finally {
      setPendingSummaryAction(false);
    }
  }

  return {
    model,
    pendingAction,
    pendingFairnessAction,
    pendingFairnessCreateAction,
    pendingSummaryAction,
    actionError,
    actionMessage,
    fairnessCreateEvidence,
    previewScoreRun,
    previewFairnessAnalysis,
    createFairnessAnalysis,
    requestSupportSummary,
  };
}
