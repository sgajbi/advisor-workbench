import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BankDemoProofWorkspace from "../../src/features/proposals/components/bank-demo-proof-workspace";

const getBankDemoScenarioContractMock = vi.fn(async () => ({
  scenario_id: "RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL",
  primary_portfolio_id: "PB_SG_GLOBAL_BAL_001",
  governed_as_of_date: "2026-05-28",
  proof_marker: "BANK_DEMO_PROOF_PACK_CREATED",
  required_source_products: ["AdvisorCockpitOperatingSnapshot:v1"],
  unsupported_boundaries: [
    "Client-ready publication remains blocked until publication controls and supported-claim review pass.",
  ],
  steps: [
    {
      step_id: "advisor_cockpit_operating_snapshot",
      title: "Advisor reviews source-backed cockpit actions",
      owner_repository: "lotus-advise",
      required_evidence_refs: ["proof.assets.sanitized_runtime_summary"],
      required_workbench_panels: ["advisor_cockpit"],
    },
  ],
}));

const getBankDemoSupportedClaimRegisterMock = vi.fn(async () => ({
  scenario_id: "RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL",
  primary_portfolio_id: "PB_SG_GLOBAL_BAL_001",
  proof_marker: "BANK_DEMO_PROOF_PACK_CREATED",
  artifact_policy: {
    sensitive_material_rules: [
      "Secrets, tokens, prompts, raw provider payloads, and raw runtime logs stay local.",
    ],
  },
  claims: [
    {
      claim_id: "advisor_journey_backend_evidence_available",
      title: "Advisor journey backend evidence available",
      classification: "IMPLEMENTATION_BACKED",
      audiences: ["CLIENT_DEMO", "PRE_SALES"],
      allowed_materials: ["WIKI", "DEMO_SCRIPT"],
      claim_text:
        "The advisory backend can prove advisor journey evidence before product-surface promotion.",
      proof_requirements: [
        { requirement_id: "rfc0028-backend-advisor-journey-review" },
      ],
      wording_rules: ["Do not imply client-ready approval."],
    },
    {
      claim_id: "client_ready_publication_blocked",
      title: "Client-ready publication is blocked",
      classification: "UNSUPPORTED",
      audiences: ["SALES", "PRE_SALES"],
      allowed_materials: ["WIKI"],
      claim_text:
        "Client-ready publication, sign-off approval, and external client communication are not supported.",
    },
  ],
}));

vi.mock("../../src/features/proposals/api", () => ({
  getBankDemoScenarioContract: () => getBankDemoScenarioContractMock(),
  getBankDemoSupportedClaimRegister: () =>
    getBankDemoSupportedClaimRegisterMock(),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("BankDemoProofWorkspace", () => {
  beforeEach(() => {
    getBankDemoScenarioContractMock.mockClear();
    getBankDemoSupportedClaimRegisterMock.mockClear();
  });

  it("renders Gateway-backed RFC28 proof posture without local claim promotion", async () => {
    renderWithQueryClient(
      <BankDemoProofWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    await waitFor(() => {
      expect(getBankDemoScenarioContractMock).toHaveBeenCalledTimes(1);
      expect(getBankDemoSupportedClaimRegisterMock).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByRole("heading", { name: "Bank Demo Proof" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Bank demo proof summary")).toHaveTextContent(
      /Client Publication\s*Blocked/,
    );
    expect(
      screen.getByText("Advisor reviews source-backed cockpit actions"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Bank demo scenario steps")).toHaveTextContent(
      "Sanitized Runtime Summary",
    );
    expect(
      screen.getByText("Advisor journey backend evidence available"),
    ).toBeInTheDocument();
    expect(screen.getByText("Implementation Backed")).toBeInTheDocument();
    expect(
      screen.getByText("Client-ready publication is blocked"),
    ).toBeInTheDocument();
    expect(screen.getByText("Unsupported")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /approve|publish|client-ready/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render fallback proof claims when Gateway proof contracts fail", async () => {
    getBankDemoSupportedClaimRegisterMock.mockRejectedValueOnce(
      new Error("gateway unavailable"),
    );

    renderWithQueryClient(
      <BankDemoProofWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText(
        "Bank demo proof is unavailable. No local proof claims are shown.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Proof contract unavailable")).toBeInTheDocument();
    expect(
      screen.queryByText("Advisor journey backend evidence available"),
    ).not.toBeInTheDocument();
  });
});
