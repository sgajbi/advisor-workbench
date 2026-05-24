import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmCampaignWorkflowAuditCard from "../../src/features/workbench/components/dpm-campaign-workflow-audit-card";
import type { DpmCampaignDefinitionRow } from "../../src/features/workbench/dpm-wave-command-center-view-model";

const selectedCampaign: DpmCampaignDefinitionRow = {
  key: "campaign-holdings-202605:2026.05",
  campaignId: "campaign-holdings-202605",
  campaignVersion: "2026.05",
  displayName: "Holdings campaign",
  status: "ACTIVE",
  asOfDate: "2026-05-10",
  candidateCount: "1",
  eligibleCandidateCount: "1",
  eligiblePortfolioTypes: "DISCRETIONARY",
  governanceState: "GOVERNED",
  expiryState: "ACTIVE",
  accessPurpose: "Portfolio review",
  sourcePosture: "Source-backed",
  candidateSourceProduct: "BulkReviewCampaignDiscovery:v1",
  candidateSourceReadiness: "READY",
  candidateFilters: "As Of: 2026-05-10; Eligible Types: DISCRETIONARY",
  candidateWarnings: "N/A",
  lineageRefCount: "4",
  nextAction: "Check launch readiness through Gateway.",
  operatingBoundaries: "NO_OMS_EXECUTION_CLAIM, NO_CLIENT_CONTACT_WORKFLOW",
};

describe("DpmCampaignWorkflowAuditCard", () => {
  it("renders bounded Manage workflow evidence and omits raw operational claims", () => {
    render(
      <DpmCampaignWorkflowAuditCard
        summaryRows={[
          {
            key: "operating-queue",
            surface: "Operating Queue",
            state: "READY",
            itemCount: "1",
            page: "1-1 of 1",
            sourceRefs: "2",
            reasonCodes: "MANAGE_SOURCE_BACKED",
            contentHash: "sha256:queue",
            operatingBoundaries: "NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM",
          },
        ]}
        evidenceRows={[
          {
            key: "task_001",
            evidenceType: "Assignment Task",
            evidenceRef: "task_001",
            status: "WAITING_FOR_REVIEW",
            actor: "pm_sg_1",
            recordedAt: "2026-05-21T08:00:00Z",
            reasonCodes: "TASK_RECORDED",
            sourceRefs: "1",
            contentHash: "sha256:task",
            operatingBoundaries: "NO_CLIENT_CONTACT_WORKFLOW",
            transitionPosture: "ASSIGNED_FOR_REVIEW: OPEN to WAITING_FOR_REVIEW",
          },
        ]}
        selectedCampaign={selectedCampaign}
        onRecordWorkflowCommand={vi.fn()}
      />
    );

    expect(screen.getByText("Campaign Workflow Audit")).toBeInTheDocument();
    expect(screen.getByText("Operating Queue")).toBeInTheDocument();
    expect(screen.getAllByText("Assignment Task").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:task")).toBeInTheDocument();
    expect(screen.getByText("ASSIGNED_FOR_REVIEW: OPEN to WAITING_FOR_REVIEW")).toBeInTheDocument();
    const rendered = document.body.textContent ?? "";
    expect(rendered).not.toContain("order generated");
    expect(rendered).not.toContain("OMS execution");
    expect(rendered).not.toContain("client contacted");
  });

  it("keeps command control unavailable until a campaign definition is selected", () => {
    render(
      <DpmCampaignWorkflowAuditCard
        summaryRows={[]}
        evidenceRows={[]}
        selectedCampaign={null}
        onRecordWorkflowCommand={vi.fn()}
      />
    );

    expect(screen.getByText("Select a Manage campaign definition")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record Workflow Evidence" })).toBeDisabled();
  });

  it("submits bounded task-transition evidence through the provided Gateway action", async () => {
    const onRecordWorkflowCommand = vi.fn().mockResolvedValue(undefined);
    render(
      <DpmCampaignWorkflowAuditCard
        summaryRows={[]}
        evidenceRows={[]}
        selectedCampaign={selectedCampaign}
        onRecordWorkflowCommand={onRecordWorkflowCommand}
      />
    );

    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "task_transition" },
    });
    fireEvent.change(screen.getByLabelText("Task ref"), {
      target: { value: "task-review-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record Workflow Evidence" }));

    await waitFor(() => expect(onRecordWorkflowCommand).toHaveBeenCalledTimes(1));
    expect(onRecordWorkflowCommand).toHaveBeenCalledWith({
      commandType: "task_transition",
      taskRef: "task-review-001",
      body: {
        transition_type: "MARK_SUPPORTABLE",
        actor_id: expect.any(String),
      },
    });
  });

  it("renders submitting, failure, and Gateway-returned command evidence states", () => {
    render(
      <DpmCampaignWorkflowAuditCard
        summaryRows={[]}
        evidenceRows={[]}
        selectedCampaign={selectedCampaign}
        pendingCommand
        commandError="Gateway rejected campaign workflow command."
        commandEvidence={{
          commandLabel: "Assignment task",
          evidenceRef: "task-review-001",
          correlationId: "corr-campaign-command",
          sourceService: "lotus-manage",
          upstreamStatus: "201",
          contentHash: "sha256:task",
          reasonCodes: "campaign_assignment_task_recorded",
          operatingBoundaries: "NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM",
        }}
        onRecordWorkflowCommand={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Recording" })).toBeDisabled();
    expect(screen.getByText("Gateway rejected campaign workflow command.")).toBeInTheDocument();
    expect(screen.getByText("corr-campaign-command")).toBeInTheDocument();
    expect(screen.getByText("sha256:task")).toBeInTheDocument();
  });
});
