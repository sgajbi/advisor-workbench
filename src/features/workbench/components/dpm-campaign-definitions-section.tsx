"use client";

import { ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmCampaignCandidateSourceCard from "@/features/workbench/components/dpm-campaign-candidate-source-card";
import DpmCampaignDefinitionsTable from "@/features/workbench/components/dpm-campaign-definitions-table";
import DpmCampaignLifecycleEvidenceCard from "@/features/workbench/components/dpm-campaign-lifecycle-evidence-card";
import DpmCampaignLifecycleCommandCard from "@/features/workbench/components/dpm-campaign-lifecycle-command-card";
import DpmCampaignLaunchHistoryCard, {
  CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
} from "@/features/workbench/components/dpm-campaign-launch-history-card";
import DpmCampaignLaunchPostureCard from "@/features/workbench/components/dpm-campaign-launch-posture-card";
import DpmCampaignWorkflowAuditCard from "@/features/workbench/components/dpm-campaign-workflow-audit-card";
import type {
  DpmCampaignLifecycleCommandEvidence,
  DpmCampaignLifecycleCommandInput,
  DpmCampaignWorkflowCommandEvidence,
  DpmCampaignWorkflowCommandInput,
} from "@/features/workbench/use-dpm-wave-command-center-actions";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchHistoryPage,
  DpmCampaignLaunchHistoryRow,
  DpmCampaignLaunchPosture,
  DpmCampaignPreviewReadinessPosture,
  DpmCampaignLifecycleEventRow,
  DpmCampaignWorkflowEvidenceRow,
  DpmCampaignWorkflowSummaryRow,
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
  workflowSummaryRows?: DpmCampaignWorkflowSummaryRow[];
  workflowEvidenceRows?: DpmCampaignWorkflowEvidenceRow[];
  lifecycleError?: string | null;
  launchHistoryError?: string | null;
  previewReadinessError?: string | null;
  launchError?: string | null;
  workflowError?: string | null;
  lifecycleCommandError?: string | null;
  pendingLifecycleKey?: string | null;
  pendingLaunchHistoryKey?: string | null;
  pendingPreviewReadinessKey?: string | null;
  pendingLaunchPackageKey?: string | null;
  pendingLaunchKey?: string | null;
  pendingLifecycleCommand?: boolean;
  pendingWorkflowCommand?: boolean;
  lifecycleCommandEvidence?: DpmCampaignLifecycleCommandEvidence | null;
  workflowCommandError?: string | null;
  workflowCommandEvidence?: DpmCampaignWorkflowCommandEvidence | null;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  selectedCampaignKey?: string | null;
  errorMessage?: string | null;
  onLoadLifecycle: (row: DpmCampaignDefinitionRow) => void;
  onLoadLaunchHistory: (row: DpmCampaignDefinitionRow, offset?: number) => void;
  onCheckLaunchReadiness: (row: DpmCampaignDefinitionRow) => void;
  onLaunchCampaign: (row: DpmCampaignDefinitionRow) => void;
  onRecordLifecycleCommand?: (command: DpmCampaignLifecycleCommandInput) => Promise<void>;
  onRecordWorkflowCommand?: (command: DpmCampaignWorkflowCommandInput) => Promise<void>;
};

export default function DpmCampaignDefinitionsSection({
  rows,
  lifecycleRows,
  launchHistoryRows,
  launchHistoryPage,
  previewReadinessPosture = DEFAULT_PREVIEW_READINESS_POSTURE,
  launchPosture,
  workflowSummaryRows = [],
  workflowEvidenceRows = [],
  lifecycleError,
  launchHistoryError,
  previewReadinessError,
  launchError,
  workflowError,
  lifecycleCommandError,
  pendingLifecycleKey,
  pendingLaunchHistoryKey,
  pendingPreviewReadinessKey,
  pendingLaunchPackageKey,
  pendingLaunchKey,
  pendingLifecycleCommand,
  pendingWorkflowCommand,
  lifecycleCommandEvidence,
  workflowCommandError,
  workflowCommandEvidence,
  selectedCampaign,
  selectedCampaignKey,
  errorMessage,
  onLoadLifecycle,
  onLoadLaunchHistory,
  onCheckLaunchReadiness,
  onLaunchCampaign,
  onRecordLifecycleCommand = async () => {},
  onRecordWorkflowCommand = async () => {},
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
      <DpmCampaignCandidateSourceCard selectedCampaign={selectedCampaign} />
      <DpmCampaignLifecycleEvidenceCard
        rows={lifecycleRows}
        selectedCampaign={selectedCampaign}
        error={lifecycleError}
      />
      <DpmCampaignLifecycleCommandCard
        selectedCampaign={selectedCampaign}
        pendingCommand={pendingLifecycleCommand}
        commandError={lifecycleCommandError}
        commandEvidence={lifecycleCommandEvidence}
        onRecordLifecycleCommand={onRecordLifecycleCommand}
      />
      <DpmCampaignWorkflowAuditCard
        summaryRows={workflowSummaryRows}
        evidenceRows={workflowEvidenceRows}
        error={workflowError}
        selectedCampaign={selectedCampaign}
        pendingCommand={pendingWorkflowCommand}
        commandError={workflowCommandError}
        commandEvidence={workflowCommandEvidence}
        onRecordWorkflowCommand={onRecordWorkflowCommand}
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
