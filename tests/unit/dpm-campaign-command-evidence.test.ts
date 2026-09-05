import { describe, expect, it } from "vitest";

import {
  campaignWorkflowEvidenceTotalCount,
  confirmsCampaignLifecycleEvidence,
  containsCampaignWorkflowEvidence,
} from "../../src/features/workbench/dpm-campaign-command-evidence";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
} from "../../src/features/workbench/types";

describe("DPM campaign command evidence", () => {
  it("confirms terminal lifecycle evidence from the named definition collection", () => {
    const response: DpmCampaignDefinitionGatewayResponse = {
      correlation_id: "corr-lifecycle",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      data: {
        campaign_definitions: [
          {
            campaign_id: "campaign-a",
            campaign_version: "1",
            status: "SUPERSEDED",
            superseded_by_campaign_version: "2",
          },
        ],
      },
    };

    expect(
      confirmsCampaignLifecycleEvidence(response, {
        campaignId: "campaign-a",
        campaignVersion: "1",
        status: "SUPERSEDED",
        replacementCampaignVersion: "2",
      }),
    ).toBe(true);
  });

  it.each([
    ["approvalDecisions", "approval_decisions", "decision_ref"],
    ["assignmentActions", "assignment_actions", "action_ref"],
    ["assignmentTasks", "assignment_tasks", "task_ref"],
    ["makerCheckerControls", "maker_checker_controls", "control_ref"],
  ] as const)(
    "confirms %s evidence from its named source collection",
    (source, collection, referenceField) => {
      const selected = workflowResponse({
        [collection]: [{ [referenceField]: "accepted-reference" }],
      });
      const evidence = workflowEvidence(selected, source);

      expect(
        containsCampaignWorkflowEvidence(evidence, {
          evidenceRef: "accepted-reference",
          source,
          transition: false,
        }),
      ).toBe(true);
      expect(
        campaignWorkflowEvidenceTotalCount(evidence, {
          evidenceRef: "accepted-reference",
          source,
          transition: false,
        }),
      ).toBe(1);
    },
  );

  it("confirms a task transition from transition history in the named task collection", () => {
    const tasks = workflowResponse({
      assignment_tasks: [
        {
          task_ref: "task-1",
          transition_history: [{ transition_ref: "transition-accepted" }],
        },
      ],
    });

    expect(
      containsCampaignWorkflowEvidence(
        workflowEvidence(tasks, "assignmentTasks"),
        {
          evidenceRef: "transition-accepted",
          source: "assignmentTasks",
          transition: true,
        },
      ),
    ).toBe(true);
  });

  it("retains the source total from the supportability envelope after a receipt pages out", () => {
    const response: DpmCampaignWorkflowGatewayResponse = {
      ...workflowResponse({ items: [{ decision_ref: "later-page-record" }] }),
      supportability: { total_count: 12 },
    };

    expect(
      campaignWorkflowEvidenceTotalCount(
        workflowEvidence(response, "approvalDecisions"),
        {
          evidenceRef: "accepted-reference",
          source: "approvalDecisions",
          transition: false,
        },
      ),
    ).toBe(12);
  });
});

function workflowResponse(
  data: Record<string, unknown>,
): DpmCampaignWorkflowGatewayResponse {
  return {
    correlation_id: "corr-workflow",
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    data,
  };
}

function workflowEvidence(
  selected: DpmCampaignWorkflowGatewayResponse,
  source:
    | "approvalDecisions"
    | "assignmentActions"
    | "assignmentTasks"
    | "makerCheckerControls",
) {
  const empty = workflowResponse({ items: [] });
  return {
    approvalDecisions: source === "approvalDecisions" ? selected : empty,
    assignmentActions: source === "assignmentActions" ? selected : empty,
    assignmentTasks: source === "assignmentTasks" ? selected : empty,
    makerCheckerControls: source === "makerCheckerControls" ? selected : empty,
  };
}
