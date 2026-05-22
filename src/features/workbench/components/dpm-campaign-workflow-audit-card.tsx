"use client";

import { useState } from "react";
import { ActionButton, AnalyticsTable, MetricRow, ScreenStatePanel, SemanticBadge } from "@/design-system";
import { resolveDefaultCallerContext } from "@/features/workbench/caller-context";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignWorkflowEvidenceRow,
  DpmCampaignWorkflowSummaryRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import type {
  DpmCampaignWorkflowCommandEvidence,
  DpmCampaignWorkflowCommandInput,
  DpmCampaignWorkflowCommandType,
} from "@/features/workbench/use-dpm-wave-command-center-actions";

type Props = {
  summaryRows: DpmCampaignWorkflowSummaryRow[];
  evidenceRows: DpmCampaignWorkflowEvidenceRow[];
  error?: string | null;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  pendingCommand?: boolean;
  commandError?: string | null;
  commandEvidence?: DpmCampaignWorkflowCommandEvidence | null;
  onRecordWorkflowCommand: (command: DpmCampaignWorkflowCommandInput) => Promise<void>;
};

const COMMAND_OPTIONS: Array<{
  value: DpmCampaignWorkflowCommandType;
  label: string;
  referenceLabel: string;
}> = [
  {
    value: "approval_decision",
    label: "Approval Decision",
    referenceLabel: "Decision ref",
  },
  {
    value: "assignment_action",
    label: "Assignment Action",
    referenceLabel: "Action ref",
  },
  {
    value: "assignment_task",
    label: "Assignment Task",
    referenceLabel: "Task ref",
  },
  {
    value: "task_transition",
    label: "Task Transition",
    referenceLabel: "Task ref",
  },
  {
    value: "maker_checker_control",
    label: "Maker-Checker Control",
    referenceLabel: "Control ref",
  },
];

