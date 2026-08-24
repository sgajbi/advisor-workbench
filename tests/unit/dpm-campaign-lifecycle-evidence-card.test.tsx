import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DpmCampaignLifecycleEvidenceCard from "../../src/features/workbench/components/dpm-campaign-lifecycle-evidence-card";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLifecycleEventRow,
} from "../../src/features/workbench/dpm-wave-command-center-view-model";

const campaign: DpmCampaignDefinitionRow = {
  key: "campaign-holdings-202605:2026.05",
  campaignId: "campaign-holdings-202605",
  campaignVersion: "2026.05",
  displayName: "Apple and Tesla holdings review",
  status: "ACTIVE",
  asOfDate: "2026-05-10",
  candidateCount: "12",
  eligibleCandidateCount: "10",
  eligiblePortfolioTypes: "DISCRETIONARY",
  governanceState: "APPROVED",
  expiryState: "VALID",
  accessPurpose: "rebalance_review",
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

const lifecycleRows: DpmCampaignLifecycleEventRow[] = [
  {
    key: "event-1",
    eventType: "LAUNCHED",
    occurredAt: "14 May 2026, 09:30 UTC",
    actor: "pm_sg_1",
    status: "RECORDED",
    reason: "campaign_definition_launched",
    waveId: "dwv_campaign_launch_001",
    requestedAsOfDate: "2026-05-10",
    correlationId: "corr-campaign-launch",
    idempotencyKey: "campaign-launch:campaign-holdings-202605:2026.05:abc",
  },
];

describe("DpmCampaignLifecycleEvidenceCard", () => {
  it("renders Manage-recorded lifecycle evidence without adding workflow controls", () => {
    render(
      <DpmCampaignLifecycleEvidenceCard
        rows={lifecycleRows}
        selectedCampaign={campaign}
      />
    );

    expect(screen.getByRole("heading", { name: "Campaign Lifecycle Evidence" })).toBeInTheDocument();
    expect(screen.getByText("Apple and Tesla holdings review version 2026.05")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "DPM campaign lifecycle evidence" })).toBeInTheDocument();
    expect(screen.getByText("LAUNCHED")).toBeInTheDocument();
    expect(screen.getByText("campaign_definition_launched")).toBeInTheDocument();
    expect(screen.getByText("14 May 2026, 09:30 UTC")).toBeInTheDocument();
    expect(screen.getByText("corr-campaign-launch")).toBeInTheDocument();
    expect(screen.getByText("campaign-launch:campaign-holdings-202605:2026.05:abc")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /order/i })).not.toBeInTheDocument();
  });

  it("fails closed when lifecycle evidence is not loaded or unavailable", () => {
    render(
      <DpmCampaignLifecycleEvidenceCard
        rows={[]}
        selectedCampaign={null}
        error="Campaign lifecycle evidence needs Manage source evidence"
      />
    );

    expect(screen.getByText("Select a campaign definition to inspect lifecycle evidence.")).toBeInTheDocument();
    expect(screen.getByText("Campaign lifecycle evidence needs Manage source evidence")).toBeInTheDocument();
    expect(screen.getByText("No lifecycle evidence loaded")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
