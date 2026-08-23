const RFC_FEATURE_COVERAGE_ROWS = [
  {
    rfcId: "RFC-0036",
    auditScope: "rfc36-43",
    featureId: "stateful_core_sourcing",
    featureName: "Stateful core sourcing and canonical manage API boundary",
    owner: "lotus-manage",
    requiredEvidence: [
      "portfolioWorkspace",
      "manageSupportabilitySummary",
      "gatewayOverview",
      "dpmCommandCenterPanel",
    ],
    uiPanels: ["dpm.command_center"],
    unsupportedClaimsExcluded: [
      "local portfolio reconstruction in Workbench",
      "unversioned manage API proof",
    ],
  },
  {
    rfcId: "RFC-0037",
    auditScope: "rfc36-43",
    featureId: "dpm_operating_system",
    featureName: "DPM operating system command-center realization",
    owner: "lotus-manage",
    requiredEvidence: [
      "commandCenterSummary",
      "activeExceptions",
      "coreCandidateSourcePreview",
      "coreCandidateSourceInvalidRequestRejected",
      "portfolioMemory",
      "copilotWorkspace",
    ],
    uiPanels: ["dpm.command_center", "dpm.portfolio_memory", "dpm.copilot_workspace"],
    scenarioScope: "bounded Core DPM candidate-source preview and no-caller-portfolio guard",
    unsupportedClaimsExcluded: ["OMS execution", "order routing", "client communication workflow"],
  },
  {
    rfcId: "RFC-0038",
    auditScope: "rfc36-43",
    featureId: "mandate_digital_twin",
    featureName: "Mandate digital twin and health command center",
    owner: "lotus-manage",
    requiredEvidence: ["mandateLookup", "mandateHealth", "commandCenterSummary"],
    uiPanels: ["dpm.command_center"],
    unsupportedClaimsExcluded: ["external bank workflow ownership"],
  },
  {
    rfcId: "RFC-0039",
    auditScope: "rfc36-43",
    featureId: "construction_alternatives",
    featureName: "Construction alternatives product path",
    owner: "lotus-manage",
    requiredEvidence: ["constructionAlternativesPanel"],
    uiPanels: ["dpm.construction_alternatives"],
    unsupportedClaimsExcluded: ["optimizer execution in Workbench", "trade execution", "OMS routing"],
  },
  {
    rfcId: "RFC-0040",
    auditScope: "rfc36-43",
    featureId: "proof_pack_evidence",
    featureName: "Pre-trade proof pack and evidence fabric",
    owner: "lotus-manage",
    requiredEvidence: ["proofPackId", "proofPackSections", "proofPackSourceEvidence", "proofPackPanel"],
    uiPanels: ["dpm.proof_pack"],
    unsupportedClaimsExcluded: ["Workbench hash generation", "local proof-pack construction"],
  },
  {
    rfcId: "RFC-0041",
    auditScope: "rfc36-43",
    featureId: "rebalance_wave_explicit_portfolio_product_path",
    featureName: "Rebalance-wave command center for canonical explicit portfolio-list paths",
    owner: "lotus-manage",
    requiredEvidence: [
      "wavePreview",
      "multiPortfolioWavePreview",
      "waveId",
      "waveReportInput",
      "waveAiMemo",
      "wavePanel",
    ],
    uiPanels: ["dpm.wave_command_center"],
    scenarioScope: "single-portfolio and multi-portfolio explicit-list waves",
    scenarioExpansionNeeded: [
      "source-owner cohort products for broader campaign discovery scenarios",
    ],
    unsupportedClaimsExcluded: ["global portfolio-universe discovery", "external OMS execution"],
  },
  {
    rfcId: "RFC-0042",
    auditScope: "rfc36-43",
    featureId: "outcome_review_feedback_loop",
    featureName: "Post-trade outcome review and feedback loop",
    owner: "lotus-manage",
    requiredEvidence: ["outcomeReviewRows", "outcomeReviewPanel"],
    uiPanels: ["dpm.outcome_review"],
    unsupportedClaimsExcluded: ["settlement truth", "client communication execution"],
  },
  {
    rfcId: "RFC-0042",
    auditScope: "rfc36-43",
    featureId: "pm_operating_quality",
    featureName: "PM operating-quality governance evidence",
    owner: "lotus-manage",
    requiredEvidence: [
      "pmQualityScoreRun",
      "pmQualityFairnessAnalysis",
      "pmQualityReviewAction",
      "pmQualitySummaryInvocation",
      "pmQualityPanel",
    ],
    uiPanels: ["dpm.pm_operating_quality"],
    unsupportedClaimsExcluded: [
      "PM ranking",
      "HR decisions",
      "compensation decisions",
      "conduct decisions",
    ],
  },
  {
    rfcId: "RFC-0043",
    auditScope: "rfc36-43",
    featureId: "governed_ai_pm_copilot",
    featureName: "Governed AI PM copilot workflow-pack posture",
    owner: "lotus-ai",
    requiredEvidence: ["proofPackAiMemo", "waveAiMemo", "pmQualitySummaryInvocation", "copilotPanel"],
    uiPanels: ["dpm.copilot_workspace"],
    unsupportedClaimsExcluded: [
      "raw prompt storage",
      "generated summary retention in Workbench",
      "autonomous approval",
      "client contact",
    ],
  },
  {
    rfcId: "RFC-0024",
    auditScope: "adjacent-front-office",
    featureId: "advisor_proposal_memo_evidence_pack",
    featureName:
      "Gateway-backed proposal narrative and memo evidence posture as adjacent front-office proof",
    owner: "lotus-advise",
    requiredEvidence: [
      "proposalNarrative",
      "proposalNarrativePanel",
      "proposalMemoEvidencePack",
      "proposalMemoEvidencePackPanel",
    ],
    uiPanels: ["proposal.narrative_posture", "proposal.memo_evidence_pack"],
    unsupportedClaimsExcluded: [
      "client-ready release",
      "report archive publication by Workbench",
      "memo fact inference by Workbench",
      "approved-state inference by Workbench",
    ],
  },
];

