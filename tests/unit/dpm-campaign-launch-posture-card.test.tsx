import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmCampaignLaunchPostureCard from "../../src/features/workbench/components/dpm-campaign-launch-posture-card";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchPosture,
  DpmCampaignPreviewReadinessPosture,
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

const previewReadinessPosture: DpmCampaignPreviewReadinessPosture = {
  state: "BLOCKED",
  reason: "source_candidate_membership_unavailable",
  requestedAsOfDate: "2026-05-10",
  actor: "pm_sg_1",
  blockedActions: ["NO_LOCAL_COHORT_CALCULATION", "NO_ORDER_GENERATION"],
  operatingBoundaries: ["NO_CAMPAIGN_MEMBERSHIP_CALCULATION", "NO_OMS_EXECUTION_CLAIM"],
  sourcePosture: "Manage preview-readiness required",
};

const launchPosture: DpmCampaignLaunchPosture = {
  state: "READY",
  canLaunch: true,
  reason: "campaign_launch_ready",
  requestedAsOfDate: "2026-05-10",
  actor: "pm_sg_1",
  launchedWaveId: "N/A",
  idempotencyEvidence: "campaign-launch:campaign-holdings-202605:2026.05:abc",
};

describe("DpmCampaignLaunchPostureCard", () => {
  it("renders Gateway-backed preview readiness and delegates durable launch", () => {
    const onLaunchCampaign = vi.fn();

    render(
      <DpmCampaignLaunchPostureCard
        previewReadinessPosture={previewReadinessPosture}
        launchPosture={launchPosture}
        selectedCampaign={campaign}
        selectedLaunchPending={false}
        onLaunchCampaign={onLaunchCampaign}
      />
    );

    expect(screen.getByRole("heading", { name: "Campaign Launch Posture" })).toBeInTheDocument();
    expect(screen.getByText("Apple and Tesla holdings review version 2026.05")).toBeInTheDocument();

    const readinessBoundaries = screen.getByLabelText("Campaign preview readiness boundaries");
    expect(
      within(readinessBoundaries).getByText("NO_LOCAL_COHORT_CALCULATION, NO_ORDER_GENERATION")
    ).toBeInTheDocument();
    expect(
      within(readinessBoundaries).getByText("NO_CAMPAIGN_MEMBERSHIP_CALCULATION, NO_OMS_EXECUTION_CLAIM")
    ).toBeInTheDocument();
    expect(within(readinessBoundaries).getByText("Manage preview-readiness required")).toBeInTheDocument();

    const launchButton = screen.getByRole("button", { name: "Launch governed wave" });
    expect(launchButton).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I reviewed the source readiness and understand this creates a durable campaign wave only/i,
      }),
    );
    fireEvent.click(launchButton);

    expect(onLaunchCampaign).toHaveBeenCalledWith(campaign);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /order/i })).not.toBeInTheDocument();
  });

  it("fails closed when no campaign is selected or readiness blocks launch", () => {
    const onLaunchCampaign = vi.fn();

    render(
      <DpmCampaignLaunchPostureCard
        previewReadinessPosture={{ ...previewReadinessPosture, state: "NOT_CHECKED" }}
        launchPosture={{ ...launchPosture, state: "BLOCKED", canLaunch: false }}
        selectedCampaign={null}
        previewReadinessError="Campaign preview readiness needs Manage source evidence"
        launchError="Campaign launch needs source readiness"
        selectedLaunchPending={false}
        onLaunchCampaign={onLaunchCampaign}
      />
    );

    expect(screen.getByText("Select a campaign definition to check launch readiness.")).toBeInTheDocument();
    expect(screen.getByText("Campaign preview readiness needs Manage source evidence")).toBeInTheDocument();
    expect(screen.getByText("Campaign launch needs source readiness")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Launch governed wave" })).toBeDisabled();
    expect(onLaunchCampaign).not.toHaveBeenCalled();
  });
});
