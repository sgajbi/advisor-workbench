"use client";

import { businessStateLabel, formatBusinessReason } from "@/copy/business-state-copy";
import { useState } from "react";
import { ActionButton, ScreenStatePanel } from "@/design-system";
import DpmWaveSummaryCell from "@/features/workbench/components/dpm-wave-summary-cell";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import { dpmWaveBadgeTone } from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchPosture,
  DpmCampaignPreviewReadinessPosture,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import { formatBusinessOwner } from "@/features/workbench/manage-actor-presentation";
import {
  formatBusinessBoundary,
} from "@/features/workbench/manage-workspace-view-model";
import { MANAGE_REBALANCE_LABELS } from "@/features/workbench/manage-terminology";

type Props = {
  previewReadinessPosture: DpmCampaignPreviewReadinessPosture;
  launchPosture: DpmCampaignLaunchPosture;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  previewReadinessError?: string | null;
  launchError?: string | null;
  selectedLaunchPending: boolean;
  pendingLaunchKey?: string | null;
  commandQueueBusy?: boolean;
  onLaunchCampaign: (row: DpmCampaignDefinitionRow) => void;
};

export default function DpmCampaignLaunchPostureCard({
  previewReadinessPosture,
  launchPosture,
  selectedCampaign,
  previewReadinessError,
  launchError,
  selectedLaunchPending,
  pendingLaunchKey,
  commandQueueBusy = false,
  onLaunchCampaign,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const displayedReason =
    launchPosture.state !== "NOT_CHECKED" ? launchPosture.reason : previewReadinessPosture.reason;

  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-launch-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-launch-title">
            {MANAGE_REBALANCE_LABELS.campaignLaunchDecision}
          </h4>
          <p>
            {selectedCampaign
              ? `${selectedCampaign.displayName} version ${selectedCampaign.campaignVersion}`
              : "Select a campaign definition to check launch readiness."}
          </p>
        </div>
        <DpmWaveStateBadge state={launchPosture.state} />
      </div>
      {launchError ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign launch needs attention"
          body={launchError}
        />
      ) : null}
      <div className="rebalance-summary-strip" aria-label="Campaign launch decision">
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.previewReadiness}
          value={businessStateLabel(previewReadinessPosture.state)}
          tone={dpmWaveBadgeTone(previewReadinessPosture.state)}
        />
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.launchReadiness}
          value={businessStateLabel(launchPosture.state)}
          tone={dpmWaveBadgeTone(launchPosture.state)}
        />
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.asOfDate}
          value={launchPosture.requestedAsOfDate}
        />
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.reviewedBy}
          value={formatBusinessOwner(launchPosture.actor)}
        />
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.rebalanceWaveReference}
          value={launchPosture.launchedWaveId}
        />
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.replayKey}
          value={launchPosture.idempotencyEvidence}
        />
      </div>
      {previewReadinessError ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign preview readiness needs attention"
          body={previewReadinessError}
        />
      ) : null}
      <div className="rebalance-summary-strip" aria-label="Campaign preview readiness boundaries">
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.previewAsOfDate}
          value={previewReadinessPosture.requestedAsOfDate}
        />
        <DpmWaveSummaryCell
          label={MANAGE_REBALANCE_LABELS.previewReviewedBy}
          value={formatBusinessOwner(previewReadinessPosture.actor)}
        />
        <DpmWaveSummaryCell
          label="Blocked actions"
          value={
            previewReadinessPosture.blockedActions.length > 0
              ? previewReadinessPosture.blockedActions.map(formatBusinessBoundary).join(", ")
              : "None"
          }
        />
        <DpmWaveSummaryCell label="Readiness reason" value={formatBusinessReason(previewReadinessPosture.reason)} />
        <DpmWaveSummaryCell label="Readiness sources" value={previewReadinessPosture.sourcePosture} />
        <DpmWaveSummaryCell
          label="Operating boundaries"
          value={
            previewReadinessPosture.operatingBoundaries.length > 0
              ? previewReadinessPosture.operatingBoundaries.map(formatBusinessBoundary).join(", ")
              : "N/A"
          }
        />
      </div>
      <div className="rebalance-action-row">
        <div>
          <span>{formatBusinessReason(displayedReason)}</span>
          {selectedCampaign && launchPosture.canLaunch ? (
            <label className="workbench-confirmation" htmlFor="dpm-campaign-launch-confirmation">
              <input
                id="dpm-campaign-launch-confirmation"
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={Boolean(pendingLaunchKey) || commandQueueBusy}
              />
              <span>
                I reviewed the source readiness and understand that this launches one governed
                rebalance wave. It does not approve trades or send orders.
              </span>
            </label>
          ) : null}
        </div>
        <ActionButton
          priority="primary"
          onClick={() => selectedCampaign && onLaunchCampaign(selectedCampaign)}
          disabled={
            !selectedCampaign ||
            !launchPosture.canLaunch ||
            !confirmed ||
            Boolean(pendingLaunchKey) ||
            commandQueueBusy
          }
        >
          {selectedLaunchPending
            ? "Launching rebalance wave"
            : commandQueueBusy
              ? "Another campaign action is in progress"
              : "Launch rebalance wave"}
        </ActionButton>
      </div>
    </div>
  );
}
