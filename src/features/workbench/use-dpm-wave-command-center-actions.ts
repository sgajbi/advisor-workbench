"use client";

import { useEffect, useRef, useState } from "react";
import {
  createDpmCampaignApprovalDecision,
  createDpmCampaignAssignmentAction,
  createDpmCampaignAssignmentTask,
  createDpmCampaignAssignmentTaskTransition,
  createDpmCampaignMakerCheckerControl,
  getDpmCampaignApprovalDecisions,
  getDpmCampaignAssignmentActions,
  getDpmCampaignAssignmentTasks,
  getDpmCampaignDefinitionLaunchHistory,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignDefinitionPreviewReadiness,
  getDpmCampaignMakerCheckerControls,
  launchDpmCampaignDefinition,
  listDpmCampaignDefinitions,
  retireDpmCampaignDefinition,
  supersedeDpmCampaignDefinition,
} from "@/features/workbench/dpm-wave-api";
import type { DpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import {
  campaignCommandActorId,
  type DpmCampaignLifecycleCommandInput,
  type DpmCampaignLifecycleCommandType,
  type DpmCampaignWorkflowCommandInput,
  type DpmCampaignWorkflowCommandType,
} from "@/features/workbench/dpm-campaign-command-contracts";
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
import {
  useDpmSelectedWaveSources,
  useDpmWaveListSource,
} from "@/features/workbench/use-dpm-wave-sources";
import { useDpmWaveCommands } from "@/features/workbench/use-dpm-wave-commands";

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

export type DpmCampaignWorkflowCommandEvidence = {
  commandLabel: string;
  evidenceRef: string;
  correlationId: string;
  sourceService: string;
  upstreamStatus: string;
  contentHash: string;
  reasonCodes: string;
  operatingBoundaries: string;
};

export type DpmCampaignLifecycleCommandEvidence = {
  commandLabel: string;
  status: string;
  actor: string;
  reason: string;
  replacementCampaignVersion: string;
  correlationId: string;
  sourceService: string;
  upstreamStatus: string;
  contentHash: string;
  reasonCodes: string;
  operatingBoundaries: string;
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
  pendingCampaignWorkflowEvidenceKey: string | null;
  pendingCampaignLifecycleCommand: boolean;
  pendingCampaignWorkflowCommand: boolean;
  actionError: string | null;
  sourceConfirmationRetryAvailable: boolean;
  campaignLifecycleError: string | null;
  campaignLaunchHistoryError: string | null;
  campaignPreviewReadinessError: string | null;
  campaignLaunchError: string | null;
  campaignLifecycleCommandError: string | null;
  campaignWorkflowCommandError: string | null;
  campaignWorkflowEvidenceError: string | null;
  campaignWorkflowEvidenceResolved: boolean;
  campaignLifecycleCommandEvidence: DpmCampaignLifecycleCommandEvidence | null;
  campaignWorkflowCommandEvidence: DpmCampaignWorkflowCommandEvidence | null;
  actionMessage: string | null;
  aiWorkflowOutcome: DpmAiWorkflowOutcome | null;
  previewRebalance: () => void;
  createRebalance: () => void;
  loadProposedChanges: () => void;
  reviewDataReadiness: () => void;
  runSimulation: () => void;
  requestApproval: () => void;
  stageRebalance: () => void;
  prepareHandoff: () => void;
  openEvidencePack: () => void;
  requestWaveMemo: () => void;
  requestOperationsBrief: () => void;
  retrySourceConfirmation: () => void;
  selectCampaign: (row: DpmCampaignDefinitionRow) => void;
  loadCampaignWorkflowEvidence: (row: DpmCampaignDefinitionRow) => Promise<void>;
  loadCampaignLifecycle: (row: DpmCampaignDefinitionRow) => Promise<void>;
  loadCampaignLaunchHistory: (
    row: DpmCampaignDefinitionRow,
    offset?: number
  ) => Promise<void>;
  checkCampaignLaunchReadiness: (row: DpmCampaignDefinitionRow) => Promise<void>;
  launchCampaign: (row: DpmCampaignDefinitionRow) => Promise<void>;
  recordCampaignLifecycleCommand: (
    command: DpmCampaignLifecycleCommandInput
  ) => Promise<void>;
  recordCampaignWorkflowCommand: (
    command: DpmCampaignWorkflowCommandInput
  ) => Promise<void>;
};

type SelectedCampaignState = {
  campaignRowKey: string;
  selectedCampaignKey: string | null;
};

type WaveBoundValue<T> = {
  waveId: string;
  value: T;
};

type CampaignBoundValue<T> = {
  campaignKey: string;
  value: T;
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
  const waveListSource = useDpmWaveListSource({ waveList });
  const serverSelectedWaveId = selectedWaveIdForResponse(waveListSource.serverWaveList);
  const querySelectedWaveId = selectedWaveIdForResponse(waveListSource.queryWaveList);
  const commandSourceWaveId =
    serverSelectedWaveId && serverSelectedWaveId !== querySelectedWaveId
      ? serverSelectedWaveId
      : querySelectedWaveId ?? serverSelectedWaveId;
  const waveCommands = useDpmWaveCommands({
    portfolioId,
    selectedWaveId: commandSourceWaveId,
    listQueryKey: waveListSource.listQueryKey,
    allowRetainedSelection: waveListSource.serverWaveList !== null,
  });
  const commandSelectedWaveId = selectedWaveIdForResponse(waveCommands.actionResponse);
  const selectedSourceWaveId =
    commandSelectedWaveId ?? waveCommands.activeWaveId ?? commandSourceWaveId;
  const waveSources = useDpmSelectedWaveSources(
    selectedSourceWaveId,
    waveCommands.retainedSelectionActive,
  );
  const governedWaveList =
    commandSelectedWaveId && commandSelectedWaveId === querySelectedWaveId
      ? waveListSource.queryWaveList
      : serverSelectedWaveId && serverSelectedWaveId !== querySelectedWaveId
        ? waveListSource.serverWaveList
        : waveListSource.queryWaveList ?? waveListSource.serverWaveList;
  const selectedWaveList =
    waveCommands.retainedSelectionActive &&
    selectedWaveIdForResponse(governedWaveList) !== selectedSourceWaveId
      ? null
      : governedWaveList;
  const [waveReadFeedback, setWaveReadFeedback] =
    useState<WaveBoundValue<string> | null>(null);
  const [waveReadPending, setWaveReadPending] =
    useState<WaveBoundValue<string> | null>(null);
  const [campaignLifecycleResponse, setCampaignLifecycleResponse] =
    useState<CampaignBoundValue<DpmCampaignDefinitionGatewayResponse> | null>(null);
  const [campaignLaunchHistoryResponse, setCampaignLaunchHistoryResponse] =
    useState<CampaignBoundValue<DpmCampaignDefinitionGatewayResponse> | null>(null);
  const [campaignPreviewReadinessResponse, setCampaignPreviewReadinessResponse] =
    useState<CampaignBoundValue<DpmCampaignDefinitionGatewayResponse> | null>(null);
  const [campaignLaunchPackageResponse, setCampaignLaunchPackageResponse] =
    useState<CampaignBoundValue<DpmCampaignDefinitionGatewayResponse> | null>(null);
  const [campaignLaunchResponse, setCampaignLaunchResponse] =
    useState<CampaignBoundValue<DpmWaveGatewayResponse> | null>(null);
  const [campaignDefinitionsResponse, setCampaignDefinitionsResponse] =
    useState<DpmCampaignDefinitionGatewayResponse | null>(null);
  const [campaignApprovalDecisionsResponse, setCampaignApprovalDecisionsResponse] =
    useState<CampaignBoundValue<DpmCampaignWorkflowGatewayResponse> | null>(null);
  const [campaignAssignmentActionsResponse, setCampaignAssignmentActionsResponse] =
    useState<CampaignBoundValue<DpmCampaignWorkflowGatewayResponse> | null>(null);
  const [campaignAssignmentTasksResponse, setCampaignAssignmentTasksResponse] =
    useState<CampaignBoundValue<DpmCampaignWorkflowGatewayResponse> | null>(null);
  const [campaignMakerCheckerControlsResponse, setCampaignMakerCheckerControlsResponse] =
    useState<CampaignBoundValue<DpmCampaignWorkflowGatewayResponse> | null>(null);
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
  const [pendingCampaignWorkflowEvidenceKey, setPendingCampaignWorkflowEvidenceKey] =
    useState<string | null>(null);
  const [pendingCampaignLifecycleCommand, setPendingCampaignLifecycleCommand] =
    useState<string | null>(null);
  const [pendingCampaignWorkflowCommand, setPendingCampaignWorkflowCommand] =
    useState<string | null>(null);
  const [campaignLifecycleError, setCampaignLifecycleError] =
    useState<CampaignBoundValue<string> | null>(null);
  const [campaignLaunchHistoryError, setCampaignLaunchHistoryError] =
    useState<CampaignBoundValue<string> | null>(null);
  const [campaignPreviewReadinessError, setCampaignPreviewReadinessError] =
    useState<CampaignBoundValue<string> | null>(null);
  const [campaignLaunchError, setCampaignLaunchError] =
    useState<CampaignBoundValue<string> | null>(null);
  const [campaignLifecycleCommandError, setCampaignLifecycleCommandError] =
    useState<CampaignBoundValue<string> | null>(null);
  const [campaignWorkflowCommandError, setCampaignWorkflowCommandError] =
    useState<CampaignBoundValue<string> | null>(null);
  const [campaignWorkflowEvidenceError, setCampaignWorkflowEvidenceError] =
    useState<CampaignBoundValue<string> | null>(null);
  const [campaignWorkflowEvidenceResolvedKey, setCampaignWorkflowEvidenceResolvedKey] =
    useState<string | null>(null);
  const [campaignLifecycleCommandEvidence, setCampaignLifecycleCommandEvidence] =
    useState<CampaignBoundValue<DpmCampaignLifecycleCommandEvidence> | null>(null);
  const [campaignWorkflowCommandEvidence, setCampaignWorkflowCommandEvidence] =
    useState<CampaignBoundValue<DpmCampaignWorkflowCommandEvidence> | null>(null);
  const selectedCampaignKeyRef = useRef<string | null>(null);
  const campaignRequestSequenceRef = useRef<Record<string, number>>({});
  const [selectedCampaignState, setSelectedCampaignState] =
    useState<SelectedCampaignState>({
      campaignRowKey: "",
      selectedCampaignKey: null,
    });

  const commonModelInput = {
    selectedWaveId: selectedSourceWaveId,
    waveList: selectedWaveList,
    waveDetail: waveSources.waveDetail,
    waveDetailSourceWaveId: selectedSourceWaveId,
    waveProofPack: waveSources.proofPack,
    waveProofPackSourceWaveId: selectedSourceWaveId,
    waveItems: waveSources.waveItems,
    waveItemsSourceWaveId: selectedSourceWaveId,
    actionResponse: waveSources.waveDetail ? null : waveCommands.actionResponse,
    waveAiMemo: waveCommands.waveAiMemo,
    waveAiMemoSourceWaveId: selectedSourceWaveId,
    operationsHandoffSummary: waveCommands.operationsHandoffSummary,
    operationsHandoffSummarySourceWaveId: selectedSourceWaveId,
    campaignDefinitions: campaignDefinitionsResponse ?? campaignDefinitions,
    campaignDiscovery,
    campaignOperatingQueue,
    campaignApprovalInbox,
    campaignWorkflowBoard,
    campaignAssignmentPlan,
    campaignWorkflowAutomation,
  };
  const campaignListModel = buildDpmWaveCommandCenterModel(commonModelInput);
  const campaignRowKey = campaignListModel.campaignRows.map((row) => row.key).join("|");
  const selectedCampaignKey =
    selectedCampaignState.campaignRowKey === campaignRowKey &&
    campaignListModel.campaignRows.some(
      (row) => row.key === selectedCampaignState.selectedCampaignKey,
    )
      ? selectedCampaignState.selectedCampaignKey
      : campaignListModel.campaignRows[0]?.key ?? null;
  useEffect(() => {
    selectedCampaignKeyRef.current = selectedCampaignKey;
  }, [selectedCampaignKey]);
  const initialCampaignKey = campaignListModel.campaignRows[0]?.key ?? null;
  const useInitialCampaignEvidence = selectedCampaignKey === initialCampaignKey;
  const model = buildDpmWaveCommandCenterModel({
    ...commonModelInput,
    campaignLifecycleEvents: valueForSelectedCampaign(
      campaignLifecycleResponse,
      selectedCampaignKey,
    ),
    campaignLaunchHistory: valueForSelectedCampaign(
      campaignLaunchHistoryResponse,
      selectedCampaignKey,
    ),
    campaignPreviewReadiness: valueForSelectedCampaign(
      campaignPreviewReadinessResponse,
      selectedCampaignKey,
    ),
    campaignLaunchPackage: valueForSelectedCampaign(
      campaignLaunchPackageResponse,
      selectedCampaignKey,
    ),
    campaignLaunchResponse: valueForSelectedCampaign(
      campaignLaunchResponse,
      selectedCampaignKey,
    ),
    campaignApprovalDecisions:
      valueForSelectedCampaign(campaignApprovalDecisionsResponse, selectedCampaignKey) ??
      (useInitialCampaignEvidence ? campaignApprovalDecisions : null),
    campaignAssignmentActions:
      valueForSelectedCampaign(campaignAssignmentActionsResponse, selectedCampaignKey) ??
      (useInitialCampaignEvidence ? campaignAssignmentActions : null),
    campaignAssignmentTasks:
      valueForSelectedCampaign(campaignAssignmentTasksResponse, selectedCampaignKey) ??
      (useInitialCampaignEvidence ? campaignAssignmentTasks : null),
    campaignMakerCheckerControls:
      valueForSelectedCampaign(campaignMakerCheckerControlsResponse, selectedCampaignKey) ??
      (useInitialCampaignEvidence ? campaignMakerCheckerControls : null),
  });
  const selectedWaveId = model.selectedWaveId;
  const selectedCampaign =
    model.campaignRows.find((row) => row.key === selectedCampaignKey) ??
    model.campaignRows[0] ??
    null;
  const retainedWaveAwaitingConfirmation =
    waveCommands.retainedSelectionActive &&
    (waveSources.waveDetail === null ||
      waveSources.waveItems === null ||
      waveSources.detailConfirmationBlocked ||
      waveSources.itemsConfirmationBlocked);

  function selectCampaign(row: DpmCampaignDefinitionRow) {
    selectedCampaignKeyRef.current = row.key;
    setSelectedCampaignState({ campaignRowKey, selectedCampaignKey: row.key });
  }

  function beginCampaignRequest(surface: string, row: DpmCampaignDefinitionRow) {
    selectCampaign(row);
    const sequence = (campaignRequestSequenceRef.current[surface] ?? 0) + 1;
    campaignRequestSequenceRef.current[surface] = sequence;
    return { campaignKey: row.key, sequence, surface };
  }

  function isCurrentCampaignRequest(request: {
    campaignKey: string;
    sequence: number;
    surface: string;
  }) {
    return (
      selectedCampaignKeyRef.current === request.campaignKey &&
      campaignRequestSequenceRef.current[request.surface] === request.sequence
    );
  }

  function loadProposedChanges() {
    if (!selectedWaveId || waveCommands.pendingAction) {
      return;
    }
    setWaveReadFeedback(null);
    setWaveReadPending({ waveId: selectedWaveId, value: "Load proposed changes" });
    void waveSources.refreshItems().then((result) => {
      if (result.data && !result.error) {
        setWaveReadFeedback({
          waveId: selectedWaveId,
          value: "Load proposed changes completed.",
        });
      }
      setWaveReadPending((current) => (current?.waveId === selectedWaveId ? null : current));
    });
  }

  function openEvidencePack() {
    if (!selectedWaveId || waveCommands.pendingAction) {
      return;
    }
    setWaveReadFeedback(null);
    setWaveReadPending({ waveId: selectedWaveId, value: "Open evidence pack" });
    void waveSources.openProofPack().then((result) => {
      if (result.data && !result.error) {
        setWaveReadFeedback({
          waveId: selectedWaveId,
          value: "Open evidence pack completed.",
        });
      }
      setWaveReadPending((current) => (current?.waveId === selectedWaveId ? null : current));
    });
  }

  function runWaveCommand(action: () => void): void {
    setWaveReadFeedback(null);
    action();
  }

  function runSelectedWaveCommand(action: () => void): void {
    if (!retainedWaveAwaitingConfirmation) {
      runWaveCommand(action);
    }
  }

  async function loadCampaignLifecycle(row: DpmCampaignDefinitionRow) {
    if (pendingCampaignLifecycleKey) {
      return;
    }
    const request = beginCampaignRequest("lifecycle", row);
    setPendingCampaignLifecycleKey(row.key);
    setCampaignLifecycleError(null);
    setCampaignLifecycleResponse(null);
    try {
      const response = await getDpmCampaignDefinitionLifecycleEvents({
        campaignId: row.campaignId,
        campaignVersion: row.campaignVersion,
      });
      if (isCurrentCampaignRequest(request)) {
        setCampaignLifecycleResponse({ campaignKey: row.key, value: response });
      }
    } catch (error) {
      if (isCurrentCampaignRequest(request)) {
        setCampaignLifecycleError({
          campaignKey: row.key,
          value:
            error instanceof Error
              ? error.message
              : "Campaign lifecycle evidence could not be loaded.",
        });
      }
    } finally {
      setPendingCampaignLifecycleKey((current) => (current === row.key ? null : current));
    }
  }

  async function loadCampaignLaunchHistory(row: DpmCampaignDefinitionRow, offset = 0) {
    if (pendingCampaignLaunchHistoryKey) {
      return;
    }
    const request = beginCampaignRequest("launch-history", row);
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
      if (isCurrentCampaignRequest(request)) {
        setCampaignLaunchHistoryResponse({ campaignKey: row.key, value: response });
      }
    } catch (error) {
      if (isCurrentCampaignRequest(request)) {
        setCampaignLaunchHistoryError({
          campaignKey: row.key,
          value:
            error instanceof Error
              ? error.message
              : "Campaign launch history could not be loaded.",
        });
      }
    } finally {
      setPendingCampaignLaunchHistoryKey((current) => (current === row.key ? null : current));
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
    const request = beginCampaignRequest("launch-readiness", row);
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
      if (!isCurrentCampaignRequest(request)) {
        return;
      }
      setCampaignPreviewReadinessResponse({ campaignKey: row.key, value: previewReadiness });
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
        if (isCurrentCampaignRequest(request)) {
          setCampaignLaunchPackageResponse({ campaignKey: row.key, value: launchPackage });
        }
      } catch (error) {
        if (isCurrentCampaignRequest(request)) {
          setCampaignLaunchError({
            campaignKey: row.key,
            value:
              error instanceof Error
                ? error.message
                : "Campaign launch readiness could not be loaded.",
          });
        }
      }
    } catch (error) {
      if (isCurrentCampaignRequest(request)) {
        setCampaignPreviewReadinessError({
          campaignKey: row.key,
          value:
            error instanceof Error
              ? error.message
              : "Campaign preview readiness could not be loaded.",
        });
      }
    } finally {
      setPendingCampaignPreviewReadinessKey((current) =>
        current === row.key ? null : current,
      );
      setPendingCampaignLaunchPackageKey((current) =>
        current === row.key ? null : current,
      );
    }
  }

  async function launchCampaign(row: DpmCampaignDefinitionRow) {
    if (pendingCampaignLaunchKey || !model.campaignLaunchPosture.canLaunch) {
      return;
    }
    const request = beginCampaignRequest("launch", row);
    setPendingCampaignLaunchKey(row.key);
    setCampaignLaunchError(null);
    try {
      const response = await launchDpmCampaignDefinition({
        campaignId: row.campaignId,
        campaignVersion: row.campaignVersion,
        requestedAsOfDate: row.asOfDate === "N/A" ? undefined : row.asOfDate,
      });
      if (isCurrentCampaignRequest(request)) {
        setCampaignLaunchResponse({ campaignKey: row.key, value: response });
      }
    } catch (error) {
      if (isCurrentCampaignRequest(request)) {
        setCampaignLaunchError({
          campaignKey: row.key,
          value: error instanceof Error ? error.message : "Campaign launch failed.",
        });
      }
    } finally {
      setPendingCampaignLaunchKey((current) => (current === row.key ? null : current));
    }
  }

  async function refreshCampaignWorkflowEvidence(
    row: DpmCampaignDefinitionRow,
    request: { campaignKey: string; sequence: number; surface: string },
  ) {
    const params = {
      campaignId: row.campaignId,
      campaignVersion: row.campaignVersion,
    };
    const [
      approvalDecisions,
      assignmentActions,
      assignmentTasks,
      makerCheckerControls,
    ] = await Promise.all([
      getDpmCampaignApprovalDecisions(params, "client"),
      getDpmCampaignAssignmentActions(params, "client"),
      getDpmCampaignAssignmentTasks(params, "client"),
      getDpmCampaignMakerCheckerControls(params, "client"),
    ]);
    if (!isCurrentCampaignRequest(request)) {
      return;
    }
    setCampaignApprovalDecisionsResponse({ campaignKey: row.key, value: approvalDecisions });
    setCampaignAssignmentActionsResponse({ campaignKey: row.key, value: assignmentActions });
    setCampaignAssignmentTasksResponse({ campaignKey: row.key, value: assignmentTasks });
    setCampaignMakerCheckerControlsResponse({ campaignKey: row.key, value: makerCheckerControls });
    setCampaignWorkflowEvidenceResolvedKey(row.key);
  }

  async function loadCampaignWorkflowEvidence(row: DpmCampaignDefinitionRow) {
    if (pendingCampaignWorkflowEvidenceKey) {
      return;
    }
    const request = beginCampaignRequest("workflow-evidence", row);
    setPendingCampaignWorkflowEvidenceKey(row.key);
    setCampaignWorkflowEvidenceError(null);
    try {
      await refreshCampaignWorkflowEvidence(row, request);
    } catch (error) {
      if (isCurrentCampaignRequest(request)) {
        setCampaignWorkflowEvidenceResolvedKey(row.key);
        setCampaignWorkflowEvidenceError({
          campaignKey: row.key,
          value:
            error instanceof Error
              ? error.message
              : "Campaign governance evidence could not be loaded.",
        });
      }
    } finally {
      setPendingCampaignWorkflowEvidenceKey((current) =>
        current === row.key ? null : current,
      );
    }
  }

  async function recordCampaignLifecycleCommand(command: DpmCampaignLifecycleCommandInput) {
    if (pendingCampaignLifecycleCommand) {
      return;
    }
    if (!selectedCampaign) {
      return;
    }
    const campaign = selectedCampaign;
    const actorId = campaignCommandActorId(command).trim();
    const reason =
      command.commandType === "retire"
        ? command.body.retirement_reason.trim()
        : command.body.supersession_reason.trim();
    if (!actorId || !reason || !command.body.correlation_id.trim()) {
      setCampaignLifecycleCommandError({
        campaignKey: campaign.key,
        value: "Campaign lifecycle command requires actor, rationale, and correlation evidence.",
      });
      return;
    }
    if (
      command.commandType === "supersede" &&
      !command.body.superseded_by_campaign_version.trim()
    ) {
      setCampaignLifecycleCommandError({
        campaignKey: campaign.key,
        value: "Supersede requires an existing replacement campaign version.",
      });
      return;
    }
    const request = beginCampaignRequest("lifecycle-command", campaign);
    setPendingCampaignLifecycleCommand(campaign.key);
    setCampaignLifecycleCommandError(null);
    setCampaignLifecycleCommandEvidence(null);
    try {
      const response =
        command.commandType === "retire"
          ? await retireDpmCampaignDefinition({
              campaignId: campaign.campaignId,
              campaignVersion: campaign.campaignVersion,
              body: command.body,
              actorId,
            })
          : await supersedeDpmCampaignDefinition({
              campaignId: campaign.campaignId,
              campaignVersion: campaign.campaignVersion,
              body: command.body,
              actorId,
            });
      if (!isCurrentCampaignRequest(request)) {
        return;
      }
      if (isLifecycleCommandBlocked(response)) {
        setCampaignLifecycleCommandError({
          campaignKey: campaign.key,
          value: "Manage did not accept the campaign lifecycle command.",
        });
        return;
      }
      setCampaignLifecycleCommandEvidence({
        campaignKey: campaign.key,
        value: buildCampaignLifecycleCommandEvidence(command.commandType, response),
      });
      try {
        const [definitions, lifecycle] = await Promise.all([
          listDpmCampaignDefinitions({ limit: 10, offset: 0 }, "client"),
          getDpmCampaignDefinitionLifecycleEvents({
            campaignId: campaign.campaignId,
            campaignVersion: campaign.campaignVersion,
          }),
        ]);
        if (isCurrentCampaignRequest(request)) {
          setCampaignDefinitionsResponse(definitions);
          setCampaignLifecycleResponse({ campaignKey: campaign.key, value: lifecycle });
          setCampaignLifecycleError(null);
        }
      } catch {
        if (isCurrentCampaignRequest(request)) {
          setCampaignLifecycleError({
            campaignKey: campaign.key,
            value:
              "Lifecycle action was recorded, but refreshed campaign evidence could not be loaded. Reload source evidence to confirm the campaign's new lifecycle posture.",
          });
        }
      }
    } catch (error) {
      if (isCurrentCampaignRequest(request)) {
        setCampaignLifecycleCommandError({
          campaignKey: campaign.key,
          value: error instanceof Error ? error.message : "Campaign lifecycle command failed.",
        });
      }
    } finally {
      setPendingCampaignLifecycleCommand((current) =>
        current === campaign.key ? null : current,
      );
    }
  }

  async function recordCampaignWorkflowCommand(command: DpmCampaignWorkflowCommandInput) {
    if (pendingCampaignWorkflowCommand) {
      return;
    }
    if (!selectedCampaign) {
      return;
    }
    const campaign = selectedCampaign;
    if (command.commandType === "task_transition" && !command.taskRef) {
      setCampaignWorkflowCommandError({
        campaignKey: campaign.key,
        value: "Task progress requires an existing Manage task reference.",
      });
      return;
    }
    const request = beginCampaignRequest("workflow-command", campaign);
    setPendingCampaignWorkflowCommand(campaign.key);
    setCampaignWorkflowCommandError(null);
    setCampaignWorkflowCommandEvidence(null);
    try {
      const commandContext = {
        campaignId: campaign.campaignId,
        campaignVersion: campaign.campaignVersion,
        actorId: campaignCommandActorId(command),
      };
      const response =
        command.commandType === "approval_decision"
          ? await createDpmCampaignApprovalDecision({ ...commandContext, body: command.body })
          : command.commandType === "assignment_action"
            ? await createDpmCampaignAssignmentAction({ ...commandContext, body: command.body })
            : command.commandType === "assignment_task"
              ? await createDpmCampaignAssignmentTask({ ...commandContext, body: command.body })
              : command.commandType === "task_transition"
                ? await createDpmCampaignAssignmentTaskTransition({
                    ...commandContext,
                    taskRef: command.taskRef,
                    body: command.body,
                  })
                : await createDpmCampaignMakerCheckerControl({
                    ...commandContext,
                    body: command.body,
                  });
      if (!isCurrentCampaignRequest(request)) {
        return;
      }
      setCampaignWorkflowCommandEvidence({
        campaignKey: campaign.key,
        value: buildCampaignWorkflowCommandEvidence(command.commandType, response),
      });
      try {
        await refreshCampaignWorkflowEvidence(campaign, request);
        if (isCurrentCampaignRequest(request)) {
          setCampaignWorkflowEvidenceError(null);
        }
      } catch {
        if (isCurrentCampaignRequest(request)) {
          setCampaignWorkflowEvidenceResolvedKey(campaign.key);
          setCampaignWorkflowEvidenceError({
            campaignKey: campaign.key,
            value:
              "Governance action was recorded, but refreshed source evidence could not be loaded. Reload source evidence before recording another governance action.",
          });
        }
      }
    } catch (error) {
      if (isCurrentCampaignRequest(request)) {
        setCampaignWorkflowCommandError({
          campaignKey: campaign.key,
          value: error instanceof Error ? error.message : "Campaign workflow command failed.",
        });
      }
    } finally {
      setPendingCampaignWorkflowCommand((current) =>
        current === campaign.key ? null : current,
      );
    }
  }

  return {
    model,
    selectedCampaign,
    selectedCampaignKey,
    pendingAction:
      waveCommands.pendingAction ??
      (retainedWaveAwaitingConfirmation
        ? "Awaiting rebalance source confirmation"
        : null) ??
      valueForSelectedWave(waveReadPending, selectedWaveId),
    pendingCampaignLifecycleKey,
    pendingCampaignLaunchHistoryKey,
    pendingCampaignPreviewReadinessKey,
    pendingCampaignLaunchPackageKey,
    pendingCampaignLaunchKey,
    pendingCampaignWorkflowEvidenceKey,
    pendingCampaignLifecycleCommand: pendingCampaignLifecycleCommand === selectedCampaignKey,
    pendingCampaignWorkflowCommand: pendingCampaignWorkflowCommand === selectedCampaignKey,
    actionError: waveCommands.actionError ?? waveSources.sourceError,
    sourceConfirmationRetryAvailable:
      waveCommands.confirmationRecoveryAvailable ||
      (waveCommands.retainedSelectionActive &&
        (waveSources.detailConfirmationFailed || waveSources.itemsConfirmationFailed)),
    campaignLifecycleError: valueForSelectedCampaign(campaignLifecycleError, selectedCampaignKey),
    campaignLaunchHistoryError: valueForSelectedCampaign(
      campaignLaunchHistoryError,
      selectedCampaignKey,
    ),
    campaignPreviewReadinessError: valueForSelectedCampaign(
      campaignPreviewReadinessError,
      selectedCampaignKey,
    ),
    campaignLaunchError: valueForSelectedCampaign(campaignLaunchError, selectedCampaignKey),
    campaignLifecycleCommandError: valueForSelectedCampaign(
      campaignLifecycleCommandError,
      selectedCampaignKey,
    ),
    campaignWorkflowCommandError: valueForSelectedCampaign(
      campaignWorkflowCommandError,
      selectedCampaignKey,
    ),
    campaignWorkflowEvidenceError: valueForSelectedCampaign(
      campaignWorkflowEvidenceError,
      selectedCampaignKey,
    ),
    campaignWorkflowEvidenceResolved:
      Boolean(selectedCampaignKey) && campaignWorkflowEvidenceResolvedKey === selectedCampaignKey,
    campaignLifecycleCommandEvidence: valueForSelectedCampaign(
      campaignLifecycleCommandEvidence,
      selectedCampaignKey,
    ),
    campaignWorkflowCommandEvidence: valueForSelectedCampaign(
      campaignWorkflowCommandEvidence,
      selectedCampaignKey,
    ),
    actionMessage:
      valueForSelectedWave(waveReadFeedback, selectedWaveId) ?? waveCommands.actionMessage,
    aiWorkflowOutcome: waveCommands.aiWorkflowOutcome,
    previewRebalance: () => runWaveCommand(waveCommands.previewRebalance),
    createRebalance: () => runWaveCommand(waveCommands.createRebalance),
    loadProposedChanges: () => runSelectedWaveCommand(loadProposedChanges),
    reviewDataReadiness: () =>
      runSelectedWaveCommand(waveCommands.reviewDataReadiness),
    runSimulation: () => runSelectedWaveCommand(waveCommands.runSimulation),
    requestApproval: () => runSelectedWaveCommand(waveCommands.requestApproval),
    stageRebalance: () => runSelectedWaveCommand(waveCommands.stageRebalance),
    prepareHandoff: () => runSelectedWaveCommand(waveCommands.prepareHandoff),
    openEvidencePack: () => runSelectedWaveCommand(openEvidencePack),
    requestWaveMemo: () => runSelectedWaveCommand(waveCommands.requestWaveMemo),
    requestOperationsBrief: () =>
      runSelectedWaveCommand(waveCommands.requestOperationsBrief),
    retrySourceConfirmation: () => {
      const recoverCommandConfirmation = waveCommands.confirmationRecoveryAvailable;
      if (!recoverCommandConfirmation && !waveCommands.retainedSelectionActive) {
        return;
      }
      const detailRecovery =
        recoverCommandConfirmation || waveSources.detailConfirmationFailed
          ? waveSources.reconfirmDetail()
          : null;
      const itemsRecovery =
        recoverCommandConfirmation || waveSources.itemsConfirmationFailed
          ? waveSources.refreshItems()
          : null;
      void Promise.all([detailRecovery, itemsRecovery]).then((results) => {
        if (
          recoverCommandConfirmation &&
          results.every((result) => result === null || result.error === null)
        ) {
          void waveCommands.confirmSourceRecovery();
        }
      });
    },
    selectCampaign,
    loadCampaignWorkflowEvidence,
    loadCampaignLifecycle,
    loadCampaignLaunchHistory,
    checkCampaignLaunchReadiness,
    launchCampaign,
    recordCampaignLifecycleCommand,
    recordCampaignWorkflowCommand,
  };
}

