"use client";

import { ActionButton, AnalyticsTable } from "@/design-system";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignDefinitionRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessStateLabel,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  rows: DpmCampaignDefinitionRow[];
  selectedCampaignKey?: string | null;
  pendingLifecycleKey?: string | null;
  pendingLaunchHistoryKey?: string | null;
  pendingPreviewReadinessKey?: string | null;
  pendingLaunchPackageKey?: string | null;
  pendingLaunchKey?: string | null;
  onLoadLifecycle: (row: DpmCampaignDefinitionRow) => void;
  onLoadLaunchHistory: (row: DpmCampaignDefinitionRow, offset?: number) => void;
  onCheckLaunchReadiness: (row: DpmCampaignDefinitionRow) => void;
};

export default function DpmCampaignDefinitionsTable({
  rows,
  selectedCampaignKey,
  pendingLifecycleKey,
  pendingLaunchHistoryKey,
  pendingPreviewReadinessKey,
  pendingLaunchPackageKey,
  pendingLaunchKey,
  onLoadLifecycle,
  onLoadLaunchHistory,
  onCheckLaunchReadiness,
}: Props) {
  return (
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
          <DpmWaveStateBadge key={`${row.key}-status`} state={row.status} />,
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
  );
}