export default function DpmCampaignWorkflowAuditCard({
  summaryRows,
  evidenceRows,
  error,
  selectedCampaign,
  pendingCommand = false,
  commandError = null,
  commandEvidence = null,
  onRecordWorkflowCommand,
}: Props) {
  const callerContext = resolveDefaultCallerContext();
  const [commandType, setCommandType] =
    useState<DpmCampaignWorkflowCommandType>("assignment_task");
  const [actorId, setActorId] = useState(callerContext.actorId);
  const [reference, setReference] = useState("");
  const [transitionType, setTransitionType] = useState("MARK_SUPPORTABLE");
  const selectedOption = COMMAND_OPTIONS.find((option) => option.value === commandType)!;
  const commandUnavailable = !selectedCampaign;
  const referenceRequired = reference.trim().length === 0;
  const submitDisabled = commandUnavailable || pendingCommand || referenceRequired;

  async function submitCommand() {
    if (submitDisabled) {
      return;
    }
    await onRecordWorkflowCommand(
      buildCampaignWorkflowCommand({
        commandType,
        actorId: actorId.trim(),
        reference: reference.trim(),
        transitionType,
      })
    );
  }

  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-workflow-audit-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-workflow-audit-title">Campaign Workflow Audit</h4>
          <p>Manage-owned operating queue, approval, assignment, and maker-checker evidence.</p>
        </div>
        <SemanticBadge tone={error ? "warn" : summaryRows.length || evidenceRows.length ? "success" : "default"}>
          {error ? "Needs attention" : summaryRows.length || evidenceRows.length ? "Loaded" : "Not loaded"}
        </SemanticBadge>
      </div>
      {error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign workflow evidence needs attention"
          body={error}
        />
      ) : null}
      <div
        className="rebalance-campaign-workflow-command"
        aria-label="DPM campaign workflow command control"
      >
        <div className="rebalance-campaign-workflow-command-header">
          <div>
            <strong>Workflow Evidence Control</strong>
            <span>
              {selectedCampaign
                ? `${selectedCampaign.displayName} version ${selectedCampaign.campaignVersion}`
                : "Select a Manage campaign definition"}
            </span>
          </div>
          <SemanticBadge tone={commandUnavailable ? "default" : commandError ? "warn" : "success"}>
            {commandUnavailable ? "Unavailable" : commandError ? "Needs attention" : "Gateway backed"}
          </SemanticBadge>
        </div>
        <div className="rebalance-campaign-workflow-command-grid">
          <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-command-type">
            Command
            <select
              id="dpm-campaign-workflow-command-type"
              className="workbench-input"
              value={commandType}
              onChange={(event) => setCommandType(event.target.value as DpmCampaignWorkflowCommandType)}
              disabled={pendingCommand}
            >
              {COMMAND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-actor">
            Actor
            <input
              id="dpm-campaign-workflow-actor"
              className="workbench-input"
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              disabled={pendingCommand}
            />
          </label>
          <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-reference">
            {selectedOption.referenceLabel}
            <input
              id="dpm-campaign-workflow-reference"
              className="workbench-input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={pendingCommand}
            />
          </label>
          <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-transition">
            Transition
            <select
              id="dpm-campaign-workflow-transition"
              className="workbench-input"
              value={transitionType}
              onChange={(event) => setTransitionType(event.target.value)}
              disabled={pendingCommand || commandType !== "task_transition"}
            >
              <option value="MARK_SUPPORTABLE">Mark supportable</option>
              <option value="REQUEST_EVIDENCE_REVIEW">Request evidence review</option>
              <option value="RETURN_FOR_SOURCE_REVIEW">Return for source review</option>
            </select>
          </label>
        </div>
        <div className="rebalance-campaign-workflow-command-row">
          <ActionButton priority="secondary" onClick={submitCommand} disabled={submitDisabled}>
            {pendingCommand ? "Recording" : "Record Workflow Evidence"}
          </ActionButton>
          <span>
            Source evidence only; no order, OMS, client-contact, or external workflow action is
            enabled.
          </span>
        </div>
        {commandError ? (
          <ScreenStatePanel
            kind="partial"
            surface="portfolio"
            title="Campaign workflow command needs attention"
            body={commandError}
          />
        ) : null}
        {commandEvidence ? (
          <div
            className="rebalance-campaign-workflow-command-evidence"
            aria-label="DPM campaign workflow command evidence"
          >
            <MetricRow label="Command" value={commandEvidence.commandLabel} />
            <MetricRow label="Evidence Ref" value={commandEvidence.evidenceRef} />
            <MetricRow label="Correlation" value={commandEvidence.correlationId} />
            <MetricRow label="Source" value={commandEvidence.sourceService} />
            <MetricRow label="Upstream" value={commandEvidence.upstreamStatus} />
            <MetricRow label="Content Hash" value={commandEvidence.contentHash} />
            <MetricRow label="Reason Codes" value={commandEvidence.reasonCodes} />
            <MetricRow label="Boundaries" value={commandEvidence.operatingBoundaries} />
          </div>
        ) : null}
      </div>
      <AnalyticsTable
        ariaLabel="DPM campaign workflow audit summary"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "surface", label: "Surface" },
          { key: "state", label: "State" },
          { key: "items", label: "Items", align: "right" },
          { key: "page", label: "Page" },
          { key: "sources", label: "Source Refs", align: "right" },
          { key: "reasons", label: "Reason Codes" },
          { key: "hash", label: "Content Hash" },
          { key: "boundaries", label: "Operating Boundaries" },
        ]}
        rows={summaryRows.map((row) => ({
          key: row.key,
          cells: [
            row.surface,
            <DpmWaveStateBadge key={`${row.key}-state`} state={row.state} />,
            row.itemCount,
            row.page,
            row.sourceRefs,
            row.reasonCodes,
            row.contentHash,
            row.operatingBoundaries,
          ],
        }))}
        emptyState={{
          title: "No campaign workflow summary loaded",
          body: "Gateway has not returned Manage campaign workflow audit summary evidence.",
        }}
      />
      <AnalyticsTable
        ariaLabel="DPM campaign workflow evidence"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "type", label: "Evidence Type" },
          { key: "ref", label: "Reference" },
          { key: "status", label: "Status" },
          { key: "actor", label: "Actor" },
          { key: "recorded", label: "Recorded" },
          { key: "reasons", label: "Reason Codes" },
          { key: "sources", label: "Source Refs", align: "right" },
          { key: "hash", label: "Content Hash" },
          { key: "transition", label: "Task Transition" },
          { key: "boundaries", label: "Boundaries" },
        ]}
        rows={evidenceRows.map((row) => ({
          key: row.key,
          cells: [
            row.evidenceType,
            row.evidenceRef,
            <DpmWaveStateBadge key={`${row.key}-status`} state={row.status} />,
            row.actor,
            row.recordedAt,
            row.reasonCodes,
            row.sourceRefs,
            row.contentHash,
            row.transitionPosture,
            row.operatingBoundaries,
          ],
        }))}
        emptyState={{
          title: "No campaign workflow evidence loaded",
          body: "Approval decisions, assignment actions, assignment tasks, and maker-checker controls remain source-owned in Manage.",
        }}
      />
    </div>
  );
}

function buildCampaignWorkflowCommand(params: {
  commandType: DpmCampaignWorkflowCommandType;
  actorId: string;
  reference: string;
  transitionType: string;
}): DpmCampaignWorkflowCommandInput {
  const actorId = params.actorId || resolveDefaultCallerContext().actorId;
  switch (params.commandType) {
    case "approval_decision":
      return {
        commandType: params.commandType,
        body: {
          decision_ref: params.reference,
          decision_type: "WORKFLOW_REVIEW_RECORDED",
          actor_id: actorId,
          reason_codes: ["WORKBENCH_CAMPAIGN_APPROVAL_DECISION_RECORDED"],
        },
      };
    case "assignment_action":
      return {
        commandType: params.commandType,
        body: {
          action_ref: params.reference,
          action_type: "ASSIGN_FOR_REVIEW",
          actor_id: actorId,
          reason_codes: ["WORKBENCH_CAMPAIGN_ASSIGNMENT_ACTION_RECORDED"],
        },
      };
    case "assignment_task":
      return {
        commandType: params.commandType,
        body: {
          task_ref: params.reference,
          actor_id: actorId,
          reason_codes: ["WORKBENCH_CAMPAIGN_ASSIGNMENT_TASK_RECORDED"],
        },
      };
    case "task_transition":
      return {
        commandType: params.commandType,
        taskRef: params.reference,
        body: {
          transition_type: params.transitionType,
          actor_id: actorId,
        },
      };
    case "maker_checker_control":
      return {
        commandType: params.commandType,
        body: {
          control_ref: params.reference,
          control_type: "MAKER_CHECKER_REVIEW",
          actor_id: actorId,
          reason_codes: ["WORKBENCH_CAMPAIGN_MAKER_CHECKER_CONTROL_RECORDED"],
        },
      };
  }
}
