import {
  assertRfc3643FeatureCoverage,
  buildRfc3643FeatureCoverage,
} from "../../scripts/live/validation/rfc36-43-feature-coverage.mjs";

function createReadySummary() {
  const panels = [
    "dpm.command_center",
    "dpm.portfolio_memory",
    "dpm.copilot_workspace",
    "dpm.construction_alternatives",
    "dpm.proof_pack",
    "dpm.wave_command_center",
    "dpm.outcome_review",
    "dpm.pm_operating_quality",
    "proposal.narrative_posture",
    "proposal.memo_evidence_pack",
  ];
  return {
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
    panelClassifications: panels.map((panel) => ({ panel, state: "ready" })),
  };
}

function createReadyEvidence() {
  return {
    foundationWorkspace: {},
    manageSupportabilitySummary: {},
    gatewayOverview: {},
    commandCenterSummary: {},
    dpmCommandCenterPanel: true,
    activeExceptions: true,
    coreCandidateSourcePreview: true,
    coreCandidateSourceInvalidRequestRejected: true,
    portfolioMemory: [{ event_id: "evt-1" }],
    mandateLookup: "MANDATE_PB_SG_GLOBAL_BAL_001",
    mandateHealth: true,
    constructionAlternativesPanel: true,
    proofPackId: "proof-1",
    proofPackSections: 2,
    proofPackSourceEvidence: 3,
    proofPackPanel: true,
    proofPackAiMemo: "ai-proof-1",
    wavePreview: true,
    multiPortfolioWavePreview: true,
    waveId: "wave-1",
    waveReportInput: "report-input-1",
    waveAiMemo: "ai-wave-1",
    wavePanel: true,
    outcomeReviewRows: [{ outcome_review_id: "review-1" }],
    outcomeReviewPanel: true,
    pmQualityScoreRun: "score-run-1",
    pmQualityFairnessAnalysis: "fairness-1",
    pmQualityReviewAction: "review-action-1",
    pmQualitySummaryInvocation: "summary-invocation-1",
    pmQualityPanel: true,
    copilotWorkspace: true,
    copilotPanel: true,
    proposalNarrative: "proposal-narrative-1",
    proposalNarrativePanel: true,
    proposalMemoEvidencePack: "proposal-1",
    proposalMemoEvidencePackPanel: true,
  };
}

describe("RFC36-43 live validation feature coverage", () => {
  it("records feature-by-feature coverage across implemented RFC36-43 product paths", () => {
    const summary = createReadySummary();
    const coverage = buildRfc3643FeatureCoverage(summary, createReadyEvidence());

    expect(coverage.contractId).toBe("rfc36-43-front-office-feature-coverage");
    expect(coverage.validatedFeatureCount).toBe(10);
    expect(coverage.gapFeatureCount).toBe(0);
    expect(coverage.rfc3643FeatureCount).toBe(9);
    expect(coverage.validatedRfc3643FeatureCount).toBe(9);
    expect(coverage.rfc3643GapFeatureCount).toBe(0);
    expect(coverage.adjacentEvidenceFeatureCount).toBe(1);
    expect(coverage.validatedAdjacentEvidenceFeatureCount).toBe(1);
    expect(coverage.adjacentEvidenceGapFeatureCount).toBe(0);
    expect(coverage.coverageRows.map((row) => row.rfcId)).toEqual(
      expect.arrayContaining([
        "RFC-0036",
        "RFC-0037",
        "RFC-0038",
        "RFC-0039",
        "RFC-0040",
        "RFC-0041",
        "RFC-0042",
        "RFC-0043",
      ])
    );
    expect(
      coverage.coverageRows
        .filter((row) => row.auditScope === "rfc36-43")
        .map((row) => row.rfcId)
    ).not.toContain("RFC-0024");
    expect(coverage.coverageRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rfcId: "RFC-0037",
          featureId: "dpm_operating_system",
          coverageStatus: "validated",
          scenarioScope: "bounded Core DPM candidate-source preview and no-caller-portfolio guard",
        }),
        expect.objectContaining({
          rfcId: "RFC-0041",
          featureId: "rebalance_wave_explicit_portfolio_product_path",
          coverageStatus: "validated",
          scenarioScope: "single-portfolio and multi-portfolio explicit-list waves",
          scenarioExpansionNeeded: expect.arrayContaining([
            "source-owner cohort products for broader campaign discovery scenarios",
          ]),
        }),
        expect.objectContaining({
          rfcId: "RFC-0043",
          featureId: "governed_ai_pm_copilot",
          coverageStatus: "validated",
          unsupportedClaimsExcluded: expect.arrayContaining(["raw prompt storage"]),
        }),
        expect.objectContaining({
          rfcId: "RFC-0024",
          auditScope: "adjacent-front-office",
          featureId: "advisor_proposal_memo_evidence_pack",
          coverageStatus: "validated",
          uiPanels: ["proposal.narrative_posture", "proposal.memo_evidence_pack"],
          unsupportedClaimsExcluded: expect.arrayContaining([
            "approved-state inference by Workbench",
          ]),
        }),
      ])
    );
  });

  it("fails when an implemented RFC feature has no backing live evidence", () => {
    const summary = createReadySummary();
    const evidence = createReadyEvidence();
    delete (evidence as Record<string, unknown>).proofPackSourceEvidence;
    (summary as Record<string, unknown>).rfc3643FeatureCoverage = buildRfc3643FeatureCoverage(
      summary,
      evidence
    );

    expect(() => assertRfc3643FeatureCoverage(summary)).toThrow(
      "RFC36-43 feature coverage gaps remain: RFC-0040/proof_pack_evidence"
    );
  });

  it("does not fail RFC36-43 validation when adjacent front-office proof is incomplete", () => {
    const summary = createReadySummary();
    const evidence = createReadyEvidence();
    delete (evidence as Record<string, unknown>).proposalMemoEvidencePack;
    const coverage = buildRfc3643FeatureCoverage(summary, evidence);
    (summary as Record<string, unknown>).rfc3643FeatureCoverage = coverage;

    expect(coverage.gapFeatureCount).toBe(1);
    expect(coverage.rfc3643GapFeatureCount).toBe(0);
    expect(coverage.adjacentEvidenceGapFeatureCount).toBe(1);
    expect(() => assertRfc3643FeatureCoverage(summary)).not.toThrow();
  });
});
