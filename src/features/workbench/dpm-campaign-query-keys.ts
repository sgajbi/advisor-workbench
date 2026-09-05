export type DpmCampaignIdentity = Readonly<{
  campaignId: string;
  campaignVersion: string;
}>;

export type DpmCampaignConfirmationKind = "lifecycle" | "workflow";

export const DPM_CAMPAIGN_COMMAND_SCOPE = "workbench-dpm-campaign-command";

export const dpmCampaignQueryKeys = {
  all: ["workbench", "dpm-campaigns"] as const,
  definitions: () => [...dpmCampaignQueryKeys.all, "definitions"] as const,
  definitionsServerRead: () =>
    [...dpmCampaignQueryKeys.all, "definitions-server-read"] as const,
  definitionsConfirmationReceipt: () =>
    [...dpmCampaignQueryKeys.all, "definitions-confirmation-receipt"] as const,
  campaign: ({ campaignId, campaignVersion }: DpmCampaignIdentity) =>
    [
      ...dpmCampaignQueryKeys.all,
      "campaign",
      campaignId,
      campaignVersion,
    ] as const,
  lifecycle: (identity: DpmCampaignIdentity) =>
    [...dpmCampaignQueryKeys.campaign(identity), "lifecycle"] as const,
  lifecycleConfirmation: (identity: DpmCampaignIdentity) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "lifecycle-confirmation",
    ] as const,
  launchHistory: (
    identity: DpmCampaignIdentity,
    offset: number,
    limit: number,
  ) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "launch-history",
      { limit, offset },
    ] as const,
  previewReadiness: (
    identity: DpmCampaignIdentity,
    requestedAsOfDate?: string,
  ) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "preview-readiness",
      requestedAsOfDate ?? null,
    ] as const,
  launchPackage: (identity: DpmCampaignIdentity, requestedAsOfDate?: string) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "launch-package",
      requestedAsOfDate ?? null,
    ] as const,
  workflow: (identity: DpmCampaignIdentity) =>
    [...dpmCampaignQueryKeys.campaign(identity), "workflow"] as const,
  workflowConfirmationRead: (identity: DpmCampaignIdentity) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "workflow-confirmation-read",
    ] as const,
  workflowConfirmationReceipt: (identity: DpmCampaignIdentity) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "workflow-confirmation-receipt",
    ] as const,
  workflowServerRead: (identity: DpmCampaignIdentity) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "workflow-server-read",
    ] as const,
  confirmationLock: (
    identity: DpmCampaignIdentity,
    kind: DpmCampaignConfirmationKind,
  ) =>
    [
      ...dpmCampaignQueryKeys.campaign(identity),
      "confirmation-lock",
      kind,
    ] as const,
  launchResult: (identity: DpmCampaignIdentity) =>
    [...dpmCampaignQueryKeys.campaign(identity), "launch-result"] as const,
};

export const dpmCampaignMutationKeys = {
  all: [...dpmCampaignQueryKeys.all, "mutation"] as const,
  lifecycle: () => [...dpmCampaignMutationKeys.all, "lifecycle"] as const,
  workflow: () => [...dpmCampaignMutationKeys.all, "workflow"] as const,
  launch: () => [...dpmCampaignMutationKeys.all, "launch"] as const,
};
