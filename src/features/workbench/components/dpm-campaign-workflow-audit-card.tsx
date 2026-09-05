"use client";

import { useState } from "react";
import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
} from "@/design-system";
import { resolveDefaultCallerContext } from "@/features/workbench/caller-context";
import type {
  DpmCampaignWorkflowCommandInput,
  DpmCampaignWorkflowCommandType,
} from "@/features/workbench/dpm-campaign-command-contracts";
import {
  buildDpmCampaignWorkflowCommand,
  type DpmCampaignWorkflowCommandForm,
} from "@/features/workbench/dpm-campaign-workflow-command-builder";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignWorkflowEvidenceRow,
  DpmCampaignWorkflowSummaryRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import type { DpmCampaignWorkflowCommandEvidence } from "@/features/workbench/use-dpm-wave-command-center-actions";
import { MANAGE_WORKFLOW_LABELS } from "@/features/workbench/manage-terminology";

type Props = {
  evidenceRows: DpmCampaignWorkflowEvidenceRow[];
  error?: string | null;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  pendingCommand?: boolean;
  commandQueueBusy?: boolean;
  commandError?: string | null;
  commandEvidence?: DpmCampaignWorkflowCommandEvidence | null;
  commandRequiresReload?: boolean;
  evidenceRefreshing?: boolean;
  onReloadEvidence?: () => Promise<unknown> | unknown;
  onRecordWorkflowCommand: (command: DpmCampaignWorkflowCommandInput) => Promise<void>;
};

const COMMAND_OPTIONS: Array<{ value: DpmCampaignWorkflowCommandType; label: string }> = [
  { value: "approval_decision", label: "Record approval decision" },
  { value: "assignment_action", label: "Update responsibility" },
  { value: "assignment_task", label: "Open review task" },
  { value: "task_transition", label: "Progress review task" },
  { value: "maker_checker_control", label: "Record independent review" },
];

