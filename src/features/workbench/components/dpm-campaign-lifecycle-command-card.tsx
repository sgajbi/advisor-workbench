"use client";

import { useState } from "react";
import { ActionButton, MetricRow, ScreenStatePanel, SemanticBadge } from "@/design-system";
import { resolveDefaultCallerContext } from "@/features/workbench/caller-context";
import {
  buildCampaignCommandCorrelationId,
  type DpmCampaignLifecycleCommandInput,
} from "@/features/workbench/dpm-campaign-command-contracts";
import type {
  DpmCampaignDefinitionRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import type {
  DpmCampaignLifecycleCommandEvidence,
} from "@/features/workbench/use-dpm-wave-command-center-actions";

type Props = {
  selectedCampaign: DpmCampaignDefinitionRow | null;
  pendingCommand?: boolean;
  commandError?: string | null;
  commandEvidence?: DpmCampaignLifecycleCommandEvidence | null;
  onRecordLifecycleCommand: (command: DpmCampaignLifecycleCommandInput) => Promise<void>;
};

export default function DpmCampaignLifecycleCommandCard({
  selectedCampaign,
  pendingCommand = false,
  commandError = null,
  commandEvidence = null,
  onRecordLifecycleCommand,
}: Props) {
  const callerContext = resolveDefaultCallerContext();
  const actorId = callerContext.actorId;
  const [reason, setReason] = useState("");
  const [replacementCampaignVersion, setReplacementCampaignVersion] = useState("");

  const actorMissing = actorId.trim().length === 0;
  const reasonMissing = reason.trim().length === 0;
  const supersedeMissing = replacementCampaignVersion.trim().length === 0;
  const retireDisabled = !selectedCampaign || pendingCommand || actorMissing || reasonMissing;
  const supersedeDisabled = retireDisabled || supersedeMissing;

  async function retireCampaign() {
    if (retireDisabled) {
      return;
    }
    await onRecordLifecycleCommand({
      commandType: "retire",
      body: {
        retired_by: actorId.trim(),
        retirement_reason: reason.trim(),
        correlation_id: buildCampaignCommandCorrelationId({
          command: "retire",
          campaignId: selectedCampaign!.campaignId,
          campaignVersion: selectedCampaign!.campaignVersion,
        }),
      },
    });
  }

  async function supersedeCampaign() {
    if (supersedeDisabled) {
      return;
    }
    await onRecordLifecycleCommand({
      commandType: "supersede",
      body: {
        superseded_by_campaign_version: replacementCampaignVersion.trim(),
        superseded_by: actorId.trim(),
        supersession_reason: reason.trim(),
        correlation_id: buildCampaignCommandCorrelationId({
          command: "supersede",
          campaignId: selectedCampaign!.campaignId,
          campaignVersion: selectedCampaign!.campaignVersion,
        }),
      },
    });
  }

  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-lifecycle-command-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-lifecycle-command-title">Campaign Lifecycle Control</h4>
          <p>Gateway-backed retire and supersede commands for Manage campaign definitions.</p>
        </div>
        <SemanticBadge tone={!selectedCampaign ? "default" : commandError ? "warn" : "success"}>
          {!selectedCampaign ? "Unavailable" : commandError ? "Needs attention" : "Gateway backed"}
        </SemanticBadge>
      </div>
      <div className="rebalance-campaign-workflow-command-grid">
        <label className="workbench-field-label" htmlFor="dpm-campaign-lifecycle-actor">
          Responsible operator
          <input
            id="dpm-campaign-lifecycle-actor"
            className="workbench-input"
            value={actorId}
            readOnly
          />
        </label>
        <label className="workbench-field-label" htmlFor="dpm-campaign-lifecycle-reason">
          Business rationale
          <textarea
            id="dpm-campaign-lifecycle-reason"
            className="workbench-input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={pendingCommand}
          />
        </label>
        <label className="workbench-field-label" htmlFor="dpm-campaign-replacement-version">
          Active replacement version
          <input
            id="dpm-campaign-replacement-version"
            className="workbench-input"
            value={replacementCampaignVersion}
            onChange={(event) => setReplacementCampaignVersion(event.target.value)}
            disabled={pendingCommand}
          />
        </label>
      </div>
      <div className="rebalance-campaign-workflow-command-row">
        <ActionButton priority="secondary" onClick={retireCampaign} disabled={retireDisabled}>
          {pendingCommand ? "Recording" : "Retire Campaign"}
        </ActionButton>
        <ActionButton priority="secondary" onClick={supersedeCampaign} disabled={supersedeDisabled}>
          {pendingCommand ? "Recording" : "Supersede Campaign"}
        </ActionButton>
        <span>No order, OMS, client-contact, or external workflow action is enabled.</span>
      </div>
      {commandError ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign lifecycle command needs attention"
          body={commandError}
        />
      ) : null}
      {commandEvidence ? (
        <div
          className="rebalance-campaign-workflow-command-evidence"
          aria-label="DPM campaign lifecycle command evidence"
        >
          <MetricRow label="Command" value={commandEvidence.commandLabel} />
          <MetricRow label="Status" value={commandEvidence.status} />
          <MetricRow label="Actor" value={commandEvidence.actor} />
          <MetricRow label="Reason" value={commandEvidence.reason} />
          <MetricRow label="Replacement Version" value={commandEvidence.replacementCampaignVersion} />
          <MetricRow label="Correlation" value={commandEvidence.correlationId} />
          <MetricRow label="Source" value={commandEvidence.sourceService} />
          <MetricRow label="Upstream" value={commandEvidence.upstreamStatus} />
          <MetricRow label="Content Hash" value={commandEvidence.contentHash} />
          <MetricRow label="Reason Codes" value={commandEvidence.reasonCodes} />
          <MetricRow label="Boundaries" value={commandEvidence.operatingBoundaries} />
        </div>
      ) : null}
    </div>
  );
}
