import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DpmCampaignCandidateSourceCard from "../../src/features/workbench/components/dpm-campaign-candidate-source-card";
import type { DpmCampaignDefinitionRow } from "../../src/features/workbench/dpm-wave-command-center-view-model";

const campaign: DpmCampaignDefinitionRow = {
  key: "campaign-core-universe:2026.05",
  campaignId: "campaign-core-universe",
  campaignVersion: "2026.05",
  displayName: "Core universe campaign",
  status: "ACTIVE",
  asOfDate: "2026-05-03",
  candidateCount: "1",
  eligibleCandidateCount: "1",
  eligiblePortfolioTypes: "DISCRETIONARY",
  governanceState: "GOVERNED",
  expiryState: "VALID",
  accessPurpose: "SUPERVISORY_BULK_REVIEW",
  sourcePosture: "Source-backed",
  candidateSourceProduct: "DpmPortfolioUniverseCandidate:v1",
  candidateSourceReadiness: "READY",
  candidateFilters:
    "As Of: 2026-05-03; Booking Center Code: Singapore; Model Portfolio Ids: MODEL_PB_SG_GLOBAL_BAL_DPM",
  candidateWarnings: "N/A",
  lineageRefCount: "2",
  nextAction: "Check launch readiness through Gateway.",
  operatingBoundaries: "NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM, NO_CLIENT_CONTACT_WORKFLOW",
};

describe("DpmCampaignCandidateSourceCard", () => {
  it("renders source-backed candidate review posture without execution or client-contact controls", () => {
    render(<DpmCampaignCandidateSourceCard selectedCampaign={campaign} />);

    expect(screen.getByRole("heading", { name: "Candidate Source Review" })).toBeInTheDocument();
    expect(screen.getByText("DpmPortfolioUniverseCandidate:v1")).toBeInTheDocument();
    expect(screen.getByLabelText("Status Ready")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.getByText(campaign.candidateFilters)).toBeInTheDocument();
    expect(screen.getByText("Check launch readiness through Gateway.")).toBeInTheDocument();
    expect(
      screen.getByText("NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM, NO_CLIENT_CONTACT_WORKFLOW")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /order/i })).not.toBeInTheDocument();
  });

  it("renders an empty selection state until a campaign definition is selected", () => {
    render(<DpmCampaignCandidateSourceCard selectedCampaign={null} />);

    expect(screen.getByText("Select a campaign definition")).toBeInTheDocument();
    expect(screen.getByText("Open a Manage campaign definition to review candidate source readiness.")).toBeInTheDocument();
  });
});
