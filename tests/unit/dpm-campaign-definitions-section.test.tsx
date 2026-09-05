import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmCampaignDefinitionsSection from "../../src/features/workbench/components/dpm-campaign-definitions-section";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLaunchHistoryPage,
  DpmCampaignLaunchPosture,
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
  nextAction: "Review launch readiness and any source-owned blockers.",
  operatingBoundaries: "NO_OMS_EXECUTION_CLAIM, NO_CLIENT_CONTACT_WORKFLOW",
};

const replacementCampaign: DpmCampaignDefinitionRow = {
  ...campaign,
  key: "campaign-holdings-202605:2026.06",
  campaignVersion: "2026.06",
  displayName: "June holdings review",
  asOfDate: "2026-06-10",
};

const launchHistoryPage: DpmCampaignLaunchHistoryPage = {
  productName: "BulkReviewCampaignDefinitionLaunchHistory",
  campaignId: campaign.campaignId,
  campaignVersion: campaign.campaignVersion,
  count: 0,
  totalCount: 0,
  limit: 10,
  offset: 0,
  operatingBoundaries: [],
  hasPreviousPage: false,
  hasNextPage: false,
};

const launchPosture: DpmCampaignLaunchPosture = {
  state: "READY",
  canLaunch: true,
  reason: "campaign_launch_ready",
  requestedAsOfDate: "10 May 2026",
  actor: "pm_sg_1",
  launchedWaveId: "N/A",
  idempotencyEvidence: "campaign-launch:campaign-holdings-202605:2026.05:abc",
};

