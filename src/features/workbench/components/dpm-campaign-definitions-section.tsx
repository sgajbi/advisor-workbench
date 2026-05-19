"use client";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmWaveSummaryCell from "@/features/workbench/components/dpm-wave-summary-cell";
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
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

export const CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE = 10;

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
      <CampaignLaunchHistory
        rows={launchHistoryRows}
        page={launchHistoryPage}
        selectedCampaign={selectedCampaign}
        error={launchHistoryError}
        pendingLaunchHistoryKey={pendingLaunchHistoryKey}
        onLoadLaunchHistory={onLoadLaunchHistory}
      />
      <CampaignLaunchPosture
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

function CampaignLaunchHistory({
  rows,
  page,
  selectedCampaign,
  error,
  pendingLaunchHistoryKey,
  onLoadLaunchHistory,
}: {
  rows: DpmCampaignLaunchHistoryRow[];
  page: DpmCampaignLaunchHistoryPage;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  error?: string | null;
  pendingLaunchHistoryKey?: string | null;
  onLoadLaunchHistory: (row: DpmCampaignDefinitionRow, offset?: number) => void;
}) {
  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-launch-history-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-launch-history-title">Campaign Launch History</h4>
          <p>
            {selectedCampaign
              ? `${selectedCampaign.displayName} version ${selectedCampaign.campaignVersion} | ${page.count} of ${page.totalCount} launch records`
              : "Select a campaign definition to inspect append-only launch history."}
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
          title="Campaign launch history needs attention"
          body={error}
        />
      ) : null}
      <AnalyticsTable
        ariaLabel="DPM campaign launch history"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "wave", label: "Wave" },
          { key: "actor", label: "Launched By" },
          { key: "launched", label: "Recorded" },
          { key: "reviewDate", label: "Review Date" },
          { key: "correlation", label: "Correlation" },
          { key: "idempotency", label: "Idempotency" },
        ]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            row.waveId,
            row.actor,
            row.launchedAt,
            row.requestedAsOfDate,
            row.correlationId,
            row.idempotencyKey,
          ],
        }))}
        emptyState={{
          title: selectedCampaign ? "No launch records" : "No launch history loaded",
          body: selectedCampaign
            ? "Manage has no append-only launch records for this campaign definition page."
            : "Open launch history to review Manage-recorded launch attempts and boundary posture.",
        }}
      />
      <div className="rebalance-summary-strip" aria-label="Campaign launch history boundaries">
        <DpmWaveSummaryCell
          label="Page"
          value={
            page.count > 0
              ? `${page.offset + 1}-${page.offset + page.count} of ${page.totalCount}`
              : `0 of ${page.totalCount}`
          }
        />
        <DpmWaveSummaryCell
          label="Page Size"
          value={String(page.limit || CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE)}
        />
        <DpmWaveSummaryCell
          label="Operating Boundary"
          value={
            page.operatingBoundaries.length > 0
              ? page.operatingBoundaries.join(", ")
              : "No order generation or OMS execution claim"
          }
        />
      </div>
      <div className="rebalance-action-row" aria-label="Campaign launch history pagination">
        <ActionButton
          priority="secondary"
          onClick={() =>
            selectedCampaign
              ? onLoadLaunchHistory(
                  selectedCampaign,
                  Math.max(0, page.offset - CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE)
                )
              : undefined
          }
          disabled={!selectedCampaign || Boolean(pendingLaunchHistoryKey) || !page.hasPreviousPage}
        >
          Previous
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={() =>
            selectedCampaign
              ? onLoadLaunchHistory(selectedCampaign, page.offset + CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE)
              : undefined
          }
          disabled={!selectedCampaign || Boolean(pendingLaunchHistoryKey) || !page.hasNextPage}
        >
          Next
        </ActionButton>
      </div>
    </div>
  );
}

function CampaignLaunchPosture({
  previewReadinessPosture,
  launchPosture,
  selectedCampaign,
  previewReadinessError,
  launchError,
  selectedLaunchPending,
  pendingLaunchKey,
  onLaunchCampaign,
}: {
  previewReadinessPosture: DpmCampaignPreviewReadinessPosture;
  launchPosture: DpmCampaignLaunchPosture;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  previewReadinessError?: string | null;
  launchError?: string | null;
  selectedLaunchPending: boolean;
  pendingLaunchKey?: string | null;
  onLaunchCampaign: (row: DpmCampaignDefinitionRow) => void;
}) {
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
        <SemanticBadge tone={dpmWaveBadgeTone(launchPosture.state)}>
          {businessStateLabel(launchPosture.state)}
        </SemanticBadge>
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
        <DpmWaveSummaryCell
          label="Readiness Reason"
          value={formatBusinessReason(previewReadinessPosture.reason)}
        />
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
