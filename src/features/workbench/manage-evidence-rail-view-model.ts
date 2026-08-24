import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import {
  readDpmProofPackId,
  type ManageWorkspaceData,
} from "@/features/workbench/manage-workspace-data";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import {
  buildProofPackPanelModel,
  type ProofPackPanelState,
} from "@/features/workbench/proof-pack-view-model";

export type ManageEvidenceRailItem = {
  label: string;
  value: string;
};

export type ManageEvidenceRailModel = {
  headline: string;
  items: ManageEvidenceRailItem[];
};

export function buildManageEvidenceRailModel(
  data: ManageWorkspaceData,
): ManageEvidenceRailModel {
  const commandModel = buildDpmCommandCenterPanelModel({
    commandCenter: data.commandCenter,
    exceptions: data.commandCenterExceptions,
    mandate: data.mandate,
    mandateHealth: data.mandateHealth,
  });
  const hasEvidencePackReference = Boolean(
    readDpmProofPackId(data.outcomeReviews?.data ?? null),
  );
  const proofPackModel = data.proofPack
    ? buildProofPackPanelModel(data.proofPack)
    : null;
  const hasUsableEvidencePack =
    proofPackModel?.state === "ready" || proofPackModel?.state === "partial";
  const evidencePackValue = proofPackModel
    ? evidencePackPostureLabel(proofPackModel.state)
    : data.proofPackError
      ? "Temporarily unavailable"
      : hasEvidencePackReference
        ? "Referenced; not retrieved"
        : "Not requested";
  const hasTraceableMonitoring =
    commandModel.correlationId !== "N/A" || commandModel.sourceRunId !== "N/A";

  return {
    headline:
      hasUsableEvidencePack || hasTraceableMonitoring
        ? "Source evidence available"
        : "Source evidence needs confirmation",
    items: [
      {
        label: "Evidence pack",
        value: evidencePackValue,
      },
      {
        label: "Monitoring record",
        value: businessStateLabel(commandModel.latestMonitoringRunStatus),
      },
      {
        label: "Traceability",
        value: hasTraceableMonitoring ? "Available" : "Not available",
      },
    ],
  };
}

function evidencePackPostureLabel(state: ProofPackPanelState): string {
  switch (state) {
    case "ready":
      return "Available";
    case "partial":
      return "Partially available";
    case "blocked":
      return "Blocked";
    case "unsupported":
      return "Not supported";
    case "empty":
      return "Not linked";
    case "unavailable":
      return "Temporarily unavailable";
  }
}
