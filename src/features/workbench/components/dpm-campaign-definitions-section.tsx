"use client";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmCampaignLaunchHistoryCard, {
  CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
} from "@/features/workbench/components/dpm-campaign-launch-history-card";
import DpmCampaignLaunchPostureCard from "@/features/workbench/components/dpm-campaign-launch-posture-card";
import {
  dpmWaveBadgeTone,
} from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchHistoryPage,
  DpmCampaignLaunchHistoryRow,
  DpmCampaignLaunchPosture,
  DpmCampaignLifecycleEventRow,
  DpmCampaignPreviewReadinessPosture,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessStateLabel,
} from "@/features/workbench/manage-workspace-view-model";

export { CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE };

const DEFAULT_PREVIEW_READINESS_POSTURE: DpmCampaignPreviewReadinessPosture = {
  state: "NOT_CHECKED",
  reason: "Not checked",
  requestedAsOfDate: "N/A",
  actor: "N/A",
  blockedActions: [],
  operatingBoundaries: [],
  sourcePosture: "N/A",
};

type Props = {
  rows: DpmCampaignDefinitionRow[];
  lifecycleRows: DpmCampaignLifecycleEventRow[];
  launchHistoryRows: DpmCampaignLaunchHistoryRow[];
  launchHistoryPage: DpmCampaignLaunchHistoryPage;
  previewReadinessPosture?: DpmCampaignPreviewReadinessPosture;
  launchPosture: DpmCampaignLaunchPosture;
  lifecycleError?: string | null;
  launchHistoryError?: string | null;
  previewReadinessError?: string | null;
  launchError?: string | null;
  pendingLifecycleKey?: string | null;
  pendingLaunchHistoryKey?: string | null;
  pendingPreviewReadinessKey?: string | null;
  pendingLaunchPackageKey?: string | null;
  pendingLaunchKey?: string | null;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  selectedCampaignKey?: string | null;
  errorMessage?: string | null;
  onLoadLifecycle: (row: DpmCampaignDefinitionRow) => void;
  onLoadLaunchHistory: (row: DpmCampaignDefinitionRow, offset?: number) => void;
  onCheckLaunchReadiness: (row: DpmCampaignDefinitionRow) => void;
  onLaunchCampaign: (row: DpmCampaignDefinitionRow) => void;
};