export default function DpmCampaignWorkflowAuditCard({
  evidenceRows,
  error,
  selectedCampaign,
  pendingCommand = false,
  commandQueueBusy = false,
  commandError = null,
  commandEvidence = null,
  commandRequiresReload = false,
  evidenceRefreshing = false,
  onReloadEvidence = async () => {},
  onRecordWorkflowCommand,
}: Props) {
  const callerContext = resolveDefaultCallerContext();
  const [form, setForm] = useState<DpmCampaignWorkflowCommandForm>({
    commandType: "assignment_task",
    actorId: callerContext.actorId,
    reference: "",
    rationale: "",
    assignedActorIds: "",
    approvalDecision: "APPROVED",
    assignmentAction: "ASSIGNED",
    assignmentTaskType: "ASSIGNMENT",
    taskTransition: "ACKNOWLEDGED",
    dueAt: "",
    escalationTier: "NONE",
    slaPosture: "ON_TRACK",
    controlAction: "SUBMITTED_FOR_REVIEW",
    controlOutcome: "PENDING",
    submitterActorId: callerContext.actorId,
    reviewerActorId: "",
  });
  const commandUnavailable = !selectedCampaign;
  const needsAssignee = campaignWorkflowNeedsAssignee(form);
  const needsEscalationTier =
    form.commandType === "task_transition" && form.taskTransition === "ESCALATED";
  const needsDueAt =
    form.commandType === "task_transition" && form.taskTransition === "DUE_DATE_CHANGED";
  const submitDisabled =
    commandUnavailable ||
    pendingCommand ||
    commandQueueBusy ||
    commandRequiresReload ||
    !form.actorId.trim() ||
    !form.reference.trim() ||
    !form.rationale.trim() ||
    (needsAssignee && !form.assignedActorIds.trim()) ||
    (needsEscalationTier && form.escalationTier === "NONE") ||
    (needsDueAt && !form.dueAt.trim());

  function updateForm<Key extends keyof DpmCampaignWorkflowCommandForm>(
    key: Key,
    value: DpmCampaignWorkflowCommandForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitCommand() {
    if (submitDisabled || !selectedCampaign) {
      return;
    }
    await onRecordWorkflowCommand(
      buildDpmCampaignWorkflowCommand({
        campaignId: selectedCampaign.campaignId,
        campaignVersion: selectedCampaign.campaignVersion,
        form,
      }),
    );
  }

  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-workflow-audit-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-workflow-audit-title">Governance action</h4>
          <p>Record one source-owned approval, responsibility, task, or independent-review event.</p>
        </div>
        <SemanticBadge tone={commandUnavailable ? "default" : commandError ? "warn" : "success"}>
          {commandUnavailable ? "Select a campaign" : commandError ? "Needs attention" : "Manage backed"}
        </SemanticBadge>
      </div>

      {selectedCampaign ? (
        <div className="rebalance-campaign-workflow-command" aria-label="Campaign governance action">
          <div className="rebalance-campaign-workflow-command-header">
            <div>
              <strong>{selectedCampaign.displayName}</strong>
              <span>Version {selectedCampaign.campaignVersion}</span>
            </div>
            <SemanticBadge tone={pendingCommand ? "warn" : "default"}>
              {pendingCommand ? "Recording" : selectedCampaign.governanceState}
            </SemanticBadge>
          </div>

          <div className="rebalance-campaign-workflow-command-grid">
            <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-command-type">
              Business action
              <select
                id="dpm-campaign-workflow-command-type"
                className="workbench-input"
                value={form.commandType}
                onChange={(event) => updateForm("commandType", event.target.value as DpmCampaignWorkflowCommandType)}
                disabled={pendingCommand || commandQueueBusy || commandRequiresReload}
              >
                {COMMAND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-actor">
              Responsible operator
              <input id="dpm-campaign-workflow-actor" className="workbench-input" value={form.actorId} readOnly />
            </label>
            <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-reference">
              {form.commandType === "task_transition" ? "Existing task reference" : "Governance reference"}
              <input
                id="dpm-campaign-workflow-reference"
                className="workbench-input"
                value={form.reference}
                onChange={(event) => updateForm("reference", event.target.value)}
                disabled={pendingCommand || commandQueueBusy || commandRequiresReload}
              />
            </label>
            <label className="workbench-field-label" htmlFor="dpm-campaign-workflow-rationale">
              Business rationale
              <textarea
                id="dpm-campaign-workflow-rationale"
                className="workbench-input"
                value={form.rationale}
                onChange={(event) => updateForm("rationale", event.target.value)}
                disabled={pendingCommand || commandQueueBusy || commandRequiresReload}
              />
            </label>
            <CommandSpecificFields
              form={form}
              updateForm={updateForm}
              disabled={pendingCommand || commandQueueBusy || commandRequiresReload}
            />
          </div>

          <div className="rebalance-campaign-workflow-command-row">
            <ActionButton priority="primary" onClick={submitCommand} disabled={submitDisabled}>
              {pendingCommand
                ? "Recording source evidence"
                : commandQueueBusy
                  ? "Another campaign action is in progress"
                : commandRequiresReload
                  ? "Reload evidence before another action"
                  : "Record governance action"}
            </ActionButton>
            <span>No trade, order, client-contact, or external workflow action is performed.</span>
          </div>
        </div>
      ) : (
        <ScreenStatePanel
          kind="empty"
          surface="portfolio"
          title="Select a campaign to act"
          body="Choose a Manage campaign definition to review its posture and record a governed action."
        />
      )}

      {commandError ? (
        <ScreenStatePanel kind="partial" surface="portfolio" title="Governance action was not recorded" body={commandError} />
      ) : null}
      {commandEvidence ? <CommandEvidence evidence={commandEvidence} /> : null}
      {error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign governance evidence needs attention"
          body={error}
          action={
            selectedCampaign ? (
              <SourceRefreshAction
                refreshScope={`campaign-governance:${selectedCampaign.key}`}
                idleLabel="Reload governance evidence"
                busyLabel="Reloading governance evidence"
                isRefreshing={evidenceRefreshing}
                onRefresh={async () => onReloadEvidence()}
              />
            ) : null
          }
        />
      ) : null}

      <details className="rebalance-campaign-disclosure">
        <summary>Source evidence and operating audit</summary>
        <p>Inspect source references, append-only workflow evidence, hashes, and boundaries.</p>
        <DpmCampaignWorkflowEvidenceTable rows={evidenceRows} />
      </details>
    </div>
  );
}

