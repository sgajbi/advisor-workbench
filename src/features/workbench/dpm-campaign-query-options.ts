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
  listDpmCampaignDefinitions,
} from "@/features/workbench/dpm-wave-api";
import {
  dpmCampaignQueryKeys,
  type DpmCampaignIdentity,
} from "@/features/workbench/dpm-campaign-query-keys";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
} from "@/features/workbench/types";

export type DpmCampaignWorkflowEvidence = Readonly<{
  approvalDecisions: DpmCampaignWorkflowGatewayResponse;
  assignmentActions: DpmCampaignWorkflowGatewayResponse;
  assignmentTasks: DpmCampaignWorkflowGatewayResponse;
  makerCheckerControls: DpmCampaignWorkflowGatewayResponse;
}>;

export type DpmCampaignLifecycleConfirmation = Readonly<{
  lifecycle: DpmCampaignDefinitionGatewayResponse;
  definition: DpmCampaignDefinitionGatewayResponse;
  definitions: DpmCampaignDefinitionGatewayResponse;
}>;

export function dpmCampaignDefinitionsQueryOptions() {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.definitions(),
    queryFn: fetchDpmCampaignDefinitions,
  });
}

export function fetchDpmCampaignDefinitions() {
  return listDpmCampaignDefinitions(
    { campaignStatus: "ACTIVE", limit: 10, offset: 0 },
    "client",
  );
}

export function dpmCampaignLifecycleQueryOptions(
  identity: DpmCampaignIdentity,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.lifecycle(identity),
    queryFn: () => fetchDpmCampaignLifecycle(identity),
  });
}

export function fetchDpmCampaignLifecycle(identity: DpmCampaignIdentity) {
  return getDpmCampaignDefinitionLifecycleEvents(apiIdentity(identity));
}

export function dpmCampaignLifecycleConfirmationQueryOptions(
  identity: DpmCampaignIdentity,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.lifecycleConfirmation(identity),
    queryFn: async (): Promise<DpmCampaignLifecycleConfirmation> => {
      const [lifecycle, definition, definitions] = await Promise.all([
        fetchDpmCampaignLifecycle(identity),
        listDpmCampaignDefinitions(
          { campaignId: identity.campaignId, limit: 10, offset: 0 },
          "client",
        ),
        fetchDpmCampaignDefinitions(),
      ]);
      return { lifecycle, definition, definitions };
    },
    staleTime: 0,
  });
}

export function dpmCampaignLaunchHistoryQueryOptions(
  identity: DpmCampaignIdentity,
  offset: number,
  limit: number,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.launchHistory(identity, offset, limit),
    queryFn: () =>
      getDpmCampaignDefinitionLaunchHistory({
        ...apiIdentity(identity),
        limit,
        offset,
      }),
  });
}

export function dpmCampaignPreviewReadinessQueryOptions(
  identity: DpmCampaignIdentity,
  requestedAsOfDate?: string,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.previewReadiness(
      identity,
      requestedAsOfDate,
    ),
    queryFn: () =>
      getDpmCampaignDefinitionPreviewReadiness({
        ...apiIdentity(identity),
        requestedAsOfDate,
      }),
    gcTime: 0,
  });
}

export function dpmCampaignLaunchPackageQueryOptions(
  identity: DpmCampaignIdentity,
  requestedAsOfDate?: string,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.launchPackage(identity, requestedAsOfDate),
    queryFn: () =>
      getDpmCampaignDefinitionLaunchPackage({
        ...apiIdentity(identity),
        requestedAsOfDate,
      }),
    gcTime: 0,
  });
}

export function dpmCampaignWorkflowQueryOptions(identity: DpmCampaignIdentity) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.workflow(identity),
    queryFn: () => fetchDpmCampaignWorkflow(identity),
  });
}

export function dpmCampaignWorkflowConfirmationQueryOptions(
  identity: DpmCampaignIdentity,
) {
  return queryOptions({
    queryKey: dpmCampaignQueryKeys.workflowConfirmationRead(identity),
    queryFn: () => fetchDpmCampaignWorkflow(identity),
    staleTime: 0,
  });
}

async function fetchDpmCampaignWorkflow(
  identity: DpmCampaignIdentity,
): Promise<DpmCampaignWorkflowEvidence> {
  const params = apiIdentity(identity);
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
  return {
    approvalDecisions,
    assignmentActions,
    assignmentTasks,
    makerCheckerControls,
  };
}

function apiIdentity({ campaignId, campaignVersion }: DpmCampaignIdentity) {
  return { campaignId, campaignVersion };
}
