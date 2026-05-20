"use client";

import { ActionButton, ScreenStatePanel } from "@/design-system";
import DpmWaveSummaryCell from "@/features/workbench/components/dpm-wave-summary-cell";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import { dpmWaveBadgeTone } from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchPosture,
  DpmCampaignPreviewReadinessPosture,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  previewReadinessPosture: DpmCampaignPreviewReadinessPosture;
  launchPosture: DpmCampaignLaunchPosture;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  previewReadinessError?: string | null;
  launchError?: string | null;
  selectedLaunchPending: boolean;
  pendingLaunchKey?: string | null;
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
  onLaunchCampaign,
}: Props) {
  const displayedReason =
    launchPosture.state !== "NOT_CHECKED" ? launchPosture.reason : previewReadinessPosture.reason;

  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-launch-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-launch-title">Campaign Launch Posture</h4>
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
      <div className="rebalance-summary-strip" aria-label="Campaign launch posture">
        <DpmWaveSummaryCell
          label="Preview Readiness"
          value={businessStateLabel(previewReadinessPosture.state)}
          tone={dpmWaveBadgeTone(previewReadinessPosture.state)}
        />
        <DpmWaveSummaryCell
          label="Launch Readiness"
          value={businessStateLabel(launchPosture.state)}
          tone={dpmWaveBadgeTone(launchPosture.state)}
        />
        <DpmWaveSummaryCell label="Review Date" value={launchPosture.requestedAsOfDate} />
        <DpmWaveSummaryCell label="Reviewed By" value={launchPosture.actor} />
        <DpmWaveSummaryCell label="Durable Wave" value={launchPosture.launchedWaveId} />
        <DpmWaveSummaryCell label="Idempotency Evidence" value={launchPosture.idempotencyEvidence} />
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
        <DpmWaveSummaryCell label="Preview Review Date" value={previewReadinessPosture.requestedAsOfDate} />
        <DpmWaveSummaryCell label="Preview Reviewed By" value={previewReadinessPosture.actor} />
        <DpmWaveSummaryCell
          label="Blocked Actions"
          value={
            previewReadinessPosture.blockedActions.length > 0
              ? previewReadinessPosture.blockedActions.join(", ")
              : "None"
          }
        />
        <DpmWaveSummaryCell label="Readiness Reason" value={formatBusinessReason(previewReadinessPosture.reason)} />
        <DpmWaveSummaryCell label="Readiness Sources" value={previewReadinessPosture.sourcePosture} />
        <DpmWaveSummaryCell
          label="Operating Boundary"
          value={
            previewReadinessPosture.operatingBoundaries.length > 0
              ? previewReadinessPosture.operatingBoundaries.join(", ")
              : "N/A"
          }
        />
      </div>
      <div className="rebalance-action-row">
        <span>{formatBusinessReason(displayedReason)}</span>
        <ActionButton
          priority="primary"
          onClick={() => selectedCampaign && onLaunchCampaign(selectedCampaign)}
          disabled={!selectedCampaign || !launchPosture.canLaunch || Boolean(pendingLaunchKey)}
        >
          {selectedLaunchPending ? "Launching" : "Launch Campaign"}
        </ActionButton>
      </div>
    </div>
  );
}
