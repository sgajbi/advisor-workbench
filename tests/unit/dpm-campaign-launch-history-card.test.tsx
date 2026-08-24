import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmCampaignLaunchHistoryCard from "../../src/features/workbench/components/dpm-campaign-launch-history-card";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchHistoryPage,
  DpmCampaignLaunchHistoryRow,
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

const launchHistoryRows: DpmCampaignLaunchHistoryRow[] = [
  {
    key: "history-1",
    waveId: "dwv_campaign_launch_001",
    actor: "pm_sg_1",
    launchedAt: "10 May 2026, 00:00 UTC",
    requestedAsOfDate: "10 May 2026",
    correlationId: "corr-campaign-launch",
    idempotencyKey: "campaign-launch:campaign-holdings-202605:2026.05:abc",
  },
];

const launchHistoryPage: DpmCampaignLaunchHistoryPage = {
  productName: "BulkReviewCampaignDefinitionLaunchHistory",
  campaignId: "campaign-holdings-202605",
  campaignVersion: "2026.05",
  count: 1,
  totalCount: 21,
  limit: 10,
  offset: 10,
  operatingBoundaries: [
    "NO_MAKER_CHECKER_WORKFLOW",
    "NO_TRADE_APPROVAL",
    "NO_ORDER_GENERATION",
    "NO_OMS_EXECUTION_CLAIM",
  ],
  hasPreviousPage: true,
  hasNextPage: true,
};

describe("DpmCampaignLaunchHistoryCard", () => {
  it("renders append-only launch history and delegates pagination", () => {
    const onLoadLaunchHistory = vi.fn();

    render(
      <DpmCampaignLaunchHistoryCard
        rows={launchHistoryRows}
        page={launchHistoryPage}
        selectedCampaign={campaign}
        onLoadLaunchHistory={onLoadLaunchHistory}
      />
    );

    expect(screen.getByRole("heading", { name: "Campaign launch history" })).toBeInTheDocument();
    expect(screen.getByText("Apple and Tesla holdings review version 2026.05 | 1 of 21 launch records")).toBeInTheDocument();
    expect(screen.getByText("dwv_campaign_launch_001")).toBeInTheDocument();
    expect(screen.getByText("10 May 2026, 00:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("10 May 2026")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Manager")).toBeInTheDocument();
    expect(screen.getByText("campaign-launch:campaign-holdings-202605:2026.05:abc")).toBeInTheDocument();

    const boundaries = screen.getByLabelText("Campaign launch history boundaries");
    expect(
      within(boundaries).getByText(
        "No maker-checker workflow, No trade approval, No order generation, No execution claim"
      )
    ).toBeInTheDocument();
    expect(within(boundaries).getByText("11-11 of 21")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Review Date" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "As-of date" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onLoadLaunchHistory).toHaveBeenNthCalledWith(1, campaign, 0);
    expect(onLoadLaunchHistory).toHaveBeenNthCalledWith(2, campaign, 20);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /order/i })).not.toBeInTheDocument();
  });

  it("fails closed when launch history is not loaded or unavailable", () => {
    render(
      <DpmCampaignLaunchHistoryCard
        rows={[]}
        page={{
          ...launchHistoryPage,
          count: 0,
          totalCount: 0,
          offset: 0,
          operatingBoundaries: [],
          hasPreviousPage: false,
          hasNextPage: false,
        }}
        selectedCampaign={null}
        error="Campaign launch history needs Manage source evidence"
        onLoadLaunchHistory={vi.fn()}
      />
    );

    expect(screen.getByText("Campaign launch history needs Manage source evidence")).toBeInTheDocument();
    expect(screen.getByText("No launch history loaded")).toBeInTheDocument();
    expect(screen.getByText("No order generation or OMS execution claim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
