"use client";

import { useState } from "react";

import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import {
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityScoreRun,
} from "@/features/workbench/api";
import {
  buildPmOperatingQualityPanelModel,
  type PmOperatingQualityPanelState,
} from "@/features/workbench/pm-operating-quality-view-model";
import type { DpmPmOperatingQualityGatewayResponse } from "@/features/workbench/types";
import {
  businessStateLabel,
  formatBusinessReason,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  policiesError?: string | null;
  scoreRunsError?: string | null;
};

function statePanelCopy(state: PmOperatingQualityPanelState) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No PM operating quality evidence returned",
      body: "No policy or score-run evidence is currently available for this PM book.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial" as const,
      title: "PM operating quality evidence is partial",
      body: "Some policy or score-run inputs require review before a persisted score run is used.",
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "PM operating quality action is blocked",
      body: "Manage has published blocked actions for this PM operating quality posture.",
    };
  }
  return {
    kind: "unavailable" as const,
    title: "PM operating quality is unavailable",
    body: "PM operating quality evidence could not be loaded from Gateway.",
  };
}

export default function PmOperatingQualityPanel({
  policies,
  scoreRuns,
  policiesError = null,
  scoreRunsError = null,
}: Props) {
  const [previewResponse, setPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [fairnessPreviewResponse, setFairnessPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [pendingFairnessAction, setPendingFairnessAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const model = buildPmOperatingQualityPanelModel({
    policies,
    scoreRuns,
    preview: previewResponse,
    fairnessPreview: fairnessPreviewResponse,
  });
  const stateCopy = statePanelCopy(model.state);
  const loadError = policiesError || scoreRunsError;
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
      setActionError(error instanceof Error ? error.message : "PM operating quality preview failed");
    } finally {
      setPendingAction(false);
    }
  }

  async function previewFairnessAnalysis() {
    if (pendingFairnessAction || model.fairnessSegmentRequests.length < 2) {
      return;
    }
    if (model.policyId === "N/A" || model.policyVersion === "N/A") {
      setActionError("PM operating quality policy id/version is required for fairness preview.");
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
        error instanceof Error ? error.message : "PM operating quality fairness preview failed"
      );
    } finally {
      setPendingFairnessAction(false);
    }
  }

  return (
    <SectionBlock
      title="PM Operating Quality"
      subtitle="Gateway-backed supervisory evidence for Manage-owned PM policy and score-run posture."
      className="pm-operating-quality-panel"
      actions={
        <div className="portfolio-memory-badge-row">
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
          body={loadError || actionError || stateCopy.body}
        />
      ) : null}

      <div className="portfolio-memory-status-strip">
        <MetricRow label="Policy" value={`${model.policyId} / ${model.policyVersion}`} />
        <MetricRow label="Latest Score Run" value={model.scoreRunId} />
        <MetricRow label="Fairness Preview" value={model.fairnessAnalysisId} />
        <MetricRow label="Returned Rows" value={model.count} />
        <MetricRow label="Authority" value={model.authority} />
      </div>

      <div className="portfolio-memory-reason-row">
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

      <div className="portfolio-memory-workspace">
        <div className="portfolio-memory-timeline-card">
          <div className="portfolio-memory-card-header">
            <Text as="h3" variant="subsectionTitle">
              Score-Run Evidence
            </Text>
            <ActionButton
              priority="secondary"
              onClick={previewScoreRun}
              disabled={pendingAction || model.blockedActions.includes("PREVIEW_SCORE_RUN")}
            >
              {pendingAction ? "Previewing" : "Preview"}
            </ActionButton>
            <ActionButton
              priority="secondary"
              onClick={previewFairnessAnalysis}
              disabled={
                pendingFairnessAction ||
                model.blockedActions.includes("PREVIEW_FAIRNESS_ANALYSIS") ||
                model.fairnessSegmentRequests.length < 2
              }
            >
              {pendingFairnessAction ? "Checking" : "Preview Fairness"}
            </ActionButton>
          </div>
          {actionMessage ? <Text variant="secondary">{actionMessage}</Text> : null}
          <AnalyticsTable
            ariaLabel="PM operating quality score runs"
            variant="analysis"
            density="compact"
            columns={[
              { key: "scoreRun", label: "Score Run" },
              { key: "pm", label: "PM / Book" },
              { key: "policy", label: "Policy" },
              { key: "state", label: "State" },
              { key: "score", label: "Score" },
              { key: "reason", label: "Reason" },
            ]}
            rows={model.scoreRunRows.map((row) => ({
              key: row.key,
              cells: [
                <strong key={`${row.key}-id`}>{row.scoreRunId}</strong>,
                `${row.pmId} / ${row.bookId}`,
                row.policy,
                <SemanticBadge key={`${row.key}-state`} tone={toneForState(row.state)}>
                  {businessStateLabel(row.state)}
                </SemanticBadge>,
                row.score,
                row.reasonCodes,
              ],
            }))}
            emptyState={{
              title: "No score runs returned",
              body: "Preview or create a Manage score run before using score-run evidence.",
            }}
          />
        </div>

        <aside className="portfolio-memory-actions-card">
          <Text as="h3" variant="subsectionTitle">
            Governance Posture
          </Text>
          <div className="portfolio-memory-action-stack">
            <MetricRow label="Forbidden Uses" value={model.forbiddenUsePosture} />
            <MetricRow label="Source Segments" value={String(model.fairnessSegmentRequests.length)} />
            <MetricRow label="Fairness Spread" value={model.fairnessSpread} />
            <MetricRow
              label="Blocked Actions"
              value={model.blockedActions.length ? model.blockedActions.join(", ") : "None"}
            />
            <MetricRow label="Policy Versions" value={String(model.policyRows.length)} />
            <Text variant="secondary">
              Workbench preserves Gateway and Manage evidence only. It does not rank PMs, calculate
              PM quality, approve trades, create HR or compensation decisions, or contact clients.
            </Text>
          </div>
        </aside>
      </div>

      <AnalyticsTable
        ariaLabel="PM operating quality fairness segments"
        variant="analysis"
        density="compact"
        columns={[
          { key: "segment", label: "Segment" },
          { key: "type", label: "Type" },
          { key: "state", label: "State" },
          { key: "count", label: "Score Runs" },
          { key: "average", label: "Average Score" },
          { key: "reason", label: "Reason" },
        ]}
        rows={model.fairnessSegmentRows.map((row) => ({
          key: row.key,
          cells: [
            <strong key={`${row.key}-segment`}>{row.segment}</strong>,
            row.segmentType,
            <SemanticBadge key={`${row.key}-state`} tone={toneForState(row.state)}>
              {businessStateLabel(row.state)}
            </SemanticBadge>,
            row.scoreRunCount,
            row.averageScore,
            row.reasonCodes,
          ],
        }))}
        emptyState={{
          title: "No fairness segment preview returned",
          body:
            model.fairnessSegmentRequests.length >= 2
              ? "Run a Manage fairness preview to inspect source-defined segment posture."
              : "Manage has not returned source-defined segment assignments for a fairness preview.",
        }}
      />

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
            row.reasonCodes,
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
