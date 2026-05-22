"use client";

import { useEffect, useState } from "react";
import {
  approveDpmWave,
  createDpmWave,
  getDpmCampaignDefinitionLaunchHistory,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignDefinitionPreviewReadiness,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  handoffDpmWave,
  launchDpmCampaignDefinition,
  previewDpmWave,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
} from "@/features/workbench/dpm-wave-api";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
  DpmWaveGatewayResponse,
} from "@/features/workbench/types";
import {
  buildDpmWaveCommandCenterModel,
  type DpmCampaignDefinitionRow,
  type DpmWaveCommandCenterPanelModel,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import { CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE } from "@/features/workbench/dpm-campaign-launch-history-constants";

type UseDpmWaveCommandCenterActionsInput = {
  portfolioId: string;
  waveList: DpmWaveGatewayResponse | null;
  campaignDefinitions?: DpmCampaignDefinitionGatewayResponse | null;
  campaignDiscovery?: DpmCampaignDefinitionGatewayResponse | null;
  campaignOperatingQueue?: DpmCampaignWorkflowGatewayResponse | null;
  campaignApprovalInbox?: DpmCampaignWorkflowGatewayResponse | null;
  campaignWorkflowBoard?: DpmCampaignWorkflowGatewayResponse | null;
  campaignAssignmentPlan?: DpmCampaignWorkflowGatewayResponse | null;
  campaignWorkflowAutomation?: DpmCampaignWorkflowGatewayResponse | null;
  campaignApprovalDecisions?: DpmCampaignWorkflowGatewayResponse | null;
  campaignAssignmentActions?: DpmCampaignWorkflowGatewayResponse | null;
  campaignAssignmentTasks?: DpmCampaignWorkflowGatewayResponse | null;
  campaignMakerCheckerControls?: DpmCampaignWorkflowGatewayResponse | null;
};

type UseDpmWaveCommandCenterActionsResult = {
  model: DpmWaveCommandCenterPanelModel;
  selectedCampaign: DpmCampaignDefinitionRow | null;
  selectedCampaignKey: string | null;
  pendingAction: string | null;
  pendingCampaignLifecycleKey: string | null;
  pendingCampaignLaunchHistoryKey: string | null;
  pendingCampaignPreviewReadinessKey: string | null;
  pendingCampaignLaunchPackageKey: string | null;
  pendingCampaignLaunchKey: string | null;
  actionError: string | null;
  proofPackLoaded: boolean;
  campaignLifecycleError: string | null;
  campaignLaunchHistoryError: string | null;
  campaignPreviewReadinessError: string | null;
  campaignLaunchError: string | null;
  actionMessage: string | null;
  previewRebalance: () => void;
  createRebalance: () => void;
  loadProposedChanges: () => void;
  reviewDataReadiness: () => void;
  runSimulation: () => void;
  requestApproval: () => void;
  stageRebalance: () => void;
  prepareHandoff: () => void;
  openEvidencePack: () => void;
  loadCampaignLifecycle: (row: DpmCampaignDefinitionRow) => Promise<void>;
  loadCampaignLaunchHistory: (
    row: DpmCampaignDefinitionRow,
    offset?: number
  ) => Promise<void>;
  checkCampaignLaunchReadiness: (row: DpmCampaignDefinitionRow) => Promise<void>;
  launchCampaign: (row: DpmCampaignDefinitionRow) => Promise<void>;
};

export function useDpmWaveCommandCenterActions({
  portfolioId,
  waveList,
  campaignDefinitions = null,
  campaignDiscovery = null,
  campaignOperatingQueue = null,
  campaignApprovalInbox = null,
  campaignWorkflowBoard = null,
  campaignAssignmentPlan = null,
  campaignWorkflowAutomation = null,
  campaignApprovalDecisions = null,
  campaignAssignmentActions = null,
  campaignAssignmentTasks = null,
  campaignMakerCheckerControls = null,
}: UseDpmWaveCommandCenterActionsInput): UseDpmWaveCommandCenterActionsResult {
  const [itemsResponse, setItemsResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [actionResponse, setActionResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [proofPackResponse, setProofPackResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [campaignLifecycleResponse, setCampaignLifecycleResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignLaunchHistoryResponse, setCampaignLaunchHistoryResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignPreviewReadinessResponse, setCampaignPreviewReadinessResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignLaunchPackageResponse, setCampaignLaunchPackageResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignLaunchResponse, setCampaignLaunchResponse] =
    useState<DpmWaveGatewayResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingCampaignLifecycleKey, setPendingCampaignLifecycleKey] =
    useState<string | null>(null);
  const [pendingCampaignLaunchHistoryKey, setPendingCampaignLaunchHistoryKey] =
    useState<string | null>(null);
  const [pendingCampaignPreviewReadinessKey, setPendingCampaignPreviewReadinessKey] =
    useState<string | null>(null);
  const [pendingCampaignLaunchPackageKey, setPendingCampaignLaunchPackageKey] =
    useState<string | null>(null);
  const [pendingCampaignLaunchKey, setPendingCampaignLaunchKey] =
    useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [campaignLifecycleError, setCampaignLifecycleError] = useState<string | null>(null);
  const [campaignLaunchHistoryError, setCampaignLaunchHistoryError] =
    useState<string | null>(null);
  const [campaignPreviewReadinessError, setCampaignPreviewReadinessError] =
    useState<string | null>(null);
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
    campaignPreviewReadiness: campaignPreviewReadinessResponse,
    campaignLaunchPackage: campaignLaunchPackageResponse,
    campaignLaunchResponse,
    campaignOperatingQueue,
    campaignApprovalInbox,
    campaignWorkflowBoard,
    campaignAssignmentPlan,
    campaignWorkflowAutomation,
    campaignApprovalDecisions,
    campaignAssignmentActions,
    campaignAssignmentTasks,
    campaignMakerCheckerControls,
  });
  const selectedWaveId = model.selectedWaveId;
  const selectedCampaign =
    model.campaignRows.find((row) => row.key === selectedCampaignKey) ??
    model.campaignRows[0] ??
    null;

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
    if (
      pendingCampaignPreviewReadinessKey ||
      pendingCampaignLaunchPackageKey ||
      pendingCampaignLaunchKey
    ) {
      return;
    }
    setSelectedCampaignKey(row.key);
    setPendingCampaignPreviewReadinessKey(row.key);
    setPendingCampaignLaunchPackageKey(row.key);
    setCampaignPreviewReadinessError(null);
    setCampaignLaunchError(null);
    setCampaignPreviewReadinessResponse(null);
    setCampaignLaunchPackageResponse(null);
    setCampaignLaunchResponse(null);
    try {
      const requestedAsOfDate = row.asOfDate === "N/A" ? undefined : row.asOfDate;
      const previewReadiness = await getDpmCampaignDefinitionPreviewReadiness({
        campaignId: row.campaignId,
        campaignVersion: row.campaignVersion,
        requestedAsOfDate,
      });
      setCampaignPreviewReadinessResponse(previewReadiness);
      const readinessState =
        typeof previewReadiness.data.supportability_state === "string"
          ? previewReadiness.data.supportability_state.toUpperCase()
          : "";
      if (readinessState !== "READY") {
        return;
      }
      try {
        const launchPackage = await getDpmCampaignDefinitionLaunchPackage({
          campaignId: row.campaignId,
          campaignVersion: row.campaignVersion,
          requestedAsOfDate,
        });
        setCampaignLaunchPackageResponse(launchPackage);
      } catch (error) {
        setCampaignLaunchError(
          error instanceof Error ? error.message : "Campaign launch readiness could not be loaded."
        );
      }
    } catch (error) {
      setCampaignPreviewReadinessError(
        error instanceof Error ? error.message : "Campaign preview readiness could not be loaded."
      );
    } finally {
      setPendingCampaignPreviewReadinessKey(null);
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

  return {
    model,
    selectedCampaign,
    selectedCampaignKey,
    pendingAction,
    pendingCampaignLifecycleKey,
    pendingCampaignLaunchHistoryKey,
    pendingCampaignPreviewReadinessKey,
    pendingCampaignLaunchPackageKey,
    pendingCampaignLaunchKey,
    actionError,
    proofPackLoaded: Boolean(proofPackResponse),
    campaignLifecycleError,
    campaignLaunchHistoryError,
    campaignPreviewReadinessError,
    campaignLaunchError,
    actionMessage,
    previewRebalance,
    createRebalance,
    loadProposedChanges,
    reviewDataReadiness,
    runSimulation,
    requestApproval,
    stageRebalance,
    prepareHandoff,
    openEvidencePack,
    loadCampaignLifecycle,
    loadCampaignLaunchHistory,
    checkCampaignLaunchReadiness,
    launchCampaign,
  };
}
