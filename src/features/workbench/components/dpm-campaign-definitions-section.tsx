"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScreenStatePanel,
  SemanticBadge,
  Text,
  WorkbenchDecisionWorkspace,
  WorkbenchRecordSelector,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import DpmCampaignCandidateSourceCard from "@/features/workbench/components/dpm-campaign-candidate-source-card";
import DpmCampaignLifecycleEvidenceCard from "@/features/workbench/components/dpm-campaign-lifecycle-evidence-card";
import DpmCampaignLifecycleCommandCard from "@/features/workbench/components/dpm-campaign-lifecycle-command-card";
import DpmCampaignLaunchHistoryCard, {
  CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
} from "@/features/workbench/components/dpm-campaign-launch-history-card";
import DpmCampaignLaunchPostureCard from "@/features/workbench/components/dpm-campaign-launch-posture-card";
import DpmCampaignWorkflowAuditCard from "@/features/workbench/components/dpm-campaign-workflow-audit-card";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignLifecycleCommandInput,
  DpmCampaignWorkflowCommandInput,
} from "@/features/workbench/dpm-campaign-command-contracts";
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
import type {
  DpmCampaignLifecycleCommandEvidence,
  DpmCampaignWorkflowCommandEvidence,
} from "@/features/workbench/use-dpm-wave-command-center-actions";
import styles from "./dpm-campaign-definitions-section.module.css";

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

type CampaignWorkspaceMode = "review" | "governance" | "lifecycle" | "launch";

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
  pendingWorkflowEvidenceKey?: string | null;
  pendingLifecycleCommand?: boolean;
  pendingWorkflowCommand?: boolean;
  lifecycleCommandEvidence?: DpmCampaignLifecycleCommandEvidence | null;
  workflowCommandError?: string | null;
  workflowCommandEvidence?: DpmCampaignWorkflowCommandEvidence | null;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  selectedCampaignKey?: string | null;
  errorMessage?: string | null;
  onSelectCampaign: (row: DpmCampaignDefinitionRow) => void;
  onLoadLifecycle: (row: DpmCampaignDefinitionRow) => void;
  onLoadLaunchHistory: (row: DpmCampaignDefinitionRow, offset?: number) => void;
  onLoadWorkflowEvidence: (row: DpmCampaignDefinitionRow) => void;
  onCheckLaunchReadiness: (row: DpmCampaignDefinitionRow) => void;
  onLaunchCampaign: (row: DpmCampaignDefinitionRow) => void;
  onRecordLifecycleCommand?: (command: DpmCampaignLifecycleCommandInput) => Promise<void>;
  onRecordWorkflowCommand?: (command: DpmCampaignWorkflowCommandInput) => Promise<void>;
};

