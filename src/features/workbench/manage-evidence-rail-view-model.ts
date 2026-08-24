import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";

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
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const hasEvidencePack = reviewModel.items.some(
    (item) => item.proofPackId !== "N/A",
  );
  const hasTraceableMonitoring =
    commandModel.correlationId !== "N/A" || commandModel.sourceRunId !== "N/A";

  return {
    headline:
      hasEvidencePack || hasTraceableMonitoring
        ? "Source evidence available"
        : "Source evidence needs confirmation",
    items: [
      {
        label: "Evidence pack",
        value: hasEvidencePack ? "Available" : "Not requested",
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
