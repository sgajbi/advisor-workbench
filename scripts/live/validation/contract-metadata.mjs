import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_CANONICAL_CONTRACT = {
  contractId: "canonical-front-office-demo-data-contract",
  contractVersion: "1.0.0",
  governedByRfc: "RFC-0076",
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
  canonicalAsOfDate: "2026-04-10",
  dpmCommandCenter: {
    portfolioManagerId: "PM_SG_DPM_001",
    bookId: "BOOK_SG_BALANCED_DPM",
    tenantId: "default",
    workbenchCallerTenantId: "tenant-sg",
    commandCenterAsOfDate: "2026-05-03",
    multiPortfolioWaveScenario: {
      scenarioId: "RFC41_MULTI_PORTFOLIO_EXPLICIT_LIST_CANONICAL",
      triggerType: "EXPLICIT_PORTFOLIO_LIST",
      sourceScope: "manage_live_validation_scenario_seed",
      minimumPortfolioCount: 3,
      portfolios: [
        {
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
          portfolio_manager_id: "PM_SG_DPM_001",
          portfolio_type: "DISCRETIONARY",
          source_refs: [
            {
              source_system: "lotus-platform",
              source_type: "CanonicalFrontOfficeDemoDataContract",
              source_id: "canonical-front-office-demo-data-contract",
              source_version: "1.0.0",
              supportability_state: "READY",
            },
          ],
        },
        {
          portfolio_id: "PB_SG_GLOBAL_INC_002",
          mandate_id: "MANDATE_PB_SG_GLOBAL_INC_002",
          portfolio_manager_id: "PM_SG_DPM_001",
          portfolio_type: "DISCRETIONARY",
          source_refs: [
            {
              source_system: "lotus-platform",
              source_type: "CanonicalFrontOfficeMultiPortfolioWaveScenario",
              source_id: "RFC41_MULTI_PORTFOLIO_EXPLICIT_LIST_CANONICAL",
              source_version: "1.0.0",
              supportability_state: "READY",
            },
          ],
        },
        {
          portfolio_id: "PB_SG_GLOBAL_GROWTH_003",
          mandate_id: "MANDATE_PB_SG_GLOBAL_GROWTH_003",
          portfolio_manager_id: "PM_SG_DPM_001",
          portfolio_type: "DISCRETIONARY",
          source_refs: [
            {
              source_system: "lotus-platform",
              source_type: "CanonicalFrontOfficeMultiPortfolioWaveScenario",
              source_id: "RFC41_MULTI_PORTFOLIO_EXPLICIT_LIST_CANONICAL",
              source_version: "1.0.0",
              supportability_state: "READY",
            },
          ],
        },
      ],
    },
  },
  advisoryProposalScenarios: {
    scenarioId: "RFC23_25_ADVISORY_PROPOSAL_POLICY_CANONICAL",
    sourceScope: "workbench_live_validation_scenario_seed",
    proposal: {
      title: "Canonical advisor narrative and policy proof",
      createdBy: "workbench-canonical-validator",
      jurisdiction: "SG",
      advisorNotes:
        "Workbench canonical validation proposal for RFC-0023, RFC-0024, and RFC-0025.",
      narrativeRequest: {
        audience: "ADVISOR_REVIEW",
        jurisdiction: "SG",
        client_audience: "ADVISOR_REVIEW",
        sections: ["EXECUTIVE_SUMMARY", "RISK_AND_CONCENTRATION"],
        requested_by: "workbench-canonical-validator",
      },
    },
    policyEvaluation: {
      scenarioId: "RFC25_SG_STRUCTURED_NOTE_PENDING_REVIEW",
      policyPackId: "SG_PRIVATE_BANKING_REFERENCE",
      policyVersion: "2026.05",
      createdBy: "advisor_1",
      expectedEvaluationStatus: "PENDING_REVIEW",
      expectedClientReadyPublication: "BLOCKED",
      expectedWorkbenchPanel: "advisory.suitability_review",
      evidenceBundle: {
        context_resolution: {
          advisory_policy_context: {
            household_id: "HH-PB-001",
            jurisdiction: "SG",
            client_classification: "ACCREDITED_INVESTOR",
            booking_center_code: "SG",
            account_id: "ACCT-PB-001",
            time_horizon: "5Y",
            liquidity_need: "MEDIUM",
            mandate_id: "MANDATE-BALANCED-001",
            objectives: ["capital_preservation", "balanced_growth"],
            restrictions: ["no_single_name_above_10pct"],
          },
        },
        inputs: {
          portfolio_snapshot: {
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            positions: [{ instrument_id: "US_EQ_ETF", quantity: "100" }],
            cash_balances: [{ currency: "USD", amount: "50000" }],
          },
          market_data_snapshot: {
            prices: [
              {
                instrument_id: "SG_STRUCTURED_NOTE",
                price: "100",
                currency: "USD",
              },
            ],
            fx_rates: [{ pair: "USD/SGD", rate: "1.35" }],
          },
          shelf_entries: [
            {
              instrument_id: "SG_STRUCTURED_NOTE",
              eligibility: { jurisdictions: ["SG"] },
              target_market: { client_segments: ["ACCREDITED_INVESTOR"] },
              complexity: "COMPLEX",
              private_asset: false,
              structured_product: true,
            },
          ],
          proposed_trades: [
            { instrument_id: "SG_STRUCTURED_NOTE", side: "BUY" },
          ],
        },
        risk_lens: {
          source_service: "lotus-risk",
          single_position_concentration: {
            top_position_weight_current: "0.10",
          },
          issuer_concentration: { hhi_current: "1200" },
          drawdown: { max_drawdown_1y: "0.08" },
          var: { var_95_1m: "0.04" },
          stress: { equity_down_20: "-0.09" },
          liquidity_risk: { days_to_liquidate: "3" },
          private_asset_risk: { private_asset_weight: "0.00" },
          climate_geopolitical_risk: { status: "not_material" },
        },
        artifact: {
          assumptions_and_limits: {
            costs_and_fees: { included: true },
            tax: { included: true },
            execution: { included: true },
          },
          disclosures: {
            product_docs: [
              { instrument_id: "SG_STRUCTURED_NOTE", doc_ref: "Term sheet" },
            ],
          },
        },
        conflict_evidence: {
          material_conflict: false,
          review_ref: "conflict-review-001",
        },
      },
    },
    advisorCockpit: {
      scenarioId: "RFC26_ADVISOR_COCKPIT_POLICY_ACTION_CANONICAL",
      advisorId: "advisor_sg_001",
      role: "ADVISOR",
      expectedWorkbenchPanel: "advisory.advisor_cockpit",
      expectedActionFamily: "POLICY_REVIEW_REQUIRED",
      expectedActionFamilies: [
        "POLICY_REVIEW_REQUIRED",
        "HOUSE_VIEW_IMPACT_REVIEW",
      ],
      expectedAcknowledgementMarker: "ADVISOR_COCKPIT_ACTION_ACKNOWLEDGED",
      expectedSupportabilityPosture:
        "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
      expectedWorkbenchPosture: "CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026",
      expectedClientReadyPublication: "BLOCKED",
      expectedMinPreparationPackets: 1,
      seedHouseViewCohort: true,
      unsupportedCapabilityBoundaries: [
        "CLIENT_READY_PUBLICATION",
        "EXTERNAL_CLIENT_COMMUNICATION",
        "OMS_ORDER_LIFECYCLE",
      ],
    },
    advisoryCopilot: {
      scenarioId: "RFC27_ADVISORY_COPILOT_CANONICAL",
      expectedWorkbenchPanel: "advisory.advisory_copilot",
      expectedSupportStatus:
        "ADVISE_COPILOT_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
      expectedClientReadyPublication: "BLOCKED",
      expectedReviewPosture: "REVIEW_REQUIRED",
      expectedReviewedPosture: "APPROVED_FOR_INTERNAL_USE",
      expectedGuardrailPosture: "GUARDRAIL_REJECTED",
      expectedGuardrailReason: "CLIENT_READY_PUBLICATION_FORBIDDEN",
      actionFamilies: [
        "PROPOSAL_EXPLANATION",
        "EVIDENCE_QA",
        "MEETING_PREPARATION",
        "COMPLIANCE_REVIEW_SUMMARY",
        "OPERATIONS_REPORT_HANDOFF",
        "CLIENT_FOLLOW_UP_DRAFT",
      ],
      unsupportedCapabilityBoundaries: [
        "CLIENT_READY_PUBLICATION",
        "POLICY_APPROVAL_OR_SIGN_OFF",
        "OMS_ORDER_LIFECYCLE",
        "CLIENT_COMMUNICATION_DELIVERY",
      ],
    },
    bankDemoProof: {
      scenarioId: "RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL",
      expectedWorkbenchPanel: "advisory.bank_demo_proof",
      expectedGatewayRoutes: [
        "/api/v1/advisory/bank-demo-proof/scenario-contract",
        "/api/v1/advisory/bank-demo-proof/supported-claim-register",
        "/api/v1/advisory/bank-demo-proof/proof-packs",
      ],
      expectedProofMarker: "BANK_DEMO_PROOF_PACK_CREATED",
      expectedClientReadyPublication: "BLOCKED",
      expectedClaimPostures: {
        backend_proof_capture_repeatable: "IMPLEMENTATION_BACKED",
        advisor_journey_backend_evidence_available: "IMPLEMENTATION_BACKED",
        advisor_use_document_proof_available: "IMPLEMENTATION_BACKED",
        client_ready_publication_blocked: "UNSUPPORTED",
      },
      unsupportedCapabilityBoundaries: [
        "CLIENT_READY_PUBLICATION",
        "EXTERNAL_CLIENT_COMMUNICATION",
        "OMS_ORDER_LIFECYCLE",
        "ORDER_FILL_SETTLEMENT_SYSTEM_OF_RECORD",
      ],
    },
  },
};

