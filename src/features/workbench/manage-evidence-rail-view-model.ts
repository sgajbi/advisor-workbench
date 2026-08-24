import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import {
  readDpmProofPackId,
  type ManageWorkspaceData,
} from "@/features/workbench/manage-workspace-data";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";

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
  const hasRetrievedEvidencePack = data.proofPack !== null;
  const evidencePackValue = hasRetrievedEvidencePack
    ? "Available"
    : data.proofPackError
      ? "Temporarily unavailable"
      : hasEvidencePackReference
        ? "Referenced; not retrieved"
        : "Not requested";
  const hasTraceableMonitoring =
    commandModel.correlationId !== "N/A" || commandModel.sourceRunId !== "N/A";

  return {
    headline:
      hasRetrievedEvidencePack || hasTraceableMonitoring
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
