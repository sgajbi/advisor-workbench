import { createPanelGovernance } from "../../scripts/live/validation/panel-governance.mjs";

function createSummary() {
  return {
    panelClassifications: [],
    supportabilityChecks: [],
  };
}

const registry = {
  panels: [
    {
      panelId: "portfolio.summary",
      owningService: "lotus-gateway",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/overview",
      requiredSupportState: "ready",
      allowedStates: ["ready", "partial", "unavailable", "supported_blank"],
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.evidence",
      owningService: "lotus-gateway",
      gatewayEndpoint: null,
      requiredSupportState: "unavailable",
      allowedStates: ["ready", "partial", "unavailable", "supported_blank"],
      knownLimitations: ["deferred to RFC-0079"],
      ownerFollowUpRfc: "RFC-0079",
    },
  ],
};

describe("live validation panel governance", () => {
  it("records classifications and supportability checks for governed panels", () => {
    const summary = createSummary();
    const governance = createPanelGovernance(summary, registry);

    governance.recordPanelClassification("portfolio.summary", "ready", "lotus-gateway", {
      portfolioId: "PB_SG_GLOBAL_BAL_001",
    });
    governance.recordPanelClassification("performance.evidence", "unavailable", "lotus-gateway", {
      reason: "gateway contract pending",
    });

    governance.assertNoUnsupportedBlankPanels();
    governance.assertPanelSupportabilityAlignment();

    expect(summary.panelClassifications).toHaveLength(2);
    expect(summary.supportabilityChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          panel: "portfolio.summary",
          state: "ready",
          requiredSupportState: "ready",
        }),
        expect.objectContaining({
          panel: "performance.evidence",
          state: "unavailable",
          ownerFollowUpRfc: "RFC-0079",
        }),
      ])
    );
  });

  it("fails unsupported blank panels explicitly", () => {
    const summary = createSummary();
    const governance = createPanelGovernance(summary, registry);

    governance.recordPanelClassification("portfolio.summary", "supported_blank", "lotus-gateway", {
      reason: "unexpected blank",
    });
    governance.recordPanelClassification("performance.evidence", "unavailable", "lotus-gateway", {
      reason: "gateway contract pending",
    });

    expect(() => governance.assertNoUnsupportedBlankPanels()).toThrow(
      "Unsupported blank panels found: portfolio.summary."
    );
  });

  it("fails owner drift against the registry", () => {
    const summary = createSummary();
    const governance = createPanelGovernance(summary, registry);

    governance.recordPanelClassification("portfolio.summary", "ready", "lotus-performance", {
      portfolioId: "PB_SG_GLOBAL_BAL_001",
    });
    governance.recordPanelClassification("performance.evidence", "unavailable", "lotus-gateway", {
      reason: "gateway contract pending",
    });

    expect(() => governance.assertPanelSupportabilityAlignment()).toThrow("registry owner");
  });
});
