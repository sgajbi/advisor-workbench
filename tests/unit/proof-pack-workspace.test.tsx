import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProofPackWorkspace from "../../src/features/workbench/components/proof-pack-workspace";
import type { ProofPackPanelModel } from "../../src/features/workbench/proof-pack-view-model";

const readyModel: ProofPackPanelModel = {
  state: "ready",
  supportabilityState: "READY",
  supportabilityReasons: [],
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
  approvalReadinessLabel: "Ready",
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
  evidenceRows: [
    {
      key: "mandate_alignment-0",
      area: "Mandate Alignment",
      status: "READY",
      finding: "Ready for advisor review.",
      action: "View details",
    },
    {
      key: "risk_disclosure-1",
      area: "Risk Disclosure",
      status: "PENDING_REVIEW",
      finding: "Risk evidence needs review.",
      action: "Review",
    },
  ],
  coverageItems: [
    {
      key: "mandate_alignment-0",
      area: "Mandate Alignment",
      status: "READY",
      finding: "Ready for advisor review.",
      action: "View details",
    },
  ],
  documents: [
    {
      key: "client_report-0",
      label: "Client Report",
      status: "Available",
    },
  ],
  sourceHashes: [],
};

describe("ProofPackWorkspace", () => {
  it("renders evidence workspace without leaking source identifiers or hashes", () => {
    render(
      <ProofPackWorkspace
        model={readyModel}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        proofPackId="ppack_1"
        pendingAction={null}
        onRequestAiPmMemo={vi.fn()}
        onLoadReportInput={vi.fn()}
        onLoadMarkdown={vi.fn()}
      />
    );

    expect(screen.getByRole("table", { name: "Evidence areas" })).toBeInTheDocument();
    expect(screen.getAllByText("Mandate Alignment").length).toBeGreaterThan(0);
    expect(screen.getByText("Risk Disclosure")).toBeInTheDocument();
    expect(screen.getByText("Portfolio positioning remains within the mandate corridor.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to outcome review" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001?mode=reviews"
    );
    expect(screen.queryByText("ppack_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:proof-pack")).not.toBeInTheDocument();
    expect(screen.queryByText("lotus-manage")).not.toBeInTheDocument();
  });

  it("delegates evidence handoff actions without adding unsupported controls", () => {
    const onRequestAiPmMemo = vi.fn();
    const onLoadReportInput = vi.fn();
    const onLoadMarkdown = vi.fn();

    render(
      <ProofPackWorkspace
        model={readyModel}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        proofPackId="ppack_1"
        pendingAction={null}
        onRequestAiPmMemo={onRequestAiPmMemo}
        onLoadReportInput={onLoadReportInput}
        onLoadMarkdown={onLoadMarkdown}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Open advisor memo/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Check report readiness/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Load evidence summary/ }));

    expect(onRequestAiPmMemo).toHaveBeenCalledTimes(1);
    expect(onLoadReportInput).toHaveBeenCalledTimes(1);
    expect(onLoadMarkdown).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Evidence pack next actions")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Generate client report/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send client message/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
  });

  it("keeps handoff actions fail-closed when evidence is unavailable", () => {
    render(
      <ProofPackWorkspace
        model={{
          ...readyModel,
          markdownAvailable: false,
          reportInputAvailable: false,
          aiEvidenceInputAvailable: false,
          evidenceRows: [],
          coverageItems: [],
          documents: [],
        }}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        proofPackId={null}
        pendingAction={null}
        onRequestAiPmMemo={vi.fn()}
        onLoadReportInput={vi.fn()}
        onLoadMarkdown={vi.fn()}
      />
    );

    expect(screen.getByText("No evidence areas available")).toBeInTheDocument();
    expect(screen.getByText("No completed coverage items returned.")).toBeInTheDocument();
    expect(screen.getByText("No supporting document references returned")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Open advisor memo/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Check report readiness/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Load evidence summary/ })).toBeDisabled();
  });
});
