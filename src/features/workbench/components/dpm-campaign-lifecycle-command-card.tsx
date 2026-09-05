"use client";

import { useState } from "react";
import {
  ActionButton,
  MetricRow,
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
} from "@/design-system";
import { resolveDefaultCallerContext } from "@/features/workbench/caller-context";
import {
  buildCampaignCommandCorrelationId,
  type DpmCampaignLifecycleCommandInput,
  type DpmCampaignLifecycleCommandType,
} from "@/features/workbench/dpm-campaign-command-contracts";
import type { DpmCampaignDefinitionRow } from "@/features/workbench/dpm-wave-command-center-view-model";
import type { DpmCampaignLifecycleCommandEvidence } from "@/features/workbench/use-dpm-wave-command-center-actions";

type Props = {
  selectedCampaign: DpmCampaignDefinitionRow | null;
  availableCampaigns?: DpmCampaignDefinitionRow[];
  pendingCommand?: boolean;
  commandQueueBusy?: boolean;
  commandError?: string | null;
  commandEvidence?: DpmCampaignLifecycleCommandEvidence | null;
  evidenceError?: string | null;
  evidenceRefreshing?: boolean;
  onReloadEvidence?: () => Promise<unknown> | unknown;
  onRecordLifecycleCommand: (command: DpmCampaignLifecycleCommandInput) => Promise<void>;
};