function CommandSpecificFields({
  form,
  updateForm,
  disabled,
}: {
  form: DpmCampaignWorkflowCommandForm;
  updateForm: <Key extends keyof DpmCampaignWorkflowCommandForm>(
    key: Key,
    value: DpmCampaignWorkflowCommandForm[Key],
  ) => void;
  disabled: boolean;
}) {
  const needsAssignee = campaignWorkflowNeedsAssignee(form);
  const needsDueAt =
    form.commandType === "task_transition" && form.taskTransition === "DUE_DATE_CHANGED";
  return (
    <>
      {form.commandType === "approval_decision" ? (
        <label className="workbench-field-label" htmlFor="dpm-campaign-approval-decision">
          Decision
          <select
            id="dpm-campaign-approval-decision"
            className="workbench-input"
            value={form.approvalDecision}
            onChange={(event) => updateForm("approvalDecision", event.target.value as typeof form.approvalDecision)}
            disabled={disabled}
          >
            <option value="APPROVED">Approve</option>
            <option value="REJECTED">Reject</option>
            <option value="REQUIRES_REMEDIATION">Require remediation</option>
          </select>
        </label>
      ) : null}
      {form.commandType === "assignment_action" ? (
        <label className="workbench-field-label" htmlFor="dpm-campaign-assignment-action">
          Responsibility update
          <select
            id="dpm-campaign-assignment-action"
            className="workbench-input"
            value={form.assignmentAction}
            onChange={(event) => updateForm("assignmentAction", event.target.value as typeof form.assignmentAction)}
            disabled={disabled}
          >
            <option value="ASSIGNED">Assign</option>
            <option value="REASSIGNED">Reassign</option>
            <option value="ESCALATED">Escalate</option>
            <option value="DEESCALATED">Reduce escalation</option>
            <option value="RESOLVED">Resolve</option>
          </select>
        </label>
      ) : null}
      {form.commandType === "assignment_task" ? (
        <label className="workbench-field-label" htmlFor="dpm-campaign-task-type">
          Review task
          <select
            id="dpm-campaign-task-type"
            className="workbench-input"
            value={form.assignmentTaskType}
            onChange={(event) => updateForm("assignmentTaskType", event.target.value as typeof form.assignmentTaskType)}
            disabled={disabled}
          >
            <option value="ASSIGNMENT">Responsibility assignment</option>
            <option value="APPROVAL_REMEDIATION">Approval remediation</option>
            <option value="ENTITLEMENT_REVIEW">Entitlement review</option>
            <option value="EXPIRY_REVIEW">Expiry review</option>
            <option value="ESCALATION">Escalation review</option>
          </select>
        </label>
      ) : null}
      {form.commandType === "task_transition" ? (
        <label className="workbench-field-label" htmlFor="dpm-campaign-task-transition">
          Task progress
          <select
            id="dpm-campaign-task-transition"
            className="workbench-input"
            value={form.taskTransition}
            onChange={(event) => updateForm("taskTransition", event.target.value as typeof form.taskTransition)}
            disabled={disabled}
          >
            <option value="ACKNOWLEDGED">Acknowledge</option>
            <option value="STARTED">Start review</option>
            <option value="BLOCKED">Mark blocked</option>
            <option value="UNBLOCKED">Clear blocker</option>
            <option value="RESOLVED">Resolve</option>
            <option value="CANCELLED">Cancel</option>
            <option value="REASSIGNED">Reassign</option>
            <option value="ESCALATED">Escalate</option>
            <option value="DUE_DATE_CHANGED">Change due date</option>
          </select>
        </label>
      ) : null}
      {needsAssignee ? (
        <>
          <label className="workbench-field-label" htmlFor="dpm-campaign-assignees">
            Responsible colleague IDs
            <input
              id="dpm-campaign-assignees"
              className="workbench-input"
              value={form.assignedActorIds}
              onChange={(event) => updateForm("assignedActorIds", event.target.value)}
              placeholder="Separate multiple IDs with commas"
              disabled={disabled}
            />
          </label>
          <label className="workbench-field-label" htmlFor="dpm-campaign-escalation">
            Escalation level
            <select
              id="dpm-campaign-escalation"
              className="workbench-input"
              value={form.escalationTier}
              onChange={(event) => updateForm("escalationTier", event.target.value as typeof form.escalationTier)}
              disabled={disabled}
            >
              <option value="NONE">No escalation</option>
              <option value="PM">Portfolio management</option>
              <option value="OPS">Operations</option>
              <option value="GOVERNANCE">Governance</option>
            </select>
          </label>
          <label className="workbench-field-label" htmlFor="dpm-campaign-sla">
            Service posture
            <select
              id="dpm-campaign-sla"
              className="workbench-input"
              value={form.slaPosture}
              onChange={(event) => updateForm("slaPosture", event.target.value as typeof form.slaPosture)}
              disabled={disabled}
            >
              <option value="ON_TRACK">On track</option>
              <option value="ATTENTION">{MANAGE_WORKFLOW_LABELS.needsAttention}</option>
              <option value="BREACHED_OR_BLOCKED">Breached or blocked</option>
            </select>
          </label>
        </>
      ) : null}
      {needsDueAt ? (
        <label className="workbench-field-label" htmlFor="dpm-campaign-task-due-at">
          New due date and time (UTC)
          <input
            id="dpm-campaign-task-due-at"
            className="workbench-input"
            type="datetime-local"
            value={form.dueAt}
            onChange={(event) => updateForm("dueAt", event.target.value)}
            disabled={disabled}
          />
        </label>
      ) : null}
      {form.commandType === "maker_checker_control" ? (
        <MakerCheckerFields form={form} updateForm={updateForm} disabled={disabled} />
      ) : null}
    </>
  );
}

