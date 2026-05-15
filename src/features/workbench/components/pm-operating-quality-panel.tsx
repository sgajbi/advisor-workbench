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

type PmQualityActionError = {
  body: string;
  status: string;
  statusClass: string;
  source: string;
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

function buildActionError(error: unknown, fallback: string): PmQualityActionError {
  const message = error instanceof Error ? error.message : fallback;
  const status = resolveErrorStatus(message);
  return {
    body: message,
    status: status ?? "N/A",
    statusClass: status ? classifyStatus(status) : "unknown",
    source: "Gateway PM operating quality route",
  };
}

function buildBlockedActionError(message: string): PmQualityActionError {
  return {
    body: message,
    status: "N/A",
    statusClass: "blocked",
    source: "Manage action register via Gateway supportability",
  };
}

function resolveErrorStatus(message: string): string | null {
  return message.match(/\((\d{3})\)$/)?.[1] ?? null;
}

function classifyStatus(status: string): string {
  if (status === "401" || status === "403") {
    return "permission blocked";
  }
  if (status === "404" || status === "409" || status === "422") {
    return "business blocked";
  }
  if (status.startsWith("5")) {
    return "upstream unavailable";
  }
  return "request failed";
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
  const [actionError, setActionError] = useState<PmQualityActionError | null>(null);
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
    if (model.scoreRunPreviewReadinessState !== "READY") {
      setActionError(buildBlockedActionError(model.scoreRunPreviewReadiness));
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
      setActionError(buildActionError(error, "PM operating quality preview failed"));
    } finally {
      setPendingAction(false);
    }
  }

  async function previewFairnessAnalysis() {
    if (pendingFairnessAction) {
      return;
    }
    if (model.fairnessPreviewReadinessState !== "READY") {
      setActionError(buildBlockedActionError(model.fairnessPreviewReadiness));
      return;
    }
    if (model.policyId === "N/A" || model.policyVersion === "N/A") {
      setActionError(
        buildBlockedActionError(
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
        buildActionError(error, "PM operating quality fairness preview failed")
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
        <MetricRow label="Fairness Preview" value={model.fairnessAnalysisId} />
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
        <div className="pm-quality-primary-card">
          <div className="pm-quality-card-header">
            <Text as="h3" variant="subsectionTitle">
              Score-Run Evidence
            </Text>
            <div className="pm-quality-action-row">
              <ActionButton
                priority="secondary"
                onClick={previewScoreRun}
                disabled={pendingAction || model.scoreRunPreviewReadinessState !== "READY"}
              >
                {pendingAction ? "Previewing" : "Preview Score Run"}
              </ActionButton>
              <ActionButton
                priority="primary"
                onClick={previewFairnessAnalysis}
                disabled={
                  pendingFairnessAction ||
                  model.fairnessPreviewReadinessState !== "READY"
                }
              >
                {pendingFairnessAction ? "Checking" : "Preview Fairness"}
              </ActionButton>
            </div>
          </div>
          {actionMessage ? <Text variant="secondary">{actionMessage}</Text> : null}
          <div
            className="pm-quality-command-readiness"
            aria-label="PM operating quality command readiness"
          >
            <MetricRow label="Score Preview Command" value={model.scoreRunPreviewReadiness} />
            <MetricRow label="Fairness Preview Command" value={model.fairnessPreviewReadiness} />
            <MetricRow
              label="Execution Boundary"
              value="Gateway and Manage evidence only; no scoring, ranking, trade approval, order routing, or client contact in Workbench"
            />
          </div>
          {actionError ? (
            <div className="pm-quality-action-error" aria-label="PM operating quality action error posture">
              <MetricRow label="Status Class" value={actionError.statusClass} />
              <MetricRow label="Gateway Status" value={actionError.status} />
              <MetricRow label="Error Source" value={actionError.source} />
            </div>
          ) : null}
          <div className="pm-quality-operation-evidence" aria-label="PM operating quality Gateway operation evidence">
            <MetricRow label="Operation" value={model.operationEvidence.operation} />
            <MetricRow label="Correlation" value={model.operationEvidence.correlationId} />
            <MetricRow label="Contract" value={model.operationEvidence.contractVersion} />
            <MetricRow label="Source Service" value={model.operationEvidence.sourceService} />
            <MetricRow label="Upstream Status" value={model.operationEvidence.upstreamStatus} />
          </div>
          <AnalyticsTable
            ariaLabel="PM operating quality score runs"
            variant="analysis"
            density="compact"
            columns={[
              { key: "scoreRun", label: "Score Run" },
              { key: "pm", label: "PM / Book" },
              { key: "policy", label: "Policy" },
              { key: "asOf", label: "As Of" },
              { key: "state", label: "State" },
              { key: "score", label: "Score" },
              { key: "forbiddenUses", label: "Forbidden Uses" },
              { key: "source", label: "Source Refs" },
              { key: "reason", label: "Reason" },
            ]}
            rows={model.scoreRunRows.map((row) => ({
              key: row.key,
              cells: [
                <strong key={`${row.key}-id`}>{row.scoreRunId}</strong>,
                `${row.pmId} / ${row.bookId}`,
                row.policy,
                row.asOfDate,
                <SemanticBadge key={`${row.key}-state`} tone={toneForState(row.state)}>
                  {businessStateLabel(row.state)}
                </SemanticBadge>,
                row.score,
                row.forbiddenUses,
                row.sourceRefs,
                row.reasonCodes,
              ],
            }))}
            emptyState={{
              title: "No score runs returned",
              body: "Load or preview Manage score-run evidence before using score-run posture.",
            }}
          />
        </div>

        <aside className="pm-quality-governance-card">
          <Text as="h3" variant="subsectionTitle">
            Governance Posture
          </Text>
          <div className="pm-quality-governance-stack">
            <MetricRow label="Forbidden Uses" value={model.forbiddenUsePosture} />
            <MetricRow label="Score Preview Readiness" value={model.scoreRunPreviewReadiness} />
            <MetricRow label="Preview Readiness" value={model.fairnessPreviewReadiness} />
            <MetricRow label="Source Segments" value={String(model.fairnessSegmentRequests.length)} />
            <MetricRow label="Fairness Spread" value={model.fairnessSpread} />
            <MetricRow
              label="Blocked Actions"
              value={model.blockedActionPosture}
            />
            <MetricRow label="Policy Versions" value={String(model.policyRows.length)} />
            <Text variant="secondary">
              Workbench preserves Gateway and Manage evidence only. It does not rank PMs, calculate
              PM quality, approve trades, create HR or compensation decisions, or contact clients.
            </Text>
          </div>
        </aside>
      </div>

      <div className="pm-quality-evidence-grid">
        <div className="pm-quality-fairness-detail">
          <div className="pm-quality-card-header">
            <Text as="h3" variant="subsectionTitle">
              Fairness Preview Detail
            </Text>
            <SemanticBadge tone={toneForState(model.fairnessState)}>
              {businessStateLabel(model.fairnessState)}
            </SemanticBadge>
          </div>
          <div className="pm-quality-detail-grid">
            <MetricRow label="Product" value={model.fairnessDetail.product} />
            <MetricRow label="As Of" value={model.fairnessDetail.asOfDate} />
            <MetricRow
              label="Minimum Segment Runs"
              value={model.fairnessDetail.minimumSegmentScoreRunCount}
            />
            <MetricRow
              label="Maximum Governed Spread"
              value={model.fairnessDetail.maximumAverageScoreSpread}
            />
            <MetricRow
              label="Observed Spread"
              value={model.fairnessDetail.observedAverageScoreSpread}
            />
            <MetricRow label="Generated By" value={model.fairnessDetail.generatedBy} />
          </div>
          <div className="pm-quality-detail-stack">
            <MetricRow label="Generated At" value={model.fairnessDetail.generatedAt} />
            <MetricRow label="Analysis Source Refs" value={model.fairnessDetail.sourceRefs} />
            <MetricRow label="Analysis Reason Codes" value={model.fairnessDetail.reasonCodes} />
            <MetricRow label="Forbidden Use Boundary" value={model.fairnessDetail.forbiddenUses} />
          </div>
        </div>

        <AnalyticsTable
          ariaLabel="PM operating quality source segments"
          variant="analysis"
          density="compact"
          columns={[
            { key: "segment", label: "Source Segment" },
            { key: "type", label: "Type" },
            { key: "count", label: "Score Runs" },
            { key: "source", label: "Source Refs" },
          ]}
          rows={model.sourceSegmentRows.map((row) => ({
            key: row.key,
            cells: [
              <strong key={`${row.key}-segment`}>{row.segment}</strong>,
              row.segmentType,
              row.scoreRunCount,
              row.sourceRefs,
            ],
          }))}
          emptyState={{
            title: "No source-defined segments returned",
            body: "Workbench waits for Manage/Gateway segment assignments before enabling fairness review.",
          }}
        />

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
            { key: "range", label: "Score Range" },
            { key: "scoreRunRefs", label: "Score Run Refs" },
            { key: "source", label: "Source Refs" },
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
              `${row.minimumScore} / ${row.maximumScore}`,
              row.scoreRunRefs,
              row.sourceRefs,
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
      </div>

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