export default function DpmCampaignLifecycleCommandCard({
  selectedCampaign,
  availableCampaigns = [],
  pendingCommand = false,
  commandQueueBusy = false,
  commandError = null,
  commandEvidence = null,
  evidenceError = null,
  evidenceRefreshing = false,
  onReloadEvidence = async () => {},
  onRecordLifecycleCommand,
}: Props) {
  const callerContext = resolveDefaultCallerContext();
  const actorId = callerContext.actorId;
  const [commandType, setCommandType] = useState<DpmCampaignLifecycleCommandType>("retire");
  const [reason, setReason] = useState("");
  const [replacementCampaignVersion, setReplacementCampaignVersion] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const replacementVersions = availableCampaigns.filter(
    (row) =>
      row.campaignId === selectedCampaign?.campaignId &&
      row.campaignVersion !== selectedCampaign?.campaignVersion &&
      row.status === "ACTIVE",
  );

  const submitDisabled =
    !selectedCampaign ||
    pendingCommand ||
    commandQueueBusy ||
    Boolean(commandEvidence) ||
    !actorId.trim() ||
    !reason.trim() ||
    !confirmed ||
    (commandType === "supersede" && !replacementCampaignVersion);

  async function submitCommand() {
    if (submitDisabled || !selectedCampaign) return;
    const correlationId = buildCampaignCommandCorrelationId({
      command: commandType,
      campaignId: selectedCampaign.campaignId,
      campaignVersion: selectedCampaign.campaignVersion,
    });
    const command: DpmCampaignLifecycleCommandInput =
      commandType === "retire"
        ? {
            commandType,
            body: {
              retired_by: actorId.trim(),
              retirement_reason: reason.trim(),
              correlation_id: correlationId,
            },
          }
        : {
            commandType,
            body: {
              superseded_by_campaign_version: replacementCampaignVersion,
              superseded_by: actorId.trim(),
              supersession_reason: reason.trim(),
              correlation_id: correlationId,
            },
          };
    await onRecordLifecycleCommand(command);
  }

  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-lifecycle-command-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-lifecycle-command-title">Lifecycle control</h4>
          <p>Retire this campaign or replace it with an existing active version.</p>
        </div>
        <SemanticBadge tone={!selectedCampaign ? "default" : commandError ? "warn" : "danger"}>
          {!selectedCampaign ? "Select a campaign" : commandError ? "Needs attention" : "Consequence review"}
        </SemanticBadge>
      </div>
      {selectedCampaign ? (
        <div className="rebalance-campaign-workflow-command-grid">
          <label className="workbench-field-label" htmlFor="dpm-campaign-lifecycle-action">
            Lifecycle action
            <select
              id="dpm-campaign-lifecycle-action"
              className="workbench-input"
              value={commandType}
              onChange={(event) => {
                setCommandType(event.target.value as DpmCampaignLifecycleCommandType);
                setConfirmed(false);
              }}
              disabled={pendingCommand || commandQueueBusy || Boolean(commandEvidence)}
            >
              <option value="retire">Retire future use</option>
              <option value="supersede">Replace with active version</option>
            </select>
          </label>
          <label className="workbench-field-label" htmlFor="dpm-campaign-lifecycle-actor">
            Responsible operator
            <input id="dpm-campaign-lifecycle-actor" className="workbench-input" value={actorId} readOnly />
          </label>
          {commandType === "supersede" ? (
            <label className="workbench-field-label" htmlFor="dpm-campaign-replacement-version">
              Active replacement version
              <select
                id="dpm-campaign-replacement-version"
                className="workbench-input"
                value={replacementCampaignVersion}
                onChange={(event) => setReplacementCampaignVersion(event.target.value)}
                disabled={
                  pendingCommand || commandQueueBusy || Boolean(commandEvidence) || replacementVersions.length === 0
                }
              >
                <option value="">Select an active version</option>
                {replacementVersions.map((row) => (
                  <option key={row.key} value={row.campaignVersion}>{row.campaignVersion} · {row.displayName}</option>
                ))}
              </select>
              {replacementVersions.length === 0 ? <span>No active replacement version is available.</span> : null}
            </label>
          ) : null}
          <label className="workbench-field-label" htmlFor="dpm-campaign-lifecycle-reason">
            Business rationale
            <textarea
              id="dpm-campaign-lifecycle-reason"
              className="workbench-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={pendingCommand || commandQueueBusy || Boolean(commandEvidence)}
            />
          </label>
          <label className="workbench-confirmation" htmlFor="dpm-campaign-lifecycle-confirmation">
            <input
              id="dpm-campaign-lifecycle-confirmation"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={pendingCommand || commandQueueBusy || Boolean(commandEvidence)}
            />
            <span>
              I understand this prevents future launches from the selected version and records an append-only source event.
            </span>
          </label>
        </div>
      ) : null}
      <div className="rebalance-campaign-workflow-command-row">
        <ActionButton priority="secondary" onClick={submitCommand} disabled={submitDisabled}>
          {pendingCommand
            ? "Recording lifecycle event"
            : commandQueueBusy
              ? "Another campaign action is in progress"
            : commandEvidence
              ? "Lifecycle action recorded"
              : commandType === "retire"
                ? "Retire campaign"
                : "Replace campaign version"}
        </ActionButton>
        <span>No trade, order, OMS, or client-contact action is performed.</span>
      </div>
      {commandError ? <ScreenStatePanel kind="partial" surface="portfolio" title="Lifecycle action was not recorded" body={commandError} /> : null}
      {commandEvidence ? (
        <div className="rebalance-campaign-workflow-command-evidence" aria-label="Recorded campaign lifecycle evidence" role="status">
          <MetricRow label="Recorded action" value={commandEvidence.commandLabel} />
          <MetricRow label="Status" value={commandEvidence.status} />
          <MetricRow label="Operator" value={commandEvidence.actor} />
          <MetricRow label="Rationale" value={commandEvidence.reason} />
          <MetricRow label="Replacement version" value={commandEvidence.replacementCampaignVersion} />
          <MetricRow label="Source" value={commandEvidence.sourceService} />
          <MetricRow label="Correlation" value={commandEvidence.correlationId} />
        </div>
      ) : null}
      {evidenceError && selectedCampaign ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title={
            commandEvidence
              ? "Recorded lifecycle posture needs refresh"
              : "Campaign lifecycle evidence needs attention"
          }
          body={evidenceError}
          action={
            <SourceRefreshAction
              refreshScope={`campaign-lifecycle:${selectedCampaign.key}`}
              idleLabel="Reload lifecycle evidence"
              busyLabel="Reloading lifecycle evidence"
              isRefreshing={evidenceRefreshing}
              onRefresh={async () => onReloadEvidence()}
            />
          }
        />
      ) : null}
    </div>
  );
}
