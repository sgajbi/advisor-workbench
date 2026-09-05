import {
  createDpmCampaignApprovalDecision,
  createDpmCampaignAssignmentAction,
  createDpmCampaignAssignmentTask,
  createDpmCampaignAssignmentTaskTransition,
  createDpmCampaignMakerCheckerControl,
  launchDpmCampaignDefinition,
  retireDpmCampaignDefinition,
  supersedeDpmCampaignDefinition,
} from "@/features/workbench/dpm-wave-api";
import {
  campaignCommandActorId,
  type DpmCampaignLifecycleCommandInput,
  type DpmCampaignWorkflowCommandInput,
} from "@/features/workbench/dpm-campaign-command-contracts";
import type { DpmCampaignDefinitionRow } from "@/features/workbench/dpm-wave-command-center-view-model";

export async function executeDpmCampaignLifecycleCommand(
  campaign: DpmCampaignDefinitionRow,
  command: DpmCampaignLifecycleCommandInput,
) {
  const context = {
    campaignId: campaign.campaignId,
    campaignVersion: campaign.campaignVersion,
    actorId: campaignCommandActorId(command).trim(),
  };
  return command.commandType === "retire"
    ? await retireDpmCampaignDefinition({ ...context, body: command.body })
    : await supersedeDpmCampaignDefinition({ ...context, body: command.body });
}

export async function executeDpmCampaignWorkflowCommand(
  campaign: DpmCampaignDefinitionRow,
  command: DpmCampaignWorkflowCommandInput,
) {
  const context = {
    campaignId: campaign.campaignId,
    campaignVersion: campaign.campaignVersion,
    actorId: campaignCommandActorId(command),
  };
  return command.commandType === "approval_decision"
    ? await createDpmCampaignApprovalDecision({
        ...context,
        body: command.body,
      })
    : command.commandType === "assignment_action"
      ? await createDpmCampaignAssignmentAction({
          ...context,
          body: command.body,
        })
      : command.commandType === "assignment_task"
        ? await createDpmCampaignAssignmentTask({
            ...context,
            body: command.body,
          })
        : command.commandType === "task_transition"
          ? await createDpmCampaignAssignmentTaskTransition({
              ...context,
              taskRef: command.taskRef,
              body: command.body,
            })
          : await createDpmCampaignMakerCheckerControl({
              ...context,
              body: command.body,
            });
}

export async function executeDpmCampaignLaunch(
  campaign: DpmCampaignDefinitionRow,
) {
  return await launchDpmCampaignDefinition({
    campaignId: campaign.campaignId,
    campaignVersion: campaign.campaignVersion,
    requestedAsOfDate:
      campaign.asOfDate === "N/A" ? undefined : campaign.asOfDate,
  });
}