function valueForSelectedWave<T>(
  boundValue: WaveBoundValue<T> | null,
  selectedWaveId: string | null,
): T | null {
  return boundValue?.waveId === selectedWaveId ? boundValue.value : null;
}

function selectedWaveIdForResponse(response: DpmWaveGatewayResponse | null): string | null {
  return buildDpmWaveCommandCenterModel({ waveList: response }).selectedWaveId;
}

function valueForSelectedCampaign<T>(
  boundValue: CampaignBoundValue<T> | null,
  selectedCampaignKey: string | null,
): T | null {
  return boundValue?.campaignKey === selectedCampaignKey ? boundValue.value : null;
}

function buildCampaignLifecycleCommandEvidence(
  commandType: DpmCampaignLifecycleCommandType,
  response: DpmCampaignDefinitionGatewayResponse
): DpmCampaignLifecycleCommandEvidence {
  const data = response.data;
  return {
    commandLabel: commandType === "retire" ? "Retire campaign" : "Supersede campaign",
    status: readString(data.status) || readString(data.supportability_state) || "N/A",
    actor:
      readString(data.retired_by) ||
      readString(data.superseded_by) ||
      readString(data.actor_id) ||
      readString(data.actor) ||
      "N/A",
    reason:
      readString(data.retirement_reason) ||
      readString(data.supersession_reason) ||
      formatList(data.reason_codes),
    replacementCampaignVersion:
      readString(data.superseded_by_campaign_version) ||
      readString(data.replacement_campaign_version) ||
      "N/A",
    correlationId: readString(data.correlation_id) || response.correlation_id,
    sourceService: response.source_service,
    upstreamStatus: String(response.upstream_status),
    contentHash: readString(data.content_hash) || "N/A",
    reasonCodes: formatList(data.reason_codes),
    operatingBoundaries: formatList(data.operating_boundaries),
  };
}

