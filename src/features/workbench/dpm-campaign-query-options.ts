import { queryOptions } from "@tanstack/react-query";

import {
  getDpmCampaignApprovalDecisions,
  getDpmCampaignAssignmentActions,
  getDpmCampaignAssignmentTasks,
  getDpmCampaignDefinitionLaunchHistory,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignDefinitionPreviewReadiness,
  getDpmCampaignMakerCheckerControls,
} from "@/features/workbench/dpm-wave-api";
import {
  dpmCampaignQueryKeys,
  type DpmCampaignIdentity,
} from "@/features/workbench/dpm-campaign-query-keys";
import type { DpmCampaignWorkflowGatewayResponse } from "@/features/workbench/types";

export type DpmCampaignWorkflowEvidence = Readonly<{
  approvalDecisions: DpmCampaignWorkflowGatewayResponse;
  assignmentActions: DpmCampaignWorkflowGatewayResponse;
  assignmentTasks: DpmCampaignWorkflowGatewayResponse;
  makerCheckerControls: DpmCampaignWorkflowGatewayResponse;
}>;

export function dpmCampaignLifecycleQueryOptions(identity: DpmCampaignIdentity) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.lifecycle(identity),
    queryFn: () => getDpmCampaignDefinitionLifecycleEvents(identity),
  });
}

export function dpmCampaignLaunchHistoryQueryOptions(
  identity: DpmCampaignIdentity,
  offset: number,
  limit: number,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.launchHistory(identity, offset, limit),
    queryFn: () => getDpmCampaignDefinitionLaunchHistory({ ...identity, limit, offset }),
  });
}

export function dpmCampaignPreviewReadinessQueryOptions(
  identity: DpmCampaignIdentity,
  requestedAsOfDate?: string,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.previewReadiness(identity, requestedAsOfDate),
    queryFn: () =>
      getDpmCampaignDefinitionPreviewReadiness({ ...identity, requestedAsOfDate }),
  });
}

export function dpmCampaignLaunchPackageQueryOptions(
  identity: DpmCampaignIdentity,
  requestedAsOfDate?: string,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.launchPackage(identity, requestedAsOfDate),
    queryFn: () => getDpmCampaignDefinitionLaunchPackage({ ...identity, requestedAsOfDate }),
  });
}

export function dpmCampaignWorkflowQueryOptions(identity: DpmCampaignIdentity) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.workflow(identity),
    queryFn: async (): Promise<DpmCampaignWorkflowEvidence> => {
      const params = { ...identity };
      const [approvalDecisions, assignmentActions, assignmentTasks, makerCheckerControls] =
        await Promise.all([
          getDpmCampaignApprovalDecisions(params, "client"),
          getDpmCampaignAssignmentActions(params, "client"),
          getDpmCampaignAssignmentTasks(params, "client"),
          getDpmCampaignMakerCheckerControls(params, "client"),
        ]);
      return {
        approvalDecisions,
        assignmentActions,
        assignmentTasks,
        makerCheckerControls,
      };
    },
  });
}