export default function DpmCampaignDefinitionsSection({
  rows,
  lifecycleRows,
  launchHistoryRows,
  launchHistoryPage,
  previewReadinessPosture = DEFAULT_PREVIEW_READINESS_POSTURE,
  launchPosture,
  lifecycleError,
  launchHistoryError,
  previewReadinessError,
  launchError,
  pendingLifecycleKey,
  pendingLaunchHistoryKey,
  pendingPreviewReadinessKey,
  pendingLaunchPackageKey,
  pendingLaunchKey,
  selectedCampaign,
  selectedCampaignKey,
  errorMessage,
  onLoadLifecycle,
  onLoadLaunchHistory,
  onCheckLaunchReadiness,
  onLaunchCampaign,
}: Props) {
  const selectedLaunchPending = Boolean(selectedCampaign && selectedCampaign.key === pendingLaunchKey);

  return (
    <section className="rebalance-proposed-card" aria-labelledby="campaign-definitions-title">
      <div className="rebalance-table-heading">
        <div>
          <h3 id="campaign-definitions-title">Campaign Definitions</h3>
          <p>Manage-owned bulk-review campaigns backed by source-supplied candidate sets.</p>
        </div>
        <SemanticBadge tone={errorMessage ? "warn" : rows.length ? "success" : "default"}>
          {errorMessage ? "Needs attention" : rows.length ? "Available" : "No active campaign"}
        </SemanticBadge>
      </div>
      {errorMessage ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign definitions need attention"
          body={errorMessage}
        />
      ) : null}
      <AnalyticsTable
        ariaLabel="DPM campaign definitions"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "campaign", label: "Campaign" },
          { key: "version", label: "Version" },
          { key: "status", label: "Status" },
          { key: "asOf", label: "As Of" },
          { key: "candidates", label: "Candidates", align: "right" },
          { key: "eligibleCandidates", label: "Eligible", align: "right" },
          { key: "portfolioTypes", label: "Eligible Types" },
          { key: "governance", label: "Governance" },
          { key: "expiry", label: "Expiry" },
          { key: "purpose", label: "Purpose" },
          { key: "source", label: "Source Posture" },
          { key: "evidence", label: "Evidence" },
          { key: "history", label: "Launch History" },
          { key: "launch", label: "Launch" },
        ]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            <button
              className="rebalance-link-button"
              key={`${row.key}-select`}
              type="button"
              onClick={() => onLoadLifecycle(row)}
              aria-pressed={row.key === selectedCampaignKey}
            >
              {row.displayName}
            </button>,
            row.campaignVersion,
            <SemanticBadge key={`${row.key}-status`} tone={dpmWaveBadgeTone(row.status)}>
              {businessStateLabel(row.status)}
            </SemanticBadge>,
            row.asOfDate,
            row.candidateCount,
            row.eligibleCandidateCount,
            row.eligiblePortfolioTypes,
            businessStateLabel(row.governanceState),
            businessStateLabel(row.expiryState),
            row.accessPurpose,
            row.sourcePosture,
            <ActionButton
              key={`${row.key}-evidence`}
              priority="secondary"
              onClick={() => onLoadLifecycle(row)}
              disabled={Boolean(pendingLifecycleKey)}
            >
              {pendingLifecycleKey === row.key ? "Loading" : "Open Evidence"}
            </ActionButton>,
            <ActionButton
              key={`${row.key}-launch-history`}
              priority="secondary"
              onClick={() => onLoadLaunchHistory(row)}
              disabled={Boolean(pendingLaunchHistoryKey)}
            >
              {pendingLaunchHistoryKey === row.key ? "Loading" : "Open History"}
            </ActionButton>,
            <ActionButton
              key={`${row.key}-launch-readiness`}
              priority="secondary"
              onClick={() => onCheckLaunchReadiness(row)}
              disabled={Boolean(pendingPreviewReadinessKey || pendingLaunchPackageKey || pendingLaunchKey)}
            >
              {pendingPreviewReadinessKey === row.key || pendingLaunchPackageKey === row.key
                ? "Checking"
                : "Check Readiness"}
            </ActionButton>,
          ],
        }))}
        emptyState={{
          title: "No active campaign definitions",
          body: "Persist a Manage campaign definition before using bulk-review campaign waves.",
        }}
      />
      <CampaignLifecycleEvidence
        rows={lifecycleRows}
        selectedCampaign={selectedCampaign}
        error={lifecycleError}
      />
      <DpmCampaignLaunchHistoryCard
        rows={launchHistoryRows}
        page={launchHistoryPage}
        selectedCampaign={selectedCampaign}
        error={launchHistoryError}
        pendingLaunchHistoryKey={pendingLaunchHistoryKey}
        onLoadLaunchHistory={onLoadLaunchHistory}
      />
      <DpmCampaignLaunchPostureCard
        previewReadinessPosture={previewReadinessPosture}
        launchPosture={launchPosture}
        selectedCampaign={selectedCampaign}
        previewReadinessError={previewReadinessError}
        launchError={launchError}
        selectedLaunchPending={selectedLaunchPending}
        pendingLaunchKey={pendingLaunchKey}
        onLaunchCampaign={onLaunchCampaign}
      />
    </section>
  );
}

function CampaignLifecycleEvidence({
  rows,
  selectedCampaign,
  error,
}: {
  rows: DpmCampaignLifecycleEventRow[];
  selectedCampaign: DpmCampaignDefinitionRow | null;
  error?: string | null;
}) {
  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-lifecycle-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-lifecycle-title">Campaign Lifecycle Evidence</h4>
          <p>
            {selectedCampaign
              ? `${selectedCampaign.displayName} version ${selectedCampaign.campaignVersion}`
              : "Select a campaign definition to inspect lifecycle evidence."}
          </p>
        </div>
        <SemanticBadge tone={error ? "warn" : rows.length ? "success" : "default"}>
          {error ? "Needs attention" : rows.length ? "Loaded" : "Not loaded"}
        </SemanticBadge>
      </div>
      {error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign lifecycle evidence needs attention"
          body={error}
        />
      ) : null}
      <AnalyticsTable
        ariaLabel="DPM campaign lifecycle evidence"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "event", label: "Lifecycle Event" },
          { key: "occurred", label: "Recorded" },
          { key: "actor", label: "Recorded By" },
          { key: "wave", label: "Wave" },
          { key: "reviewDate", label: "Review Date" },
          { key: "status", label: "Status" },
          { key: "reason", label: "Reason" },
          { key: "correlation", label: "Correlation" },
          { key: "idempotency", label: "Idempotency" },
        ]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            row.eventType,
            row.occurredAt,
            row.actor,
            row.waveId,
            row.requestedAsOfDate,
            <SemanticBadge key={`${row.key}-status`} tone={dpmWaveBadgeTone(row.status)}>
              {businessStateLabel(row.status)}
            </SemanticBadge>,
            row.reason,
            row.correlationId,
            row.idempotencyKey,
          ],
        }))}
        emptyState={{
          title: "No lifecycle evidence loaded",
          body: "Open campaign evidence to review Manage-recorded lifecycle events.",
        }}
      />
    </div>
  );
}