function isLifecycleCommandBlocked(response: DpmCampaignDefinitionGatewayResponse): boolean {
  const state = readString(response.data.supportability_state).toUpperCase();
  return state === "BLOCKED" || state === "UNSUPPORTED" || state === "NOT_SUPPORTED";
}

function buildCampaignWorkflowCommandEvidence(
  commandType: DpmCampaignWorkflowCommandType,
  response: DpmCampaignWorkflowGatewayResponse
): DpmCampaignWorkflowCommandEvidence {
  const data = response.data;
  return {
    commandLabel: campaignWorkflowCommandLabel(commandType),
    evidenceRef:
      readString(data.evidence_ref) ||
      readString(data.decision_ref) ||
      readString(data.action_ref) ||
      readString(data.task_ref) ||
      readString(data.control_ref) ||
      "N/A",
    correlationId: response.correlation_id,
    sourceService: response.source_service,
    upstreamStatus: String(response.upstream_status),
    contentHash: readString(data.content_hash) || response.supportability?.content_hash || "N/A",
    reasonCodes: formatList(data.reason_codes),
    operatingBoundaries: formatList(data.operating_boundaries),
  };
}

function campaignWorkflowCommandLabel(commandType: DpmCampaignWorkflowCommandType): string {
  switch (commandType) {
    case "approval_decision":
      return "Approval decision";
    case "assignment_action":
      return "Assignment action";
    case "assignment_task":
      return "Assignment task";
    case "task_transition":
      return "Task transition";
    case "maker_checker_control":
      return "Maker-checker control";
  }
}

function readString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function formatList(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (!Array.isArray(value)) {
    return "N/A";
  }
  const values = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return values.length > 0 ? values.join(", ") : "N/A";
}
