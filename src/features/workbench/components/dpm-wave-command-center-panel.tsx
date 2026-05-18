"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AnalyticsTable,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
import DpmWaveActiveRebalanceSection from "@/features/workbench/components/dpm-wave-active-rebalance-section";
import DpmCampaignDefinitionsSection, {
  CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
} from "@/features/workbench/components/dpm-campaign-definitions-section";
import DpmWaveSummaryCell from "@/features/workbench/components/dpm-wave-summary-cell";
import {
  approveDpmWave,
  createDpmWave,
  getDpmCampaignDefinitionLaunchHistory,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  handoffDpmWave,
  launchDpmCampaignDefinition,
  previewDpmWave,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
} from "@/features/workbench/api";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmWaveGatewayResponse,
} from "@/features/workbench/types";
import {
  buildDpmWaveCommandCenterModel,
  type DpmCampaignDefinitionRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  buildDpmWaveMetricTiles,
  buildDpmWaveProposedChangeRows,
  dpmWaveBadgeTone,
  dpmWaveStatePanelCopy,
  findDpmWaveMetricValue,
  formatDpmWaveDisplayDate,
  isDpmWaveActionBlocked,
  resolveDpmWaveLifecycleIndex,
} from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import {
  businessStateLabel,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  portfolioId: string;
  waveList: DpmWaveGatewayResponse | null;
  campaignDefinitions?: DpmCampaignDefinitionGatewayResponse | null;
  campaignDiscovery?: DpmCampaignDefinitionGatewayResponse | null;
  campaignDefinitionsError?: string | null;
  campaignDiscoveryError?: string | null;
  errorMessage?: string | null;
};

