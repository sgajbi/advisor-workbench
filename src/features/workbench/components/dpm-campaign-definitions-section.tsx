"use client";

import { ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmCampaignDefinitionsTable from "@/features/workbench/components/dpm-campaign-definitions-table";
import DpmCampaignLifecycleEvidenceCard from "@/features/workbench/components/dpm-campaign-lifecycle-evidence-card";
import DpmCampaignLaunchHistoryCard, {
  CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
} from "@/features/workbench/components/dpm-campaign-launch-history-card";
import DpmCampaignLaunchPostureCard from "@/features/workbench/components/dpm-campaign-launch-posture-card";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchHistoryPage,
  DpmCampaignLaunchHistoryRow,
  DpmCampaignLaunchPosture,
  DpmCampaignPreviewReadinessPosture,
  DpmCampaignLifecycleEventRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";

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
      <DpmCampaignDefinitionsTable
        rows={rows}
        selectedCampaignKey={selectedCampaignKey}
        pendingLifecycleKey={pendingLifecycleKey}
        pendingLaunchHistoryKey={pendingLaunchHistoryKey}
        pendingPreviewReadinessKey={pendingPreviewReadinessKey}
        pendingLaunchPackageKey={pendingLaunchPackageKey}
        pendingLaunchKey={pendingLaunchKey}
        onLoadLifecycle={onLoadLifecycle}
        onLoadLaunchHistory={onLoadLaunchHistory}
        onCheckLaunchReadiness={onCheckLaunchReadiness}
      />
      <DpmCampaignLifecycleEvidenceCard
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