function renderWorkspace(overrides: Partial<React.ComponentProps<typeof DpmCampaignDefinitionsSection>> = {}) {
  const callbacks = {
    onSelectCampaign: vi.fn(),
    onLoadLifecycle: vi.fn(),
    onLoadLaunchHistory: vi.fn(),
    onLoadWorkflowEvidence: vi.fn(),
    onCheckLaunchReadiness: vi.fn(),
    onLaunchCampaign: vi.fn(),
    onRecordLifecycleCommand: vi.fn().mockResolvedValue(undefined),
    onRecordWorkflowCommand: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <DpmCampaignDefinitionsSection
      rows={[campaign, replacementCampaign]}
      lifecycleRows={[]}
      launchHistoryRows={[]}
      launchHistoryPage={launchHistoryPage}
      launchPosture={launchPosture}
      selectedCampaign={campaign}
      selectedCampaignKey={campaign.key}
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
}

describe("DpmCampaignDefinitionsSection", () => {
  it("renders a dense selected-record decision workspace and loads exact source evidence", async () => {
    const callbacks = renderWorkspace();

    expect(screen.getByRole("heading", { name: "Campaign administration" })).toBeInTheDocument();
    expect(screen.getByTestId("workbench-decision-workspace")).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Governed rebalance campaigns" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Apple and Tesla holdings review/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Candidate Source Review" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Governance action" })).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Review launch readiness and any source-owned blockers.").length,
    ).toBeGreaterThan(0);

    await waitFor(() => expect(callbacks.onLoadLifecycle).toHaveBeenCalledWith(campaign));
    expect(callbacks.onLoadLaunchHistory).toHaveBeenCalledWith(campaign, 0);
    expect(callbacks.onLoadWorkflowEvidence).toHaveBeenCalledWith(campaign);
    expect(callbacks.onCheckLaunchReadiness).toHaveBeenCalledWith(campaign);
  });

  it("shows one action mode at a time and requires consequence review", async () => {
    const callbacks = renderWorkspace();
    await waitFor(() => expect(callbacks.onLoadLifecycle).toHaveBeenCalledWith(campaign));

    fireEvent.click(screen.getByRole("button", { name: "Lifecycle control" }));
    expect(screen.getByRole("heading", { name: "Lifecycle control" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Candidate Source Review" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Business rationale"), {
      target: { value: "The review cycle is complete." },
    });
    expect(screen.getByRole("button", { name: "Retire campaign" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I understand this prevents future launches/));
    expect(screen.getByRole("button", { name: "Retire campaign" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Retire campaign" }));
    expect(callbacks.onRecordLifecycleCommand).toHaveBeenCalledWith({
      commandType: "retire",
      body: expect.objectContaining({
        retired_by: expect.any(String),
        retirement_reason: "The review cycle is complete.",
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Launch decision" }));
    expect(screen.getByRole("button", { name: "Launch rebalance wave" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I reviewed the source readiness/));
    fireEvent.click(screen.getByRole("button", { name: "Launch rebalance wave" }));
    expect(callbacks.onLaunchCampaign).toHaveBeenCalledWith(campaign);
  });

  it("surfaces the shared campaign command lock across every action mode", async () => {
    const callbacks = renderWorkspace({ commandPending: true });
    await waitFor(() =>
      expect(callbacks.onLoadLifecycle).toHaveBeenCalledWith(campaign),
    );

    fireEvent.click(screen.getByRole("button", { name: "Governance action" }));
    expect(
      screen.getByRole("button", {
        name: "Another campaign action is in progress",
      }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Lifecycle control" }));
    expect(
      screen.getByRole("button", {
        name: "Another campaign action is in progress",
      }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Launch decision" }));
    expect(
      screen.getByRole("button", {
        name: "Another campaign action is in progress",
      }),
    ).toBeDisabled();
  });

  it("preserves keyboard selection and requests the source identity change", async () => {
    const callbacks = renderWorkspace();
    await waitFor(() => expect(callbacks.onLoadLifecycle).toHaveBeenCalledWith(campaign));
    const first = screen.getByRole("option", { name: /Apple and Tesla holdings review/ });

    fireEvent.keyDown(first, { key: "ArrowDown" });

    expect(callbacks.onSelectCampaign).toHaveBeenCalledWith(replacementCampaign);
  });

  it("defers a new selection until the prior evidence request settles, then retries it", async () => {
    const callbacks = {
      onSelectCampaign: vi.fn(),
      onLoadLifecycle: vi.fn(),
      onLoadLaunchHistory: vi.fn(),
      onLoadWorkflowEvidence: vi.fn(),
      onCheckLaunchReadiness: vi.fn(),
      onLaunchCampaign: vi.fn(),
      onRecordLifecycleCommand: vi.fn().mockResolvedValue(undefined),
      onRecordWorkflowCommand: vi.fn().mockResolvedValue(undefined),
    };
    const section = (
      selectedCampaign: DpmCampaignDefinitionRow,
      pendingLifecycleKey: string | null,
    ) => (
      <DpmCampaignDefinitionsSection
        rows={[campaign, replacementCampaign]}
        lifecycleRows={[]}
        launchHistoryRows={[]}
        launchHistoryPage={launchHistoryPage}
        launchPosture={launchPosture}
        selectedCampaign={selectedCampaign}
        selectedCampaignKey={selectedCampaign.key}
        pendingLifecycleKey={pendingLifecycleKey}
        {...callbacks}
      />
    );
    const view = render(section(campaign, campaign.key));

    view.rerender(section(replacementCampaign, campaign.key));
    expect(screen.getByRole("status")).toHaveTextContent("Refreshing source evidence");
    expect(callbacks.onLoadLifecycle).not.toHaveBeenCalledWith(replacementCampaign);

    view.rerender(section(replacementCampaign, null));
    await waitFor(() =>
      expect(callbacks.onLoadLifecycle).toHaveBeenCalledWith(replacementCampaign),
    );
    expect(callbacks.onLoadLaunchHistory).toHaveBeenCalledWith(replacementCampaign, 0);
    expect(callbacks.onLoadWorkflowEvidence).toHaveBeenCalledWith(replacementCampaign);
    expect(callbacks.onCheckLaunchReadiness).toHaveBeenCalledWith(replacementCampaign);
  });

  it("renders one useful empty state without action controls", () => {
    renderWorkspace({ rows: [], selectedCampaign: null, selectedCampaignKey: null });

    expect(screen.getByText("No governed campaigns in scope")).toBeInTheDocument();
    expect(screen.queryByTestId("workbench-decision-workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /launch/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retire/i })).not.toBeInTheDocument();
  });

  it("never describes failed selected-campaign evidence as current", async () => {
    const callbacks = renderWorkspace({
      lifecycleError: "Manage lifecycle evidence is unavailable.",
    });

    await waitFor(() => expect(callbacks.onLoadLifecycle).toHaveBeenCalledWith(campaign));
    expect(screen.getByText("Source evidence needs attention")).toHaveAttribute("role", "alert");
    expect(screen.queryByText("Source evidence current")).not.toBeInTheDocument();
  });

  it("keeps book-wide workflow posture outside the selected campaign evidence", async () => {
    const callbacks = renderWorkspace({
      workflowSummaryRows: [
        {
          key: "operating-queue",
          surface: "Operating Queue",
          state: "READY",
          itemCount: "12",
          page: "1-10 of 12",
          sourceRefs: "4",
          reasonCodes: "SOURCE_WINDOW_READY",
          contentHash: "sha256:book-window",
          operatingBoundaries: "NO_OMS_EXECUTION_CLAIM",
        },
      ],
    });

    await waitFor(() => expect(callbacks.onLoadWorkflowEvidence).toHaveBeenCalledWith(campaign));
    expect(screen.getByText("Book-wide campaign workflow")).toBeInTheDocument();
    expect(
      screen.getByText(/These totals describe the book-wide workflow, not the selected campaign/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Governance action" }));
    fireEvent.click(screen.getByText("Source evidence and operating audit"));
    expect(
      screen.getByRole("table", { name: "Book-wide campaign workflow summary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Selected campaign governance evidence history" }),
    ).toBeInTheDocument();
  });

  it("prevents a repeated lifecycle action after source persistence is confirmed", async () => {
    const callbacks = renderWorkspace({
      lifecycleError:
        "Lifecycle action was recorded, but refreshed campaign evidence could not be loaded.",
      lifecycleCommandEvidence: {
        commandLabel: "Retire campaign",
        status: "RETIRED",
        actor: "pm_sg_1",
        reason: "The campaign review cycle is complete.",
        replacementCampaignVersion: "N/A",
        correlationId: "corr-campaign-retire",
        sourceService: "lotus-manage",
        upstreamStatus: "200",
        contentHash: "sha256:campaign-retired",
        reasonCodes: "campaign_definition_retired",
        operatingBoundaries: "NO_OMS_EXECUTION_CLAIM",
      },
    });

    await waitFor(() => expect(callbacks.onLoadLifecycle).toHaveBeenCalledWith(campaign));
    fireEvent.click(screen.getByRole("button", { name: "Lifecycle control" }));
    expect(screen.getByRole("button", { name: "Lifecycle action recorded" })).toBeDisabled();
    expect(screen.getByLabelText("Lifecycle action")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload lifecycle evidence" }));
    await waitFor(() => expect(callbacks.onLoadLifecycle).toHaveBeenCalledTimes(2));
  });
});
