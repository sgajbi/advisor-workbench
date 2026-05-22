import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DpmCampaignWorkflowAuditCard from "../../src/features/workbench/components/dpm-campaign-workflow-audit-card";

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
      />
    );

    expect(screen.getByText("Campaign Workflow Audit")).toBeInTheDocument();
    expect(screen.getByText("Operating Queue")).toBeInTheDocument();
    expect(screen.getByText("Assignment Task")).toBeInTheDocument();
    expect(screen.getByText("sha256:task")).toBeInTheDocument();
    expect(screen.getByText("ASSIGNED_FOR_REVIEW: OPEN to WAITING_FOR_REVIEW")).toBeInTheDocument();
    const rendered = document.body.textContent ?? "";
    expect(rendered).not.toContain("order generated");
    expect(rendered).not.toContain("OMS execution");
    expect(rendered).not.toContain("client contacted");
  });
});