export const DEFAULT_PANEL_REGISTRY = {
  contractId: "workbench-panel-registry",
  contractVersion: "1.0.0",
  governedByRfc: "RFC-0077",
  canonicalDataContract: "canonical-front-office-demo-data-contract",
  sourcePath: "deterministic-fallback",
  panels: [
    {
      panelId: "advisor.book_overview",
      owningService: "lotus-gateway",
      gatewayEndpoint: "/api/v1/advisor-book/portfolios",
      requiredSupportState: "partial",
      route: "/book?asOfDate={canonicalAsOfDate}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "permission_blocked",
        "unavailable",
        "error",
      ],
      screenshotName: "advisor-book-overview-live.png",
      knownLimitations: [
        "own-book scope only; delegated, team, and supervisor scope are not supported",
        "tenant scope and legacy assignment limitations remain visible when reported by Gateway",
      ],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "portfolio.summary",
      owningService: "lotus-gateway",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/overview",
      requiredSupportState: "ready",
      route: "/portfolio?portfolioId={portfolio_id}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "portfolio-summary-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "portfolio.detailed",
      owningService: "lotus-gateway",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/overview",
      requiredSupportState: "ready",
      route: "/portfolio?portfolioId={portfolio_id}&tab=detailed",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "portfolio-detailed-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "reporting.report_centre",
      owningService: "lotus-report",
      gatewayEndpoint: "/api/v1/report-ordering/options",
      requiredSupportState: "partial",
      route: "/reports?portfolioId={portfolio_id}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "permission_blocked",
        "unavailable",
        "error",
      ],
      screenshotName: "reporting-report-centre-live.png",
      knownLimitations: [
        "structured report data is available while governed PDF creation remains independently source-owned",
        "report-data completion does not claim archive, advisor approval, client delivery, or communication",
      ],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.summary",
      owningService: "lotus-performance",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/performance/summary",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolio_id}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-summary-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.analysis.contribution",
      owningService: "lotus-performance",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/performance/details",
      requiredSupportState: "ready",
      route:
        "/performance?portfolioId={portfolio_id}&mode=analysis&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-analysis-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.analysis.attribution",
      owningService: "lotus-performance",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/performance/details",
      requiredSupportState: "partial",
      route:
        "/performance?portfolioId={portfolio_id}&mode=analysis&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-analysis-live.png",
      knownLimitations: [
        "benchmark-relative attribution may remain partial until full source-backed detail is available",
      ],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.advisor_brief",
      owningService: "lotus-performance",
      gatewayEndpoint:
        "/api/v1/workbench/{portfolio_id}/performance/advisor-brief",
      requiredSupportState: "ready",
      route:
        "/performance?portfolioId={portfolio_id}&mode=advisor&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-advisor-brief-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "proposal.narrative_posture",
      owningService: "lotus-advise",
      gatewayEndpoint: "/api/v1/proposals/{proposal_id}/delivery-summary",
      requiredSupportState: "ready",
      route: "/proposals/{proposalId}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "proposal-narrative-posture-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "proposal.memo_evidence_pack",
      owningService: "lotus-advise",
      gatewayEndpoint:
        "/api/v1/proposals/{proposal_id}/versions/{version_no}/memo",
      requiredSupportState: "ready",
      route: "/proposals/{proposalId}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "proposal-memo-evidence-pack-live.png",
      knownLimitations: [
        "Workbench validates advisor-use memo evidence only; client-ready release and document rendering remain outside this surface",
      ],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "advisory.advisor_cockpit",
      owningService: "lotus-advise",
      gatewayEndpoint: "/api/v1/advisor-cockpit/actions",
      requiredSupportState: "ready",
      route: "/recommendations?portfolioId={portfolio_id}&mode=cockpit",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "advisory-advisor-cockpit-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "advisory.advisory_copilot",
      owningService: "lotus-advise",
      gatewayEndpoint: "/api/v1/advisory-copilot/actions",
      requiredSupportState: "ready",
      route: "/recommendations?portfolioId={portfolio_id}&mode=copilot",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "advisory-advisory-copilot-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "advisory.bank_demo_proof",
      owningService: "lotus-advise",
      gatewayEndpoint: "/api/v1/advisory/bank-demo-proof/supported-claim-register",
      requiredSupportState: "ready",
      route: "/recommendations?portfolioId={portfolio_id}&mode=proof",
      allowedStates: [
        "ready",
        "loading",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "advisory-bank-demo-proof-live.png",
      knownLimitations: [
        "Workbench renders source-owned RFC-0028 proof posture only; proof-pack capture and client-ready publication controls remain owned by lotus-advise and downstream evidence workflows",
      ],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.snapshot",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/summary",
      requiredSupportState: "ready",
      route:
        "/performance?portfolioId={portfolio_id}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.drawdown",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/drawdown",
      requiredSupportState: "ready",
      route:
        "/performance?portfolioId={portfolio_id}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.concentration",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/concentration",
      requiredSupportState: "ready",
      route:
        "/performance?portfolioId={portfolio_id}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.rolling",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/rolling",
      requiredSupportState: "ready",
      route:
        "/performance?portfolioId={portfolio_id}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.historical_attribution",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/attribution",
      requiredSupportState: "ready",
      route:
        "/performance?portfolioId={portfolio_id}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.evidence",
      owningService: "lotus-gateway",
      gatewayEndpoint: null,
      requiredSupportState: "partial",
      route:
        "/performance?portfolioId={portfolio_id}&mode=evidence&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "performance-evidence-live.png",
      knownLimitations: [
        "full evidence and lineage support is deferred pending RFC-0079",
      ],
      ownerFollowUpRfc: "RFC-0079",
    },
    {
      panelId: "dpm.outcome_review",
      owningService: "lotus-manage",
      gatewayEndpoint: "/api/v1/dpm/command-center/outcome-reviews",
      requiredSupportState: "ready",
      route: "/workbench/{portfolio_id}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "dpm-outcome-review-live.png",
      knownLimitations: [
        "embedded /workbench/{portfolio_id} panel is implemented before the dedicated /dpm/outcomes workspace",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.wave_command_center",
      owningService: "lotus-manage",
      gatewayEndpoint: "/api/v1/dpm/command-center/waves",
      requiredSupportState: "ready",
      route: "/workbench/{portfolio_id}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "dpm-wave-command-center-live.png",
      knownLimitations: [
        "embedded /workbench/{portfolio_id} panel is implemented before the dedicated /dpm/waves workspace",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.portfolio_memory",
      owningService: "lotus-manage",
      gatewayEndpoint:
        "/api/v1/dpm/command-center/portfolios/{portfolio_id}/memory",
      requiredSupportState: "ready",
      route: "/workbench/{portfolio_id}",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "dpm-portfolio-memory-live.png",
      knownLimitations: [
        "embedded /workbench/{portfolio_id} timeline is implemented before event filters and detail drawers",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.construction_alternatives",
      owningService: "lotus-manage",
      gatewayEndpoint:
        "/api/v1/dpm/command-center/construction/alternative-sets/generate",
      requiredSupportState: "ready",
      route: "/workbench/{portfolio_id}?mode=construction",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "dpm-construction-alternatives-live.png",
      knownLimitations: [
        "Workbench renders Gateway/manage construction truth only; it does not calculate alternatives, route orders, execute trades, or claim OMS execution",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.pm_operating_quality",
      owningService: "lotus-manage",
      gatewayEndpoint:
        "/api/v1/dpm/command-center/pm-operating-quality/score-runs",
      requiredSupportState: "ready",
      route: "/workbench/{portfolio_id}?mode=quality",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "dpm-pm-operating-quality-live.png",
      knownLimitations: [
        "Workbench renders Gateway/manage PM operating-quality truth only; it does not rank PMs, generate summary text, make HR decisions, contact clients, or execute trades",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.copilot_workspace",
      owningService: "lotus-ai",
      gatewayEndpoint: null,
      requiredSupportState: "ready",
      route: "/workbench/{portfolio_id}?mode=copilot",
      allowedStates: [
        "ready",
        "loading",
        "empty",
        "partial",
        "unavailable",
        "error",
      ],
      screenshotName: "dpm-copilot-workspace-live.png",
      knownLimitations: [
        "Workbench renders Gateway/lotus-ai workflow-pack posture only; it does not store prompts, store generated responses, contact clients, route orders, or claim OMS execution",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
  ],
};

export async function loadCanonicalContractMetadata(cwd = process.cwd()) {
  const candidatePaths = [
    process.env.LOTUS_PLATFORM_REPO
      ? path.resolve(
          process.env.LOTUS_PLATFORM_REPO,
          "context",
          "contracts",
          "canonical-front-office-demo-data-contract.json",
        )
      : null,
    path.resolve(
      cwd,
      "..",
      "lotus-platform",
      "context",
      "contracts",
      "canonical-front-office-demo-data-contract.json",
    ),
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    try {
      const raw = await fs.readFile(candidatePath, "utf8");
      const payload = JSON.parse(raw);
      return {
        contractId:
          payload.contract_id ?? DEFAULT_CANONICAL_CONTRACT.contractId,
        contractVersion:
          payload.contract_version ??
          DEFAULT_CANONICAL_CONTRACT.contractVersion,
        governedByRfc:
          payload.governed_by_rfc ?? DEFAULT_CANONICAL_CONTRACT.governedByRfc,
        portfolioId:
          payload.portfolio?.portfolio_id ??
          DEFAULT_CANONICAL_CONTRACT.portfolioId,
        benchmarkCode:
          payload.benchmark?.benchmark_id ??
          DEFAULT_CANONICAL_CONTRACT.benchmarkCode,
        canonicalAsOfDate:
          payload.date_policy?.canonical_as_of_date ??
          DEFAULT_CANONICAL_CONTRACT.canonicalAsOfDate,
        dpmCommandCenter: {
          portfolioManagerId:
            payload.dpm_command_center?.portfolio_manager_id ??
            DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.portfolioManagerId,
          bookId:
            payload.dpm_command_center?.book_id ??
            DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.bookId,
          tenantId:
            payload.dpm_command_center?.tenant_id ??
            DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.tenantId,
          workbenchCallerTenantId:
            payload.dpm_command_center?.workbench_caller_tenant_id ??
            DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.workbenchCallerTenantId,
          commandCenterAsOfDate:
            payload.dpm_command_center?.command_center_as_of_date ??
            DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.commandCenterAsOfDate,
          multiPortfolioWaveScenario: normalizeMultiPortfolioWaveScenario(
            payload.dpm_command_center?.multi_portfolio_wave_scenario,
          ),
        },
        advisoryProposalScenarios: normalizeAdvisoryProposalScenarios(
          payload.advisory_proposal_scenarios,
        ),
        sourcePath: candidatePath,
      };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw new Error(
        `Unable to load governed canonical contract metadata from ${candidatePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return {
    ...DEFAULT_CANONICAL_CONTRACT,
    sourcePath: "deterministic-fallback",
  };
}

function normalizeMultiPortfolioWaveScenario(rawScenario) {
  const fallback =
    DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.multiPortfolioWaveScenario;
  if (!rawScenario || typeof rawScenario !== "object") {
    return fallback;
  }

  return {
    scenarioId: rawScenario.scenario_id ?? fallback.scenarioId,
    triggerType: rawScenario.trigger_type ?? fallback.triggerType,
    sourceScope: rawScenario.source_scope ?? fallback.sourceScope,
    minimumPortfolioCount:
      Number(
        rawScenario.minimum_portfolio_count ?? fallback.minimumPortfolioCount,
      ) || fallback.minimumPortfolioCount,
    portfolios: Array.isArray(rawScenario.portfolios)
      ? rawScenario.portfolios
      : fallback.portfolios,
  };
}

function normalizeAdvisoryProposalScenarios(rawScenario) {
  const fallback = DEFAULT_CANONICAL_CONTRACT.advisoryProposalScenarios;
  if (!rawScenario || typeof rawScenario !== "object") {
    return fallback;
  }
  const rawProposal =
    rawScenario.proposal && typeof rawScenario.proposal === "object"
      ? rawScenario.proposal
      : {};
  const rawPolicy =
    rawScenario.policy_evaluation &&
    typeof rawScenario.policy_evaluation === "object"
      ? rawScenario.policy_evaluation
      : {};
  return {
    scenarioId: rawScenario.scenario_id ?? fallback.scenarioId,
    sourceScope: rawScenario.source_scope ?? fallback.sourceScope,
    proposal: {
      title: rawProposal.title ?? fallback.proposal.title,
      createdBy: rawProposal.created_by ?? fallback.proposal.createdBy,
      jurisdiction: rawProposal.jurisdiction ?? fallback.proposal.jurisdiction,
      advisorNotes: rawProposal.advisor_notes ?? fallback.proposal.advisorNotes,
      narrativeRequest:
        rawProposal.narrative_request ?? fallback.proposal.narrativeRequest,
    },
    policyEvaluation: {
      scenarioId: rawPolicy.scenario_id ?? fallback.policyEvaluation.scenarioId,
      policyPackId:
        rawPolicy.policy_pack_id ?? fallback.policyEvaluation.policyPackId,
      policyVersion:
        rawPolicy.policy_version ?? fallback.policyEvaluation.policyVersion,
      createdBy: rawPolicy.created_by ?? fallback.policyEvaluation.createdBy,
      expectedEvaluationStatus:
        rawPolicy.expected_evaluation_status ??
        fallback.policyEvaluation.expectedEvaluationStatus,
      expectedClientReadyPublication:
        rawPolicy.expected_client_ready_publication ??
        fallback.policyEvaluation.expectedClientReadyPublication,
      expectedWorkbenchPanel:
        rawPolicy.expected_workbench_panel ??
        fallback.policyEvaluation.expectedWorkbenchPanel,
      evidenceBundle:
        rawPolicy.evidence_bundle ?? fallback.policyEvaluation.evidenceBundle,
    },
    advisorCockpit: normalizeAdvisorCockpitScenario(
      rawScenario.advisor_cockpit,
    ),
    advisoryCopilot: normalizeAdvisoryCopilotScenario(
      rawScenario.advisory_copilot,
    ),
    bankDemoProof: normalizeBankDemoProofScenario(rawScenario.bank_demo_proof),
  };
}

function normalizeAdvisorCockpitScenario(rawScenario) {
  const fallback =
    DEFAULT_CANONICAL_CONTRACT.advisoryProposalScenarios.advisorCockpit;
  if (!rawScenario || typeof rawScenario !== "object") {
    return fallback;
  }
  return {
    scenarioId: rawScenario.scenario_id ?? fallback.scenarioId,
    advisorId: rawScenario.advisor_id ?? fallback.advisorId,
    role: rawScenario.role ?? fallback.role,
    expectedWorkbenchPanel:
      rawScenario.expected_workbench_panel ?? fallback.expectedWorkbenchPanel,
    expectedActionFamily:
      rawScenario.expected_action_family ?? fallback.expectedActionFamily,
    expectedActionFamilies: Array.isArray(rawScenario.expected_action_families)
      ? rawScenario.expected_action_families
      : fallback.expectedActionFamilies,
    expectedAcknowledgementMarker:
      rawScenario.expected_acknowledgement_marker ??
      fallback.expectedAcknowledgementMarker,
    expectedSupportabilityPosture:
      rawScenario.expected_supportability_posture ??
      fallback.expectedSupportabilityPosture,
    expectedWorkbenchPosture:
      rawScenario.expected_workbench_posture ?? fallback.expectedWorkbenchPosture,
    expectedClientReadyPublication:
      rawScenario.expected_client_ready_publication ??
      fallback.expectedClientReadyPublication,
    expectedMinPreparationPackets:
      rawScenario.expected_min_preparation_packets ??
      fallback.expectedMinPreparationPackets,
    seedHouseViewCohort:
      rawScenario.seed_house_view_cohort ?? fallback.seedHouseViewCohort,
    houseViewCohort:
      rawScenario.house_view_cohort ?? fallback.houseViewCohort,
    unsupportedCapabilityBoundaries: Array.isArray(
      rawScenario.unsupported_capability_boundaries,
    )
      ? rawScenario.unsupported_capability_boundaries
      : fallback.unsupportedCapabilityBoundaries,
  };
}

function normalizeAdvisoryCopilotScenario(rawScenario) {
  const fallback =
    DEFAULT_CANONICAL_CONTRACT.advisoryProposalScenarios.advisoryCopilot;
  if (!rawScenario || typeof rawScenario !== "object") {
    return fallback;
  }
  return {
    scenarioId: rawScenario.scenario_id ?? fallback.scenarioId,
    expectedWorkbenchPanel:
      rawScenario.expected_workbench_panel ?? fallback.expectedWorkbenchPanel,
    expectedSupportStatus:
      rawScenario.expected_support_status ?? fallback.expectedSupportStatus,
    expectedClientReadyPublication:
      rawScenario.expected_client_ready_publication ??
      fallback.expectedClientReadyPublication,
    expectedReviewPosture:
      rawScenario.expected_review_posture ?? fallback.expectedReviewPosture,
    expectedReviewedPosture:
      rawScenario.expected_reviewed_posture ?? fallback.expectedReviewedPosture,
    expectedGuardrailPosture:
      rawScenario.expected_guardrail_posture ?? fallback.expectedGuardrailPosture,
    expectedGuardrailReason:
      rawScenario.expected_guardrail_reason ?? fallback.expectedGuardrailReason,
    actionFamilies: Array.isArray(rawScenario.action_families)
      ? rawScenario.action_families
      : fallback.actionFamilies,
    unsupportedCapabilityBoundaries: Array.isArray(
      rawScenario.unsupported_capability_boundaries,
    )
      ? rawScenario.unsupported_capability_boundaries
      : fallback.unsupportedCapabilityBoundaries,
  };
}

function normalizeBankDemoProofScenario(rawScenario) {
  const fallback =
    DEFAULT_CANONICAL_CONTRACT.advisoryProposalScenarios.bankDemoProof;
  if (!rawScenario || typeof rawScenario !== "object") {
    return fallback;
  }
  return {
    scenarioId: rawScenario.scenario_id ?? fallback.scenarioId,
    expectedWorkbenchPanel:
      rawScenario.expected_workbench_panel ?? fallback.expectedWorkbenchPanel,
    expectedGatewayRoutes: Array.isArray(rawScenario.expected_gateway_routes)
      ? rawScenario.expected_gateway_routes
      : fallback.expectedGatewayRoutes,
    expectedProofMarker:
      rawScenario.expected_proof_marker ?? fallback.expectedProofMarker,
    expectedClientReadyPublication:
      rawScenario.expected_client_ready_publication ??
      fallback.expectedClientReadyPublication,
    expectedClaimPostures:
      rawScenario.expected_claim_postures ?? fallback.expectedClaimPostures,
    unsupportedCapabilityBoundaries: Array.isArray(
      rawScenario.unsupported_capability_boundaries,
    )
      ? rawScenario.unsupported_capability_boundaries
      : fallback.unsupportedCapabilityBoundaries,
  };
}

export async function loadWorkbenchPanelRegistryMetadata(cwd = process.cwd()) {
  const candidatePaths = [
    process.env.LOTUS_PLATFORM_REPO
      ? path.resolve(
          process.env.LOTUS_PLATFORM_REPO,
          "context",
          "contracts",
          "workbench-panel-registry.json",
        )
      : null,
    path.resolve(
      cwd,
      "..",
      "lotus-platform",
      "context",
      "contracts",
      "workbench-panel-registry.json",
    ),
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    try {
      const raw = await fs.readFile(candidatePath, "utf8");
      const payload = JSON.parse(raw);
      return {
        contractId: payload.contract_id ?? DEFAULT_PANEL_REGISTRY.contractId,
        contractVersion:
          payload.contract_version ?? DEFAULT_PANEL_REGISTRY.contractVersion,
        governedByRfc:
          payload.governed_by_rfc ?? DEFAULT_PANEL_REGISTRY.governedByRfc,
        canonicalDataContract:
          payload.canonical_data_contract ??
          DEFAULT_PANEL_REGISTRY.canonicalDataContract,
        sourcePath: candidatePath,
        panels: (payload.panels ?? []).map((panel) => ({
          panelId: panel.panel_id,
          owningService: panel.owning_service,
          gatewayEndpoint: panel.gateway_endpoint,
          requiredSupportState: panel.required_support_state,
          route: panel.route,
          allowedStates: panel.allowed_states ?? [],
          screenshotName: panel.screenshot_policy?.screenshot_name ?? null,
          knownLimitations: panel.known_limitations ?? [],
          ownerFollowUpRfc: panel.owner_follow_up_rfc ?? null,
        })),
      };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw new Error(
        `Unable to load governed panel registry metadata from ${candidatePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return DEFAULT_PANEL_REGISTRY;
}
