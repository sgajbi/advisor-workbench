"use client";

import { useState } from "react";

import {
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import PmOperatingQualityFairnessEvidenceCard from "@/features/workbench/components/pm-operating-quality-fairness-evidence-card";
import PmOperatingQualityScoreRunCard from "@/features/workbench/components/pm-operating-quality-score-run-card";
import {
  createDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityScoreRun,
  requestDpmPmOperatingQualitySummary,
} from "@/features/workbench/api";
import {
  buildPmOperatingQualityPanelModel,
} from "@/features/workbench/pm-operating-quality-view-model";
import {
  formatPmQualityReasonCodeList,
  pmOperatingQualityStatePanelCopy,
} from "@/features/workbench/pm-operating-quality-panel-helpers";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "@/features/workbench/types";
import {
  businessStateLabel,
  formatBusinessReason,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";
import {
  buildPmQualityActionError,
  buildPmQualityBlockedActionError,
  buildPmQualityFairnessCreateEvidence,
  readPmQualityFairnessAnalysisId,
  type PmQualityActionError,
  type PmQualityFairnessCreateEvidence,
} from "@/features/workbench/pm-operating-quality-actions";

type Props = {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalyses?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetail?: DpmPmOperatingQualityGatewayResponse | null;
  policiesError?: string | null;
  scoreRunsError?: string | null;
  fairnessAnalysesError?: string | null;
  fairnessAnalysisDetailError?: string | null;
};

export default function PmOperatingQualityPanel({
  policies,
  scoreRuns,
  fairnessAnalyses = null,
  fairnessAnalysisDetail = null,
  policiesError = null,
  scoreRunsError = null,
  fairnessAnalysesError = null,
  fairnessAnalysisDetailError = null,
}: Props) {
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
    preview: previewResponse,
    fairnessPreview: fairnessPreviewResponse,
    summary: summaryResponse,
  });
  const stateCopy = pmOperatingQualityStatePanelCopy(model.state);
  const loadError =
    policiesError || scoreRunsError || fairnessAnalysesError || fairnessAnalysisDetailError;
  const shouldShowStatePanel =
    Boolean(loadError) ||
    Boolean(actionError) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "blocked" ||
    model.state === "unavailable";

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

  return (
    <SectionBlock
      title="PM Operating Quality"
      subtitle="Gateway-backed supervisory evidence for Manage-owned PM policy and score-run posture."
      className="pm-operating-quality-panel"
      actions={
        <div className="pm-quality-badge-row">
          <SemanticBadge tone={toneForState(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Manage authority</SemanticBadge>
          {model.fairnessAnalysisId !== "N/A" ? (
            <SemanticBadge tone={toneForState(model.fairnessState)}>
              Fairness {businessStateLabel(model.fairnessState)}
            </SemanticBadge>
          ) : null}
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={loadError || actionError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={loadError || actionError ? "PM operating quality needs attention" : stateCopy.title}
          body={loadError || actionError?.body || stateCopy.body}
        />
      ) : null}

      <div className="pm-quality-status-strip">
        <MetricRow label="Policy" value={`${model.policyId} / ${model.policyVersion}`} />
        <MetricRow label="Latest Score Run" value={model.scoreRunId} />
        <MetricRow label="Fairness Analysis" value={model.fairnessAnalysisId} />
        <MetricRow label="Returned Rows" value={model.count} />
        <MetricRow label="Authority" value={model.authority} />
      </div>

      <div className="pm-quality-reason-row">
        {model.reasonCodes.length > 0 ? (
          model.reasonCodes.map((reason) => (
            <SemanticBadge key={reason} tone={toneForState(reason)}>
              {formatBusinessReason(reason)}
            </SemanticBadge>
          ))
        ) : (
          <SemanticBadge>No reason codes returned</SemanticBadge>
        )}
      </div>

      <div className="pm-quality-workspace">
        <PmOperatingQualityScoreRunCard
          model={model}
          pendingScorePreview={pendingAction}
          pendingSummaryRequest={pendingSummaryAction}
          pendingFairnessPreview={pendingFairnessAction}
          pendingFairnessPersist={pendingFairnessCreateAction}
          actionMessage={actionMessage}
          actionError={actionError}
          fairnessCreateEvidence={fairnessCreateEvidence}
          onPreviewScoreRun={previewScoreRun}
          onRequestSupportSummary={requestSupportSummary}
          onPreviewFairness={previewFairnessAnalysis}
          onPersistFairness={createFairnessAnalysis}
        />

        <aside className="pm-quality-governance-card">
          <Text as="h3" variant="subsectionTitle">
            Governance Posture
          </Text>
          <div className="pm-quality-governance-stack">
            <MetricRow label="Forbidden Uses" value={model.forbiddenUsePosture} />
            <MetricRow label="Score Preview Readiness" value={model.scoreRunPreviewReadiness} />
            <MetricRow label="Summary Readiness" value={model.summaryRequestReadiness} />
            <MetricRow label="Preview Readiness" value={model.fairnessPreviewReadiness} />
            <MetricRow label="Source Segments" value={String(model.fairnessSegmentRequests.length)} />
            <MetricRow label="Persisted Analyses" value={String(model.fairnessAnalysisRows.length)} />
            <MetricRow label="Fairness Spread" value={model.fairnessSpread} />
            <MetricRow
              label="Blocked Actions"
              value={model.blockedActionPosture}
            />
            <MetricRow label="Policy Versions" value={String(model.policyRows.length)} />
            <Text variant="secondary">
              Workbench preserves Gateway, Manage, and review-gated AI evidence only. It does not
              rank PMs, calculate PM quality, construct prompts, approve trades, create HR or
              compensation decisions, operate OMS workflows, or contact clients.
            </Text>
          </div>
        </aside>
      </div>

      <PmOperatingQualityFairnessEvidenceCard model={model} />

      <AnalyticsTable
        ariaLabel="PM operating quality policies"
        variant="analysis"
        density="compact"
        columns={[
          { key: "policy", label: "Policy" },
          { key: "enabled", label: "Enabled" },
          { key: "state", label: "State" },
          { key: "asOf", label: "As Of" },
          { key: "reason", label: "Reason" },
        ]}
        rows={model.policyRows.map((row) => ({
          key: row.key,
          cells: [
            <strong key={`${row.key}-policy`}>{`${row.policyId} / ${row.policyVersion}`}</strong>,
            row.enabled,
            <SemanticBadge key={`${row.key}-state`} tone={toneForState(row.state)}>
              {businessStateLabel(row.state)}
            </SemanticBadge>,
            row.asOfDate,
            formatPmQualityReasonCodeList(row.reasonCodes),
          ],
        }))}
        emptyState={{
          title: "No PM operating quality policy returned",
          body: "A Manage-owned policy is required before score-run evidence can be used.",
        }}
      />
    </SectionBlock>
  );
}
