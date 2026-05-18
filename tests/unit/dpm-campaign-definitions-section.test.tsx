import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmCampaignDefinitionsSection from "../../src/features/workbench/components/dpm-campaign-definitions-section";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchHistoryPage,
  DpmCampaignLaunchHistoryRow,
  DpmCampaignLaunchPosture,
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
};

const lifecycleRows: DpmCampaignLifecycleEventRow[] = [
  {
    key: "event-1",
    eventType: "LAUNCHED",
    occurredAt: "2026-05-14T09:30:00Z",
    actor: "pm_sg_1",
    status: "RECORDED",
    reason: "campaign_definition_launched",
    waveId: "dwv_campaign_launch_001",
    requestedAsOfDate: "2026-05-10",
    correlationId: "corr-campaign-launch",
    idempotencyKey: "campaign-launch:campaign-holdings-202605:2026.05:abc",
  },
];

const launchHistoryRows: DpmCampaignLaunchHistoryRow[] = [
  {
    key: "history-1",
    waveId: "dwv_campaign_launch_001",
    actor: "pm_sg_1",
    launchedAt: "2026-05-10T00:00:00Z",
    requestedAsOfDate: "2026-05-10",
    correlationId: "corr-campaign-launch",
    idempotencyKey: "campaign-launch:campaign-holdings-202605:2026.05:abc",
  },
];

const launchHistoryPage: DpmCampaignLaunchHistoryPage = {
  productName: "BulkReviewCampaignDefinitionLaunchHistory",
  campaignId: "campaign-holdings-202605",
  campaignVersion: "2026.05",
  count: 1,
  totalCount: 11,
  limit: 10,
  offset: 0,
  operatingBoundaries: [
    "NO_MAKER_CHECKER_WORKFLOW",
    "NO_TRADE_APPROVAL",
    "NO_ORDER_GENERATION",
    "NO_OMS_EXECUTION_CLAIM",
  ],
  hasPreviousPage: false,
  hasNextPage: true,
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

describe("DpmCampaignDefinitionsSection", () => {
  it("renders campaign evidence and delegates bounded Gateway-backed actions", () => {
    const onLoadLifecycle = vi.fn();
    const onLoadLaunchHistory = vi.fn();
    const onCheckLaunchReadiness = vi.fn();
    const onLaunchCampaign = vi.fn();

    render(
      <DpmCampaignDefinitionsSection
        rows={[campaign]}
        lifecycleRows={lifecycleRows}
        launchHistoryRows={launchHistoryRows}
        launchHistoryPage={launchHistoryPage}
        launchPosture={launchPosture}
        selectedCampaign={campaign}
        selectedCampaignKey={campaign.key}
        onLoadLifecycle={onLoadLifecycle}
        onLoadLaunchHistory={onLoadLaunchHistory}
        onCheckLaunchReadiness={onCheckLaunchReadiness}
        onLaunchCampaign={onLaunchCampaign}
      />
    );

    expect(screen.getByRole("heading", { name: "Campaign Definitions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Lifecycle Evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Launch History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Launch Posture" })).toBeInTheDocument();
    expect(screen.getByText("Apple and Tesla holdings review")).toBeInTheDocument();
    expect(screen.getByText("Source-backed")).toBeInTheDocument();
    expect(screen.getByText("campaign_definition_launched")).toBeInTheDocument();
    expect(
      screen.getByText(
        "NO_MAKER_CHECKER_WORKFLOW, NO_TRADE_APPROVAL, NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM"
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Open History" }));
    fireEvent.click(screen.getByRole("button", { name: "Check Readiness" }));
    fireEvent.click(screen.getByRole("button", { name: "Launch Campaign" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onLoadLifecycle).toHaveBeenCalledWith(campaign);
    expect(onLoadLaunchHistory).toHaveBeenNthCalledWith(1, campaign);
    expect(onLoadLaunchHistory).toHaveBeenNthCalledWith(2, campaign, 10);
    expect(onCheckLaunchReadiness).toHaveBeenCalledWith(campaign);
    expect(onLaunchCampaign).toHaveBeenCalledWith(campaign);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
  });

  it("renders fail-closed empty and error posture without enabling launch", () => {
    render(
      <DpmCampaignDefinitionsSection
        rows={[]}
        lifecycleRows={[]}
        launchHistoryRows={[]}
        launchHistoryPage={{ ...launchHistoryPage, count: 0, totalCount: 0, hasNextPage: false }}
        launchPosture={{ ...launchPosture, state: "BLOCKED", canLaunch: false }}
        selectedCampaign={null}
        errorMessage="Campaign definitions unavailable"
        launchError="Campaign launch needs source readiness"
        onLoadLifecycle={vi.fn()}
        onLoadLaunchHistory={vi.fn()}
        onCheckLaunchReadiness={vi.fn()}
        onLaunchCampaign={vi.fn()}
      />
    );

    expect(screen.getByText("Campaign definitions unavailable")).toBeInTheDocument();
    expect(screen.getByText("Campaign launch needs source readiness")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Launch Campaign" })).toBeDisabled();
    expect(screen.getByText("No active campaign definitions")).toBeInTheDocument();
    expect(screen.getByText("No launch history loaded")).toBeInTheDocument();

    const posture = screen.getByLabelText("Campaign launch posture");
    expect(within(posture).getByText("Blocked")).toBeInTheDocument();
  });
});
