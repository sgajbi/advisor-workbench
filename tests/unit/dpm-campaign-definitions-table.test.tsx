import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmCampaignDefinitionsTable from "../../src/features/workbench/components/dpm-campaign-definitions-table";
import type {
  DpmCampaignDefinitionRow,
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

describe("DpmCampaignDefinitionsTable", () => {
  it("renders source-backed campaign rows and delegates bounded actions", () => {
    const onLoadLifecycle = vi.fn();
    const onLoadLaunchHistory = vi.fn();
    const onCheckLaunchReadiness = vi.fn();

    render(
      <DpmCampaignDefinitionsTable
        rows={[campaign]}
        selectedCampaignKey={campaign.key}
        onLoadLifecycle={onLoadLifecycle}
        onLoadLaunchHistory={onLoadLaunchHistory}
        onCheckLaunchReadiness={onCheckLaunchReadiness}
      />
    );

    expect(screen.getByRole("table", { name: "DPM campaign definitions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apple and Tesla holdings review" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("2026.05")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("DISCRETIONARY")).toBeInTheDocument();
    expect(screen.getByText("Source-backed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apple and Tesla holdings review" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Open History" }));
    fireEvent.click(screen.getByRole("button", { name: "Check Readiness" }));

    expect(onLoadLifecycle).toHaveBeenNthCalledWith(1, campaign);
    expect(onLoadLifecycle).toHaveBeenNthCalledWith(2, campaign);
    expect(onLoadLaunchHistory).toHaveBeenCalledWith(campaign);
    expect(onCheckLaunchReadiness).toHaveBeenCalledWith(campaign);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /order/i })).not.toBeInTheDocument();
  });

  it("renders empty and pending postures without local campaign workflow claims", () => {
    render(
      <DpmCampaignDefinitionsTable
        rows={[]}
        pendingLifecycleKey={campaign.key}
        pendingLaunchHistoryKey={campaign.key}
        pendingPreviewReadinessKey={campaign.key}
        onLoadLifecycle={vi.fn()}
        onLoadLaunchHistory={vi.fn()}
        onCheckLaunchReadiness={vi.fn()}
      />
    );

    expect(screen.getByText("No active campaign definitions")).toBeInTheDocument();
    expect(
      screen.getByText("Persist a Manage campaign definition before using bulk-review campaign waves.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /launch campaign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
  });

  it("disables row actions while source-backed actions are pending", () => {
    render(
      <DpmCampaignDefinitionsTable
        rows={[campaign]}
        pendingLifecycleKey={campaign.key}
        pendingLaunchHistoryKey={campaign.key}
        pendingLaunchPackageKey={campaign.key}
        onLoadLifecycle={vi.fn()}
        onLoadLaunchHistory={vi.fn()}
        onCheckLaunchReadiness={vi.fn()}
      />
    );

    const loadingButtons = screen.getAllByRole("button", { name: "Loading" });
    expect(loadingButtons).toHaveLength(2);
    expect(loadingButtons[0]).toBeDisabled();
    expect(loadingButtons[1]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Checking" })).toBeDisabled();
  });
});