export default function DpmCampaignDefinitionsSection(props: Props) {
  const {
    rows,
    selectedCampaign,
    selectedCampaignKey,
    errorMessage,
    pendingLifecycleKey,
    pendingLaunchHistoryKey,
    pendingPreviewReadinessKey,
    pendingLaunchPackageKey,
    pendingWorkflowEvidenceKey,
    onSelectCampaign,
    onLoadLifecycle,
    onLoadLaunchHistory,
    onLoadWorkflowEvidence,
    onCheckLaunchReadiness,
  } = props;
  const [mode, setMode] = useState<CampaignWorkspaceMode>("review");
  const loadedCampaignKeyRef = useRef<string | null>(null);

  const loadSelectedEvidence = useCallback((row: DpmCampaignDefinitionRow) => {
    loadedCampaignKeyRef.current = row.key;
    onLoadLifecycle(row);
    onLoadLaunchHistory(row, 0);
    onLoadWorkflowEvidence(row);
    onCheckLaunchReadiness(row);
  }, [onCheckLaunchReadiness, onLoadLaunchHistory, onLoadLifecycle, onLoadWorkflowEvidence]);

  function selectCampaign(key: string) {
    const row = rows.find((candidate) => candidate.key === key);
    if (!row) return;
    onSelectCampaign(row);
    setMode("review");
    loadSelectedEvidence(row);
  }

  useEffect(() => {
    if (!selectedCampaign || loadedCampaignKeyRef.current === selectedCampaign.key) return;
    loadSelectedEvidence(selectedCampaign);
  }, [loadSelectedEvidence, selectedCampaign]);

  const selectedEvidencePending = Boolean(
    selectedCampaign &&
      [
        pendingLifecycleKey,
        pendingLaunchHistoryKey,
        pendingPreviewReadinessKey,
        pendingLaunchPackageKey,
        pendingWorkflowEvidenceKey,
      ].includes(selectedCampaign.key),
  );

  return (
    <section className={styles.section} aria-labelledby="campaign-definitions-title">
      <div className={styles.sectionHeader}>
        <div>
          <Text variant="microLabel">Governed bulk review</Text>
          <h3 id="campaign-definitions-title">Campaign administration</h3>
          <p>Prioritize a campaign, confirm source posture, then take one governed action.</p>
        </div>
        <SemanticBadge tone={errorMessage ? "warn" : rows.length ? "success" : "default"}>
          {errorMessage ? "Needs attention" : rows.length ? `${rows.length} in scope` : "No campaign"}
        </SemanticBadge>
      </div>
      {errorMessage ? (
        <ScreenStatePanel kind="partial" surface="portfolio" title="Campaign scope needs attention" body={errorMessage} />
      ) : null}
      {rows.length === 0 ? (
        <ScreenStatePanel
          kind="empty"
          surface="portfolio"
          title="No governed campaigns in scope"
          body="Create or activate a source-backed campaign definition before administering bulk review."
        />
      ) : (
        <WorkbenchDecisionWorkspace
          ariaLabel="Selected campaign decision workspace"
          className={styles.workspace}
          worklistClassName={styles.worklist}
          decisionClassName={styles.decision}
          worklist={
            <section aria-labelledby="campaign-worklist-title">
              <div className={styles.paneHeader}>
                <div>
                  <Text variant="microLabel">Campaign worklist</Text>
                  <Text variant="body" as="h4" id="campaign-worklist-title">Choose a review campaign</Text>
                </div>
                <span>{rows.length} source records</span>
              </div>
              <WorkbenchRecordSelector
                ariaLabel="Governed rebalance campaigns"
                selectedKey={selectedCampaignKey ?? null}
                onSelectionChange={selectCampaign}
                items={rows.map((row) => ({
                  key: row.key,
                  title: row.displayName,
                  subtitle: `Version ${row.campaignVersion} · ${row.asOfDate}`,
                  status: <DpmWaveStateBadge state={row.status} />,
                  facts: [
                    { label: "Eligible", value: row.eligibleCandidateCount },
                    { label: "Source", value: row.candidateSourceReadiness },
                    { label: "Governance", value: row.governanceState },
                  ],
                  nextAction: row.nextAction,
                }))}
              />
            </section>
          }
          decision={
            selectedCampaign ? (
              <CampaignDecisionPane
                {...props}
                mode={mode}
                onModeChange={setMode}
                selectedEvidencePending={selectedEvidencePending}
              />
            ) : (
              <ScreenStatePanel kind="empty" surface="portfolio" title="Select a campaign" body="Choose a campaign from the worklist to inspect its decision posture." />
            )
          }
        />
      )}
    </section>
  );
}

