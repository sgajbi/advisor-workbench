import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmCampaignWorkflowAuditCard, {
  DpmCampaignWorkflowSummaryTable,
} from "../../src/features/workbench/components/dpm-campaign-workflow-audit-card";
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
  candidateSelectionBasis: "N/A",
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
        evidenceRows={[
          {
            key: "task_001",
            evidenceType: "Assignment Task",
            evidenceRef: "task_001",
            status: "WAITING_FOR_REVIEW",
            actor: "pm_sg_1",
            recordedAt: "21 May 2026, 08:00 UTC",
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

    expect(screen.getByText("Governance action")).toBeInTheDocument();
    expect(screen.getByText("Source evidence and operating audit")).toBeInTheDocument();
    expect(screen.getAllByText("Assignment Task").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:task")).toBeInTheDocument();
    expect(screen.getByText("21 May 2026, 08:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("ASSIGNED_FOR_REVIEW: OPEN to WAITING_FOR_REVIEW")).toBeInTheDocument();
    const rendered = document.body.textContent ?? "";
    expect(rendered).not.toContain("order generated");
    expect(rendered).not.toContain("OMS execution");
    expect(rendered).not.toContain("client contacted");
  });

  it("labels aggregate source windows as book-wide rather than selected-campaign evidence", () => {
    render(
      <DpmCampaignWorkflowSummaryTable
        rows={[
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
      />,
    );

    expect(
      screen.getByRole("table", { name: "Book-wide campaign workflow summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Operating Queue")).toBeInTheDocument();
  });

  it("keeps command control unavailable until a campaign definition is selected", () => {
    render(
      <DpmCampaignWorkflowAuditCard
        evidenceRows={[]}
        selectedCampaign={null}
        onRecordWorkflowCommand={vi.fn()}
      />
    );

    expect(screen.getByText("Select a campaign to act")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record governance action" })).not.toBeInTheDocument();
  });

  it("submits bounded task-transition evidence through the provided Gateway action", async () => {
    const onRecordWorkflowCommand = vi.fn().mockResolvedValue(undefined);
    render(
      <DpmCampaignWorkflowAuditCard
        evidenceRows={[]}
        selectedCampaign={selectedCampaign}
        onRecordWorkflowCommand={onRecordWorkflowCommand}
      />
    );

    fireEvent.change(screen.getByLabelText("Business action"), {
      target: { value: "task_transition" },
    });
    fireEvent.change(screen.getByLabelText("Existing task reference"), {
      target: { value: "task-review-001" },
    });
    fireEvent.change(screen.getByLabelText("Business rationale"), {
      target: { value: "The portfolio manager acknowledged the review task." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record governance action" }));

    await waitFor(() => expect(onRecordWorkflowCommand).toHaveBeenCalledTimes(1));
    expect(onRecordWorkflowCommand).toHaveBeenCalledWith({
      commandType: "task_transition",
      taskRef: "task-review-001",
      body: {
        transition_type: "ACKNOWLEDGED",
        transition_ref: "task-review-001:acknowledged",
        transitioned_by: expect.any(String),
        transition_reason: "The portfolio manager acknowledged the review task.",
        correlation_id: expect.stringContaining(
          "workbench-campaign-task_transition-campaign-holdings-202605-2026.05-",
        ),
      },
    });
  });

  it("requires and submits transition-specific accountability evidence", async () => {
    const onRecordWorkflowCommand = vi.fn().mockResolvedValue(undefined);
    render(
      <DpmCampaignWorkflowAuditCard
        evidenceRows={[]}
        selectedCampaign={selectedCampaign}
        onRecordWorkflowCommand={onRecordWorkflowCommand}
      />,
    );

    fireEvent.change(screen.getByLabelText("Business action"), {
      target: { value: "task_transition" },
    });
    fireEvent.change(screen.getByLabelText("Task progress"), {
      target: { value: "DUE_DATE_CHANGED" },
    });
    fireEvent.change(screen.getByLabelText("Existing task reference"), {
      target: { value: "task-review-001" },
    });
    fireEvent.change(screen.getByLabelText("Business rationale"), {
      target: { value: "The review deadline changed after governance escalation." },
    });
    expect(screen.getByRole("button", { name: "Record governance action" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("New due date and time (UTC)"), {
      target: { value: "2026-05-12T08:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record governance action" }));

    await waitFor(() => expect(onRecordWorkflowCommand).toHaveBeenCalledTimes(1));
    expect(onRecordWorkflowCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        commandType: "task_transition",
        body: expect.objectContaining({
          transition_type: "DUE_DATE_CHANGED",
          due_at: "2026-05-12T08:00:00Z",
        }),
      }),
    );
  });

  it("prevents a repeated governance action until failed refresh evidence is reloaded", () => {
    render(
      <DpmCampaignWorkflowAuditCard
        evidenceRows={[]}
        selectedCampaign={selectedCampaign}
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
        commandRequiresReload
        onRecordWorkflowCommand={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Reload evidence before another action" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Business action")).toBeDisabled();
  });

  it("offers a read-only governance evidence reload after refresh failure", async () => {
    const onReloadEvidence = vi.fn().mockResolvedValue(undefined);
    render(
      <DpmCampaignWorkflowAuditCard
        evidenceRows={[]}
        error="The governance action was recorded, but source evidence needs refresh."
        selectedCampaign={selectedCampaign}
        evidenceRefreshing={false}
        onReloadEvidence={onReloadEvidence}
        onRecordWorkflowCommand={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reload governance evidence" }));
    await waitFor(() => expect(onReloadEvidence).toHaveBeenCalledTimes(1));
  });

  it("renders submitting, failure, and Gateway-returned command evidence states", () => {
    render(
      <DpmCampaignWorkflowAuditCard
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

    expect(screen.getByRole("button", { name: "Recording source evidence" })).toBeDisabled();
    expect(screen.getByText("Gateway rejected campaign workflow command.")).toBeInTheDocument();
    expect(screen.getByText("corr-campaign-command")).toBeInTheDocument();
    expect(screen.queryByText("sha256:task")).not.toBeInTheDocument();
  });
});