function campaignWorkflowNeedsAssignee(form: DpmCampaignWorkflowCommandForm): boolean {
  return (
    form.commandType === "assignment_task" ||
    form.commandType === "assignment_action" ||
    (form.commandType === "task_transition" &&
      (form.taskTransition === "REASSIGNED" || form.taskTransition === "ESCALATED"))
  );
}

function MakerCheckerFields({
  form,
  updateForm,
  disabled,
}: {
  form: DpmCampaignWorkflowCommandForm;
  updateForm: <Key extends keyof DpmCampaignWorkflowCommandForm>(key: Key, value: DpmCampaignWorkflowCommandForm[Key]) => void;
  disabled: boolean;
}) {
  return (
    <>
      <label className="workbench-field-label" htmlFor="dpm-campaign-control-action">
        Independent-review step
        <select
          id="dpm-campaign-control-action"
          className="workbench-input"
          value={form.controlAction}
          onChange={(event) => updateForm("controlAction", event.target.value as typeof form.controlAction)}
          disabled={disabled}
        >
          <option value="SUBMITTED_FOR_REVIEW">Submit for review</option>
          <option value="REVIEWER_ASSIGNED">Assign reviewer</option>
          <option value="REVIEW_COMPLETED">Complete review</option>
          <option value="CONTROL_EXCEPTION_RAISED">Raise control exception</option>
          <option value="CONTROL_EXCEPTION_RESOLVED">Resolve control exception</option>
        </select>
      </label>
      <label className="workbench-field-label" htmlFor="dpm-campaign-control-outcome">
        Review outcome
        <select
          id="dpm-campaign-control-outcome"
          className="workbench-input"
          value={form.controlOutcome}
          onChange={(event) => updateForm("controlOutcome", event.target.value as typeof form.controlOutcome)}
          disabled={disabled}
        >
          <option value="PENDING">Pending</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
          <option value="EXCEPTION_OPEN">Exception open</option>
          <option value="EXCEPTION_RESOLVED">Exception resolved</option>
        </select>
      </label>
      <label className="workbench-field-label" htmlFor="dpm-campaign-maker">
        Submitting colleague
        <input id="dpm-campaign-maker" className="workbench-input" value={form.submitterActorId} onChange={(event) => updateForm("submitterActorId", event.target.value)} disabled={disabled} />
      </label>
      <label className="workbench-field-label" htmlFor="dpm-campaign-checker">
        Independent reviewer
        <input id="dpm-campaign-checker" className="workbench-input" value={form.reviewerActorId} onChange={(event) => updateForm("reviewerActorId", event.target.value)} disabled={disabled} />
      </label>
    </>
  );
}

