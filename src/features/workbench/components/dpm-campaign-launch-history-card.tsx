"use client";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmWaveSummaryCell from "@/features/workbench/components/dpm-wave-summary-cell";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchHistoryPage,
  DpmCampaignLaunchHistoryRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import { CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE } from "@/features/workbench/dpm-campaign-launch-history-constants";
import { MANAGE_REBALANCE_LABELS } from "@/features/workbench/manage-terminology";
import {
  formatBusinessBoundary,
  formatBusinessOwner,
} from "@/features/workbench/manage-workspace-view-model";

export { CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE };

type Props = {
  rows: DpmCampaignLaunchHistoryRow[];
  page: DpmCampaignLaunchHistoryPage;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  error?: string | null;
  pendingLaunchHistoryKey?: string | null;
  onLoadLaunchHistory: (row: DpmCampaignDefinitionRow, offset?: number) => void;
};

export default function DpmCampaignLaunchHistoryCard({
  rows,
  page,
  selectedCampaign,
  error,
  pendingLaunchHistoryKey,
  onLoadLaunchHistory,
}: Props) {
  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-launch-history-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-launch-history-title">
            {MANAGE_REBALANCE_LABELS.campaignLaunchHistory}
          </h4>
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
        ariaLabel="Rebalance campaign launch history"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "wave", label: MANAGE_REBALANCE_LABELS.rebalanceWave },
          { key: "actor", label: "Launched by" },
          { key: "launched", label: "Recorded" },
          { key: "reviewDate", label: MANAGE_REBALANCE_LABELS.asOfDate },
          { key: "correlation", label: MANAGE_REBALANCE_LABELS.supportReference },
          { key: "idempotency", label: MANAGE_REBALANCE_LABELS.replayKey },
        ]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            row.waveId,
            formatBusinessOwner(row.actor),
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
          label="Page size"
          value={String(page.limit || CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE)}
        />
        <DpmWaveSummaryCell
          label="Operating boundaries"
          value={
            page.operatingBoundaries.length > 0
              ? page.operatingBoundaries.map(formatBusinessBoundary).join(", ")
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