function hasEvidence(evidence, key) {
  const value = evidence[key];
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  return Boolean(value);
}

function panelStateById(summary) {
  return new Map((summary.panelClassifications ?? []).map((panel) => [panel.panel, panel.state]));
}

export function buildRfc3643FeatureCoverage(summary, evidence) {
  const panels = panelStateById(summary);
  const rows = RFC_FEATURE_COVERAGE_ROWS.map((row) => {
    const missingEvidence = row.requiredEvidence.filter((key) => !hasEvidence(evidence, key));
    const panelStates = Object.fromEntries(
      row.uiPanels.map((panelId) => [panelId, panels.get(panelId) ?? "missing"])
    );
    const missingPanels = Object.entries(panelStates)
      .filter(([, state]) => state !== "ready")
      .map(([panelId]) => panelId);

    return {
      ...row,
      coverageStatus: missingEvidence.length === 0 && missingPanels.length === 0 ? "validated" : "gap",
      missingEvidence,
      panelStates,
      missingPanels,
    };
  });
  const rfc3643Rows = rows.filter((row) => row.auditScope === "rfc36-43");
  const adjacentEvidenceRows = rows.filter((row) => row.auditScope === "adjacent-front-office");

  return {
    contractId: "rfc36-43-front-office-feature-coverage",
    contractVersion: "1.0.0",
    portfolioId: summary.portfolioId,
    benchmarkCode: summary.benchmarkCode,
    coverageRows: rows,
    validatedFeatureCount: rows.filter((row) => row.coverageStatus === "validated").length,
    gapFeatureCount: rows.filter((row) => row.coverageStatus !== "validated").length,
    rfc3643FeatureCount: rfc3643Rows.length,
    validatedRfc3643FeatureCount: rfc3643Rows.filter((row) => row.coverageStatus === "validated")
      .length,
    rfc3643GapFeatureCount: rfc3643Rows.filter((row) => row.coverageStatus !== "validated").length,
    adjacentEvidenceFeatureCount: adjacentEvidenceRows.length,
    validatedAdjacentEvidenceFeatureCount: adjacentEvidenceRows.filter(
      (row) => row.coverageStatus === "validated"
    ).length,
    adjacentEvidenceGapFeatureCount: adjacentEvidenceRows.filter(
      (row) => row.coverageStatus !== "validated"
    ).length,
    scenarioExpansionNeeded: rows.flatMap((row) => row.scenarioExpansionNeeded ?? []),
  };
}

export function assertRfc3643FeatureCoverage(summary) {
  const coverage = summary.rfc3643FeatureCoverage;
  if (!coverage) {
    throw new Error("RFC36-43 feature coverage matrix was not recorded.");
  }

  const gaps = coverage.coverageRows.filter(
    (row) => row.auditScope === "rfc36-43" && row.coverageStatus !== "validated"
  );
  if (gaps.length > 0) {
    throw new Error(
      `RFC36-43 feature coverage gaps remain: ${gaps
        .map((row) => `${row.rfcId}/${row.featureId}`)
        .join(", ")}.`
    );
  }
}