export default function DpmWaveCommandCenterPanel({
  portfolioId,
  waveList,
  campaignDefinitions = null,
  campaignDiscovery = null,
  campaignDefinitionsError = null,
  campaignDiscoveryError = null,
  errorMessage = null,
}: Props) {
  const [itemsResponse, setItemsResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [actionResponse, setActionResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [proofPackResponse, setProofPackResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [campaignLifecycleResponse, setCampaignLifecycleResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignLaunchHistoryResponse, setCampaignLaunchHistoryResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignLaunchPackageResponse, setCampaignLaunchPackageResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignLaunchResponse, setCampaignLaunchResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingCampaignLifecycleKey, setPendingCampaignLifecycleKey] = useState<string | null>(null);
  const [pendingCampaignLaunchHistoryKey, setPendingCampaignLaunchHistoryKey] = useState<string | null>(null);
  const [pendingCampaignLaunchPackageKey, setPendingCampaignLaunchPackageKey] = useState<string | null>(null);
  const [pendingCampaignLaunchKey, setPendingCampaignLaunchKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [campaignLifecycleError, setCampaignLifecycleError] = useState<string | null>(null);
  const [campaignLaunchHistoryError, setCampaignLaunchHistoryError] = useState<string | null>(null);
  const [campaignLaunchError, setCampaignLaunchError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [autoLoadedWaveId, setAutoLoadedWaveId] = useState<string | null>(null);
  const [selectedCampaignKey, setSelectedCampaignKey] = useState<string | null>(null);

  const model = buildDpmWaveCommandCenterModel({
    waveList,
    waveDetail: proofPackResponse,
    waveItems: itemsResponse,
    actionResponse,
    campaignDefinitions,
    campaignDiscovery,
    campaignLifecycleEvents: campaignLifecycleResponse,
    campaignLaunchHistory: campaignLaunchHistoryResponse,
    campaignLaunchPackage: campaignLaunchPackageResponse,
    campaignLaunchResponse,
  });
  const selectedWaveId = model.selectedWaveId;
  const lifecycleIndex = resolveDpmWaveLifecycleIndex(model.selectedWaveState);
  const approvalBlocked =
    isDpmWaveActionBlocked(model.blockedActions, "approve") ||
    Number.parseInt(model.selectedWaveIssueCount.replaceAll(",", ""), 10) > 0 ||
    model.reasonCodes.length > 0 ||
    model.state === "blocked" ||
    model.state === "partial";
  const stagingBlocked = isDpmWaveActionBlocked(model.blockedActions, "stage");
  const handoffBlocked = isDpmWaveActionBlocked(model.blockedActions, "handoff");
  const proofState =
    model.proofPackRows.length > 0 || proofPackResponse
      ? "READY"
      : model.reportInputStatus !== "NOT_REQUESTED"
        ? model.reportInputStatus
        : "AVAILABLE";
  const stateCopy = dpmWaveStatePanelCopy(model.state, portfolioId);
  const shouldShowStatePanel =
    Boolean(errorMessage) ||
    Boolean(actionError) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "blocked" ||
    model.state === "unavailable";
  const proposedRows = useMemo(() => buildDpmWaveProposedChangeRows(model.itemRows), [model.itemRows]);
  const metricTiles = buildDpmWaveMetricTiles(
    model.metricRows,
    model.selectedWaveItemCount,
    model.selectedWaveIssueCount
  );
  const asOfDate = formatDpmWaveDisplayDate(model.summaryRows[0]?.asOfDate);
  const selectedCampaign =
    model.campaignRows.find((row) => row.key === selectedCampaignKey) ?? model.campaignRows[0] ?? null;

  useEffect(() => {
    if (!selectedWaveId || autoLoadedWaveId === selectedWaveId || itemsResponse || pendingAction) {
      return;
    }
    setAutoLoadedWaveId(selectedWaveId);
    getDpmWaveItems(selectedWaveId)
      .then(setItemsResponse)
      .catch(() => {
        setAutoLoadedWaveId(null);
      });
  }, [autoLoadedWaveId, itemsResponse, pendingAction, selectedWaveId]);

  useEffect(() => {
    if (!selectedCampaignKey && model.campaignRows[0]) {
      setSelectedCampaignKey(model.campaignRows[0].key);
    }
  }, [model.campaignRows, selectedCampaignKey]);

  async function runAction(label: string, action: () => Promise<DpmWaveGatewayResponse>) {
    if (pendingAction) {
      return;
    }
    setPendingAction(label);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await action();
      setActionResponse(response);
      setActionMessage(`${label} completed.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setPendingAction(null);
    }
  }

  function previewRebalance() {
    void runAction("Preview", () => previewDpmWave({ portfolioId }));
  }

  function createRebalance() {
    void runAction("Create rebalance", () => createDpmWave({ portfolioId }));
  }

  function loadProposedChanges() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Load proposed changes", async () => {
      const response = await getDpmWaveItems(selectedWaveId);
      setItemsResponse(response);
      return response;
    });
  }

  function reviewDataReadiness() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Review data", () => sourceCheckDpmWave(selectedWaveId));
  }

  function runSimulation() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Simulate", () => simulateDpmWave(selectedWaveId));
  }

  function requestApproval() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Request approval", () => approveDpmWave(selectedWaveId));
  }

  function stageRebalance() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Stage rebalance", () => stageDpmWave(selectedWaveId));
  }

  function prepareHandoff() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Prepare handoff", () => handoffDpmWave(selectedWaveId));
  }

  function openEvidencePack() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Open evidence pack", async () => {
      const response = await getDpmWaveProofPackPosture(selectedWaveId);
      setProofPackResponse(response);
      return response;
    });
  }

  async function loadCampaignLifecycle(row: DpmCampaignDefinitionRow) {
    if (pendingCampaignLifecycleKey) {
      return;
    }
    setSelectedCampaignKey(row.key);
    setPendingCampaignLifecycleKey(row.key);
    setCampaignLifecycleError(null);
    setCampaignLifecycleResponse(null);
    try {
      const response = await getDpmCampaignDefinitionLifecycleEvents({
        campaignId: row.campaignId,
        campaignVersion: row.campaignVersion,
      });
      setCampaignLifecycleResponse(response);
    } catch (error) {
      setCampaignLifecycleError(
        error instanceof Error ? error.message : "Campaign lifecycle evidence could not be loaded."
      );
    } finally {
      setPendingCampaignLifecycleKey(null);
    }
  }

  async function loadCampaignLaunchHistory(row: DpmCampaignDefinitionRow, offset = 0) {
    if (pendingCampaignLaunchHistoryKey) {
      return;
    }
    setSelectedCampaignKey(row.key);
    setPendingCampaignLaunchHistoryKey(row.key);
    setCampaignLaunchHistoryError(null);
    setCampaignLaunchHistoryResponse(null);
    try {
      const response = await getDpmCampaignDefinitionLaunchHistory({
        campaignId: row.campaignId,
        campaignVersion: row.campaignVersion,
        limit: CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
        offset,
      });
      setCampaignLaunchHistoryResponse(response);
    } catch (error) {
      setCampaignLaunchHistoryError(
        error instanceof Error ? error.message : "Campaign launch history could not be loaded."
      );
    } finally {
      setPendingCampaignLaunchHistoryKey(null);
    }
  }

  async function checkCampaignLaunchReadiness(row: DpmCampaignDefinitionRow) {
    if (pendingCampaignLaunchPackageKey || pendingCampaignLaunchKey) {
      return;
    }
    setSelectedCampaignKey(row.key);
    setPendingCampaignLaunchPackageKey(row.key);
    setCampaignLaunchError(null);
    setCampaignLaunchPackageResponse(null);
    setCampaignLaunchResponse(null);
    try {
      const response = await getDpmCampaignDefinitionLaunchPackage({
        campaignId: row.campaignId,
        campaignVersion: row.campaignVersion,
        requestedAsOfDate: row.asOfDate === "N/A" ? undefined : row.asOfDate,
      });
      setCampaignLaunchPackageResponse(response);
    } catch (error) {
      setCampaignLaunchError(
        error instanceof Error ? error.message : "Campaign launch readiness could not be loaded."
      );
    } finally {
      setPendingCampaignLaunchPackageKey(null);
    }
  }

  async function launchCampaign(row: DpmCampaignDefinitionRow) {
    if (pendingCampaignLaunchKey || !model.campaignLaunchPosture.canLaunch) {
      return;
    }
    setSelectedCampaignKey(row.key);
    setPendingCampaignLaunchKey(row.key);
    setCampaignLaunchError(null);
    try {
      const response = await launchDpmCampaignDefinition({
        campaignId: row.campaignId,
        campaignVersion: row.campaignVersion,
        requestedAsOfDate: row.asOfDate === "N/A" ? undefined : row.asOfDate,
      });
      setCampaignLaunchResponse(response);
      setActionResponse(response);
    } catch (error) {
      setCampaignLaunchError(error instanceof Error ? error.message : "Campaign launch failed.");
    } finally {
      setPendingCampaignLaunchKey(null);
    }
  }

  return (
    <SectionBlock
      title="Rebalance"
      subtitle="Proposed rebalance, advisor review, and approval readiness."
      className="dpm-wave-command-center-panel rebalance-workspace"
      actions={
        <div className="rebalance-context-row" aria-label="Rebalance context">
          <span>Discretionary Balanced</span>
          <span>USD</span>
          <span>{asOfDate}</span>
          <SemanticBadge tone={dpmWaveBadgeTone(proofState)}>Evidence available</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage || actionError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage || actionError ? "Rebalance data needs attention" : stateCopy.title}
          body={errorMessage ?? actionError ?? stateCopy.body}
        />
      ) : null}

      <div className="rebalance-summary-strip" aria-label="Rebalance readiness">
        <DpmWaveSummaryCell
          label="Rebalance Status"
          value={businessStateLabel(model.selectedWaveState)}
          tone={dpmWaveBadgeTone(model.selectedWaveState)}
        />
        <DpmWaveSummaryCell
          label="Approval Readiness"
          value={approvalBlocked ? "Blocked" : "Ready"}
          tone={approvalBlocked ? "danger" : "success"}
        />
        <DpmWaveSummaryCell label="Proposed Changes" value={model.selectedWaveItemCount} />
        <DpmWaveSummaryCell
          label="Drift Improvement"
          value={findDpmWaveMetricValue(
            model.metricRows,
            ["drift improvement", "drift reduction", "drift"],
            "Pending"
          )}
          tone="success"
        />
      </div>

      <DpmCampaignDefinitionsSection
        rows={model.campaignRows}
        lifecycleRows={model.campaignLifecycleRows}
        launchHistoryRows={model.campaignLaunchHistoryRows}
        launchHistoryPage={model.campaignLaunchHistoryPage}
        launchPosture={model.campaignLaunchPosture}
        lifecycleError={campaignLifecycleError}
        launchHistoryError={campaignLaunchHistoryError}
        launchError={campaignLaunchError}
        pendingLifecycleKey={pendingCampaignLifecycleKey}
        pendingLaunchHistoryKey={pendingCampaignLaunchHistoryKey}
        pendingLaunchPackageKey={pendingCampaignLaunchPackageKey}
        pendingLaunchKey={pendingCampaignLaunchKey}
        selectedCampaign={selectedCampaign}
        selectedCampaignKey={selectedCampaignKey}
        errorMessage={campaignDefinitionsError ?? campaignDiscoveryError}
        onLoadLifecycle={loadCampaignLifecycle}
        onLoadLaunchHistory={loadCampaignLaunchHistory}
        onCheckLaunchReadiness={checkCampaignLaunchReadiness}
        onLaunchCampaign={launchCampaign}
      />

      <div className="rebalance-main-grid">
        <DpmWaveActiveRebalanceSection
          selectedWaveId={selectedWaveId}
          selectedWaveState={model.selectedWaveState}
          lifecycleIndex={lifecycleIndex}
          approvalBlocked={approvalBlocked}
          stagingBlocked={stagingBlocked}
          handoffBlocked={handoffBlocked}
          metricTiles={metricTiles}
          pendingAction={pendingAction}
          actionMessage={actionMessage}
          onPreview={previewRebalance}
          onCreate={createRebalance}
          onReviewData={reviewDataReadiness}
          onSimulate={runSimulation}
          onRequestApproval={requestApproval}
          onStage={stageRebalance}
          onPrepareHandoff={prepareHandoff}
          onOpenEvidencePack={openEvidencePack}
        />

        <section className="rebalance-actions-card" aria-labelledby="rebalance-actions-title">
          <div className="rebalance-section-heading">
            <h3 id="rebalance-actions-title">Recommended Actions</h3>
          </div>
          <div className="rebalance-action-list">
            <RecommendedAction
              title="Review rebalance simulation"
              detail="Check proposed allocation changes against mandate drift."
            />
            <RecommendedAction
              title="Resolve mandate attention items"
              detail={
                approvalBlocked
                  ? "Clear the open mandate items before approval."
                  : "No blocking attention items remain."
              }
            />
            <RecommendedAction
              title="Open evidence pack"
              detail="Review the decision evidence before staging."
            />
          </div>
        </section>
      </div>

      <section className="rebalance-proposed-card" aria-labelledby="rebalance-proposed-title">
        <div className="rebalance-table-heading">
          <h3 id="rebalance-proposed-title">Proposed Changes</h3>
          <div>
            <button type="button" onClick={loadProposedChanges} disabled={!selectedWaveId || Boolean(pendingAction)}>
              Load Changes
            </button>
            <button type="button">Filter</button>
          </div>
        </div>
        <AnalyticsTable
          ariaLabel="Proposed rebalance changes"
          variant="portfolio"
          density="compact"
          columns={[
            { key: "security", label: "Security" },
            { key: "action", label: "Action" },
            { key: "value", label: "Est. Value", align: "right" },
            { key: "reason", label: "Reason" },
            { key: "impact", label: "Mandate Impact" },
            { key: "status", label: "Status" },
          ]}
          rows={proposedRows.map((row) => ({
            key: row.key,
            cells: [
              row.security,
              <span className={`rebalance-action rebalance-action-${row.actionTone}`} key={`${row.key}-action`}>
                {row.action}
              </span>,
              row.estimatedValue,
              row.reason,
              row.mandateImpact,
              <SemanticBadge key={`${row.key}-status`} tone={dpmWaveBadgeTone(row.status)}>
                {businessStateLabel(row.status)}
              </SemanticBadge>,
            ],
          }))}
          emptyState={{
            title: "No proposed changes loaded",
            body: "Load proposed changes after selecting a rebalance proposal.",
          }}
        />
      </section>
    </SectionBlock>
  );
}

function RecommendedAction({ title, detail }: { title: string; detail: string }) {
  return (
    <button className="rebalance-recommended-action" type="button">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <span className="material-symbols-outlined" aria-hidden="true">
        chevron_right
      </span>
    </button>
  );
}