function CampaignDecisionPane({
  rows,
  selectedCampaign,
  mode,
  onModeChange,
  selectedEvidencePending,
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
  pendingLaunchHistoryKey,
  pendingLaunchKey,
  pendingLifecycleCommand,
  pendingWorkflowCommand,
  lifecycleCommandEvidence,
  workflowCommandError,
  workflowCommandEvidence,
  onLoadLaunchHistory,
  onLaunchCampaign,
  onRecordLifecycleCommand = async () => {},
  onRecordWorkflowCommand = async () => {},
}: Props & {
  mode: CampaignWorkspaceMode;
  onModeChange: (mode: CampaignWorkspaceMode) => void;
  selectedEvidencePending: boolean;
}) {
  if (!selectedCampaign) return null;
  return (
    <div className={styles.decisionPane} data-selected-campaign={selectedCampaign.key}>
      <div className={styles.identityHeader}>
        <div>
          <Text variant="microLabel">Selected campaign</Text>
          <h4>{selectedCampaign.displayName}</h4>
          <p>{selectedCampaign.campaignId} · version {selectedCampaign.campaignVersion}</p>
        </div>
        <DpmWaveStateBadge state={selectedCampaign.status} />
      </div>
      <WorkbenchSummaryMetricStrip
        ariaLabel="Selected campaign decision summary"
        items={[
          { key: "eligible", label: "Eligible portfolios", value: selectedCampaign.eligibleCandidateCount, support: `${selectedCampaign.candidateCount} candidates` },
          { key: "source", label: "Source readiness", value: selectedCampaign.candidateSourceReadiness, support: selectedCampaign.sourcePosture },
          { key: "governance", label: "Governance", value: selectedCampaign.governanceState, support: selectedCampaign.expiryState },
          { key: "launch", label: "Launch posture", value: launchPosture.state, support: launchPosture.canLaunch ? "Source permits launch" : "Review blockers" },
        ]}
      />
      <div className={styles.nextAction}>
        <div>
          <Text variant="microLabel">Recommended next action</Text>
          <strong>{selectedCampaign.nextAction}</strong>
        </div>
        {selectedEvidencePending ? <span role="status">Refreshing source evidence…</span> : <span>Source evidence current</span>}
      </div>
      <div className={styles.modeSelector} role="toolbar" aria-label="Campaign administration modes">
        {([
          ["review", "Review posture"],
          ["governance", "Governance action"],
          ["lifecycle", "Lifecycle control"],
          ["launch", "Launch decision"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)}>{label}</button>
        ))}
      </div>
      {mode === "review" ? (
        <>
          <DpmCampaignCandidateSourceCard selectedCampaign={selectedCampaign} />
          <details className={styles.disclosure}>
            <summary>Lifecycle history and technical trace</summary>
            <DpmCampaignLifecycleEvidenceCard rows={lifecycleRows} selectedCampaign={selectedCampaign} error={lifecycleError} />
          </details>
        </>
      ) : null}
      {mode === "governance" ? (
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
      ) : null}
      {mode === "lifecycle" ? (
        <DpmCampaignLifecycleCommandCard
          key={selectedCampaign.key}
          selectedCampaign={selectedCampaign}
          availableCampaigns={rows}
          pendingCommand={pendingLifecycleCommand}
          commandError={lifecycleCommandError}
          commandEvidence={lifecycleCommandEvidence}
          onRecordLifecycleCommand={onRecordLifecycleCommand}
        />
      ) : null}
      {mode === "launch" ? (
        <>
          <DpmCampaignLaunchPostureCard
            key={`${selectedCampaign.key}:${launchPosture.state}`}
            previewReadinessPosture={previewReadinessPosture}
            launchPosture={launchPosture}
            selectedCampaign={selectedCampaign}
            previewReadinessError={previewReadinessError}
            launchError={launchError}
            selectedLaunchPending={selectedCampaign.key === pendingLaunchKey}
            pendingLaunchKey={pendingLaunchKey}
            onLaunchCampaign={onLaunchCampaign}
          />
          <details className={styles.disclosure}>
            <summary>Launch history and replay evidence</summary>
            <DpmCampaignLaunchHistoryCard
              rows={launchHistoryRows}
              page={launchHistoryPage}
              selectedCampaign={selectedCampaign}
              error={launchHistoryError}
              pendingLaunchHistoryKey={pendingLaunchHistoryKey}
              onLoadLaunchHistory={onLoadLaunchHistory}
            />
          </details>
        </>
      ) : null}
    </div>
  );
}