function CommandEvidence({ evidence }: { evidence: DpmCampaignWorkflowCommandEvidence }) {
  return (
    <div className="rebalance-campaign-workflow-command-evidence" aria-label="Recorded campaign governance evidence" role="status">
      <MetricRow label="Recorded action" value={evidence.commandLabel} />
      <MetricRow label="Evidence reference" value={evidence.evidenceRef} />
      <MetricRow label="Source" value={evidence.sourceService} />
      <MetricRow label="Source status" value={evidence.upstreamStatus} />
      <MetricRow label="Correlation" value={evidence.correlationId} />
    </div>
  );
}

export function DpmCampaignWorkflowSummaryTable({
  rows,
}: {
  rows: DpmCampaignWorkflowSummaryRow[];
}) {
  return (
    <AnalyticsTable
      ariaLabel="Book-wide campaign workflow summary"
      variant="portfolio"
      density="compact"
      columns={[
        { key: "surface", label: "Business queue" },
        { key: "state", label: "State" },
        { key: "items", label: "Items", align: "right" },
        { key: "page", label: "Source window" },
        { key: "sources", label: "Sources", align: "right" },
        { key: "reasons", label: "Reason codes" },
        { key: "hash", label: "Content hash" },
        { key: "boundaries", label: "Operating boundaries" },
      ]}
      rows={rows.map((row) => ({
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
        title: "No book-wide workflow summary loaded",
        body: "Manage has not returned campaign workflow summary evidence for this source window.",
      }}
    />
  );
}

function DpmCampaignWorkflowEvidenceTable({
  rows,
}: {
  rows: DpmCampaignWorkflowEvidenceRow[];
}) {
  return (
    <AnalyticsTable
      ariaLabel="Selected campaign governance evidence history"
      variant="portfolio"
      density="compact"
      columns={[
        { key: "type", label: "Evidence" },
        { key: "ref", label: "Reference" },
        { key: "status", label: "Status" },
        { key: "actor", label: "Operator" },
        { key: "recorded", label: "Recorded" },
        { key: "reasons", label: "Reason codes" },
        { key: "sources", label: "Sources", align: "right" },
        { key: "hash", label: "Content hash" },
        { key: "transition", label: "Task progress" },
        { key: "boundaries", label: "Boundaries" },
      ]}
      rows={rows.map((row) => ({
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
        title: "No governance history loaded",
        body: "Approvals, responsibilities, tasks, and independent reviews remain source-owned in Manage.",
      }}
    />
  );
}
