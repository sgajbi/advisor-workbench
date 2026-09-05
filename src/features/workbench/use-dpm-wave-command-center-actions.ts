"use client";

import { useState } from "react";
import type { DpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import {
  type DpmCampaignLifecycleCommandInput,
  type DpmCampaignWorkflowCommandInput,
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
import {
  useDpmCampaignDefinitionsSource,
  useDpmCampaignSources,
} from "@/features/workbench/use-dpm-campaign-sources";
import {
  useDpmCampaignCommands,
  type DpmCampaignLifecycleCommandEvidence,
  type DpmCampaignWorkflowCommandEvidence,
} from "@/features/workbench/use-dpm-campaign-commands";
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

export type {
  DpmCampaignLifecycleCommandEvidence,
  DpmCampaignWorkflowCommandEvidence,
} from "@/features/workbench/use-dpm-campaign-commands";

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
  loadCampaignWorkflowEvidence: (
    row: DpmCampaignDefinitionRow,
  ) => Promise<void>;
  loadCampaignLifecycle: (row: DpmCampaignDefinitionRow) => Promise<void>;
  loadCampaignLaunchHistory: (
    row: DpmCampaignDefinitionRow,
    offset?: number,
  ) => Promise<void>;
  checkCampaignLaunchReadiness: (
    row: DpmCampaignDefinitionRow,
  ) => Promise<void>;
  launchCampaign: (row: DpmCampaignDefinitionRow) => Promise<void>;
  recordCampaignLifecycleCommand: (
    command: DpmCampaignLifecycleCommandInput,
  ) => Promise<void>;
  recordCampaignWorkflowCommand: (
    command: DpmCampaignWorkflowCommandInput,
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
  const serverSelectedWaveId = selectedWaveIdForResponse(
    waveListSource.serverWaveList,
  );
  const querySelectedWaveId = selectedWaveIdForResponse(
    waveListSource.queryWaveList,
  );
  const commandSourceWaveId =
    serverSelectedWaveId && serverSelectedWaveId !== querySelectedWaveId
      ? serverSelectedWaveId
      : (querySelectedWaveId ?? serverSelectedWaveId);
  const waveCommands = useDpmWaveCommands({
    portfolioId,
    selectedWaveId: commandSourceWaveId,
    listQueryKey: waveListSource.listQueryKey,
    allowRetainedSelection: waveListSource.serverWaveList !== null,
  });
  const commandSelectedWaveId = selectedWaveIdForResponse(
    waveCommands.actionResponse,
  );
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
        : (waveListSource.queryWaveList ?? waveListSource.serverWaveList);
  const selectedWaveList =
    waveCommands.retainedSelectionActive &&
    selectedWaveIdForResponse(governedWaveList) !== selectedSourceWaveId
      ? null
      : governedWaveList;
  const [waveReadFeedback, setWaveReadFeedback] =
    useState<WaveBoundValue<string> | null>(null);
  const [waveReadPending, setWaveReadPending] =
    useState<WaveBoundValue<string> | null>(null);
  const [selectedCampaignState, setSelectedCampaignState] =
    useState<SelectedCampaignState>({
      campaignRowKey: "",
      selectedCampaignKey: null,
    });
  const governedCampaignDefinitions = useDpmCampaignDefinitionsSource(
    campaignDefinitions,
  );
  const initialCampaignKey = buildDpmWaveCommandCenterModel({
    waveList: null,
    campaignDefinitions,
  }).campaignRows[0]?.key ?? null;

  const commonModelInput = {
    selectedWaveId: selectedSourceWaveId,
    waveList: selectedWaveList,
    waveDetail: waveSources.waveDetail,
    waveDetailSourceWaveId: selectedSourceWaveId,
    waveProofPack: waveSources.proofPack,
    waveProofPackSourceWaveId: selectedSourceWaveId,
    waveItems: waveSources.waveItems,
    waveItemsSourceWaveId: selectedSourceWaveId,
    actionResponse:
      !waveSources.waveDetail ||
      (waveCommands.actionResponseIsDirect &&
        waveCommands.actionResponseDetailUpdateCountAtAdmission ===
          waveSources.detailUpdateCount)
        ? waveCommands.actionResponse
        : null,
    waveAiMemo: waveCommands.waveAiMemo,
    waveAiMemoSourceWaveId: selectedSourceWaveId,
    operationsHandoffSummary: waveCommands.operationsHandoffSummary,
    operationsHandoffSummarySourceWaveId: selectedSourceWaveId,
    campaignDefinitions: governedCampaignDefinitions,
    campaignDiscovery,
    campaignOperatingQueue,
    campaignApprovalInbox,
    campaignWorkflowBoard,
    campaignAssignmentPlan,
    campaignWorkflowAutomation,
  };
  const campaignListModel = buildDpmWaveCommandCenterModel(commonModelInput);
  const campaignRowKey = campaignListModel.campaignRows
    .map((row) => row.key)
    .join("|");
  const selectedCampaignKey =
    selectedCampaignState.campaignRowKey === campaignRowKey &&
    campaignListModel.campaignRows.some(
      (row) => row.key === selectedCampaignState.selectedCampaignKey,
    )
      ? selectedCampaignState.selectedCampaignKey
      : (campaignListModel.campaignRows[0]?.key ?? null);
  const useInitialCampaignEvidence = selectedCampaignKey === initialCampaignKey;
  const selectedCampaign =
    campaignListModel.campaignRows.find(
      (row) => row.key === selectedCampaignKey,
    ) ??
    campaignListModel.campaignRows[0] ??
    null;
  const campaignSources = useDpmCampaignSources({
    selectedCampaign,
    initialCampaignKey,
    initialWorkflowEvidence: {
      approvalDecisions: campaignApprovalDecisions,
      assignmentActions: campaignAssignmentActions,
      assignmentTasks: campaignAssignmentTasks,
      makerCheckerControls: campaignMakerCheckerControls,
    },
  });
  const campaignSourceModel = buildDpmWaveCommandCenterModel({
    ...commonModelInput,
    campaignDefinitions: governedCampaignDefinitions,
    campaignLifecycleEvents: campaignSources.lifecycle,
    campaignLaunchHistory: campaignSources.launchHistory,
    campaignPreviewReadiness: campaignSources.previewReadiness,
    campaignLaunchPackage: campaignSources.launchPackage,
    campaignLaunchResponse: null,
    campaignApprovalDecisions:
      campaignSources.workflow?.approvalDecisions ??
      (useInitialCampaignEvidence ? campaignApprovalDecisions : null),
    campaignAssignmentActions:
      campaignSources.workflow?.assignmentActions ??
      (useInitialCampaignEvidence ? campaignAssignmentActions : null),
    campaignAssignmentTasks:
      campaignSources.workflow?.assignmentTasks ??
      (useInitialCampaignEvidence ? campaignAssignmentTasks : null),
    campaignMakerCheckerControls:
      campaignSources.workflow?.makerCheckerControls ??
      (useInitialCampaignEvidence ? campaignMakerCheckerControls : null),
  });
  const campaignCommands = useDpmCampaignCommands({
    selectedCampaign,
    canLaunch: campaignSourceModel.campaignLaunchPosture.canLaunch,
    sources: campaignSources,
  });
  const model = buildDpmWaveCommandCenterModel({
    ...commonModelInput,
    campaignDefinitions: governedCampaignDefinitions,
    campaignLifecycleEvents: campaignSources.lifecycle,
    campaignLaunchHistory: campaignSources.launchHistory,
    campaignPreviewReadiness: campaignSources.previewReadiness,
    campaignLaunchPackage: campaignSources.launchPackage,
    campaignLaunchResponse: campaignCommands.launchResponse,
    campaignApprovalDecisions:
      campaignSources.workflow?.approvalDecisions ??
      (useInitialCampaignEvidence ? campaignApprovalDecisions : null),
    campaignAssignmentActions:
      campaignSources.workflow?.assignmentActions ??
      (useInitialCampaignEvidence ? campaignAssignmentActions : null),
    campaignAssignmentTasks:
      campaignSources.workflow?.assignmentTasks ??
      (useInitialCampaignEvidence ? campaignAssignmentTasks : null),
    campaignMakerCheckerControls:
      campaignSources.workflow?.makerCheckerControls ??
      (useInitialCampaignEvidence ? campaignMakerCheckerControls : null),
  });
  const selectedWaveId = model.selectedWaveId;
  const retainedWaveAwaitingConfirmation =
    waveCommands.retainedSelectionActive &&
    (waveSources.waveDetail === null ||
      waveSources.waveItems === null ||
      waveSources.detailConfirmationBlocked ||
      waveSources.itemsConfirmationBlocked);

  function selectCampaign(row: DpmCampaignDefinitionRow) {
    setSelectedCampaignState({ campaignRowKey, selectedCampaignKey: row.key });
  }

  function loadProposedChanges() {
    if (!selectedWaveId || waveCommands.pendingAction) {
      return;
    }
    setWaveReadFeedback(null);
    setWaveReadPending({
      waveId: selectedWaveId,
      value: "Load proposed changes",
    });
    void waveSources.refreshItems().then((result) => {
      if (result.data && !result.error) {
        setWaveReadFeedback({
          waveId: selectedWaveId,
          value: "Load proposed changes completed.",
        });
      }
      setWaveReadPending((current) =>
        current?.waveId === selectedWaveId ? null : current,
      );
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
      setWaveReadPending((current) =>
        current?.waveId === selectedWaveId ? null : current,
      );
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
    selectCampaign(row);
    try {
      await campaignSources.loadLifecycle(row);
    } catch {
      // Query state owns selected-campaign failure evidence.
    }
  }

  async function loadCampaignLaunchHistory(
    row: DpmCampaignDefinitionRow,
    offset = 0,
  ) {
    selectCampaign(row);
    try {
      await campaignSources.loadLaunchHistory(row, offset);
    } catch {
      // Query state owns selected-campaign failure evidence.
    }
  }

  async function checkCampaignLaunchReadiness(row: DpmCampaignDefinitionRow) {
    if (
      campaignSources.previewReadinessPending ||
      campaignSources.launchPackagePending
    ) {
      return;
    }
    selectCampaign(row);
    try {
      await campaignSources.loadLaunchReadiness(row);
    } catch {
      // Query state owns selected-campaign failure evidence.
    }
  }

  async function loadCampaignWorkflowEvidence(row: DpmCampaignDefinitionRow) {
    if (campaignSources.workflowPending) {
      return;
    }
    selectCampaign(row);
    try {
      await campaignSources.loadWorkflow(row);
    } catch {
      // Query state owns selected-campaign failure evidence.
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
    pendingCampaignLifecycleKey: campaignSources.lifecyclePending
      ? selectedCampaignKey
      : null,
    pendingCampaignLaunchHistoryKey: campaignSources.launchHistoryPending
      ? selectedCampaignKey
      : null,
    pendingCampaignPreviewReadinessKey: campaignSources.previewReadinessPending
      ? selectedCampaignKey
      : null,
    pendingCampaignLaunchPackageKey: campaignSources.launchPackagePending
      ? selectedCampaignKey
      : null,
    pendingCampaignLaunchKey: campaignCommands.pendingLaunchKey,
    pendingCampaignWorkflowEvidenceKey: campaignSources.workflowPending
      ? selectedCampaignKey
      : null,
    pendingCampaignLifecycleCommand: campaignCommands.pendingLifecycle,
    pendingCampaignWorkflowCommand: campaignCommands.pendingWorkflow,
    actionError: waveCommands.actionError ?? waveSources.sourceError,
    sourceConfirmationRetryAvailable:
      waveCommands.confirmationRecoveryAvailable ||
      (waveCommands.retainedSelectionActive &&
        (waveSources.detailConfirmationFailed ||
          waveSources.itemsConfirmationFailed)),
    campaignLifecycleError: campaignSources.lifecycleError,
    campaignLaunchHistoryError: campaignSources.launchHistoryError,
    campaignPreviewReadinessError: campaignSources.previewReadinessError,
    campaignLaunchError:
      campaignSources.launchPackageError ?? campaignCommands.launchError,
    campaignLifecycleCommandError: campaignCommands.lifecycleError,
    campaignWorkflowCommandError: campaignCommands.workflowError,
    campaignWorkflowEvidenceError: campaignSources.workflowError,
    campaignWorkflowEvidenceResolved: campaignSources.workflowResolved,
    campaignLifecycleCommandEvidence: campaignCommands.lifecycleEvidence,
    campaignWorkflowCommandEvidence: campaignCommands.workflowEvidence,
    actionMessage:
      valueForSelectedWave(waveReadFeedback, selectedWaveId) ??
      waveCommands.actionMessage,
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
      const recoverCommandConfirmation =
        waveCommands.confirmationRecoveryAvailable;
      if (
        !recoverCommandConfirmation &&
        !waveCommands.retainedSelectionActive
      ) {
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
    launchCampaign: campaignCommands.launch,
    recordCampaignLifecycleCommand: campaignCommands.recordLifecycle,
    recordCampaignWorkflowCommand: campaignCommands.recordWorkflow,
  };
}

function valueForSelectedWave<T>(
  boundValue: WaveBoundValue<T> | null,
  selectedWaveId: string | null,
): T | null {
  return boundValue?.waveId === selectedWaveId ? boundValue.value : null;
}

function selectedWaveIdForResponse(
  response: DpmWaveGatewayResponse | null,
): string | null {
  return buildDpmWaveCommandCenterModel({ waveList: response }).selectedWaveId;
}
