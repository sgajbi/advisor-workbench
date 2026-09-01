import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import ProofPackSummary from "../../src/features/workbench/components/proof-pack-summary";
import type { ProofPackPanelModel } from "../../src/features/workbench/proof-pack-view-model";

const readyModel: ProofPackPanelModel = {
  state: "ready",
  supportabilityState: "READY",
  supportabilityReasons: ["PROOF_PACK_READY"],
  sourceService: "lotus-manage",
  authority: "lotus-manage:RFC-0040",
  correlationId: "corr-proof",
  proofPackId: "ppack_1",
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
  rebalanceRunId: "rr_1",
  alternativeSetId: "alt_set_1",
  selectedAlternativeId: "alt_1",
  asOfDate: "2026-05-20",
  status: "READY",
  evidenceStatusLabel: "Available",
  approvalReadinessLabel: "Signature Pending",
  mandateCoverageLabel: "Complete",
  reportReadinessLabel: "Ready",
  selectedEvidenceTitle: "Mandate Alignment",
  selectedEvidenceSummary: "Ready for advisor review.",
  advisorRationale: "Portfolio positioning remains within the mandate corridor.",
  contentHash: "sha256:proof-pack",
  sectionStateSummary: "READY: 2",
  markdownAvailable: true,
  reportInputAvailable: true,
  aiEvidenceInputAvailable: true,
  sections: [],
  evidenceRows: [],
  coverageItems: [],
  documents: [],
  sourceHashes: [],
};

function renderSummary(overrides: Partial<ComponentProps<typeof ProofPackSummary>> = {}) {
  const props: ComponentProps<typeof ProofPackSummary> = {
    model: readyModel,
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    proofPackId: "ppack_1",
    rebalanceRunId: "rr_1",
    pendingAction: null,
    actionError: null,
    handoffStatus: null,
    onGenerateProofPack: vi.fn(),
    onLoadProofPack: vi.fn(),
    ...overrides,
  };

  render(<ProofPackSummary {...props} />);
  return props;
}

describe("ProofPackSummary", () => {
  it("renders source-backed proof-pack posture without leaking identifiers", () => {
    renderSummary();

    expect(screen.getByText("Evidence status")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Approval readiness")).toBeInTheDocument();
    expect(screen.getByText("Signature Pending")).toBeInTheDocument();
    expect(screen.getByText("Mandate coverage")).toBeInTheDocument();
    expect(screen.getByText("Evidence pack ready")).toBeInTheDocument();
    expect(screen.queryByText("ppack_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:proof-pack")).not.toBeInTheDocument();
    expect(screen.queryByText("lotus-manage")).not.toBeInTheDocument();
  });

  it("delegates lifecycle actions without repeating downstream handoffs", () => {
    const props = renderSummary();

    fireEvent.click(screen.getByRole("button", { name: "Prepare evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Load evidence" }));

    expect(props.onGenerateProofPack).toHaveBeenCalledTimes(1);
    expect(props.onLoadProofPack).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Evidence pack lifecycle actions")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /summary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /report/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send client message/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
  });

  it("renders fail-closed unavailable posture and disables actions", () => {
    renderSummary({
      model: {
        ...readyModel,
        state: "unavailable",
        supportabilityState: "UNAVAILABLE",
        evidenceStatusLabel: "Unavailable",
        markdownAvailable: false,
        reportInputAvailable: false,
        aiEvidenceInputAvailable: false,
      },
      proofPackId: null,
      rebalanceRunId: null,
      errorMessage: "Failed to fetch DPM proof pack (503)",
    });

    expect(screen.getByText("Evidence pack is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM proof pack (503)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare evidence" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Load evidence" })).toBeDisabled();
  });

  it("shows bounded handoff messages from parent-owned Gateway actions", () => {
    renderSummary({ handoffStatus: "Evidence pack prepared." });

    expect(screen.getByText("Evidence pack prepared.")).toBeInTheDocument();
    expect(screen.queryByText(/Gateway proof-pack endpoints/)).not.toBeInTheDocument();
  });
});
