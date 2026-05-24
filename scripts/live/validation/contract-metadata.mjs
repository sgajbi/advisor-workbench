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
};

export const DEFAULT_PANEL_REGISTRY = {
  contractId: "workbench-panel-registry",
  contractVersion: "1.0.0",
  governedByRfc: "RFC-0077",
  canonicalDataContract: "canonical-front-office-demo-data-contract",
  sourcePath: "deterministic-fallback",
  panels: [
    {
      panelId: "portfolio.summary",
      owningService: "lotus-gateway",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/overview",
      requiredSupportState: "ready",
      route: "/portfolio?portfolioId={portfolioId}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "portfolio-summary-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "portfolio.detailed",
      owningService: "lotus-gateway",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/overview",
      requiredSupportState: "ready",
      route: "/portfolio?portfolioId={portfolioId}&tab=detailed",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "portfolio-detailed-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.summary",
      owningService: "lotus-performance",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/performance/summary",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-summary-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.analysis.contribution",
      owningService: "lotus-performance",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/performance/details",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}&mode=analysis&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-analysis-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.analysis.attribution",
      owningService: "lotus-performance",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/performance/details",
      requiredSupportState: "partial",
      route: "/performance?portfolioId={portfolioId}&mode=analysis&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-analysis-live.png",
      knownLimitations: [
        "benchmark-relative attribution may remain partial until full source-backed detail is available",
      ],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.advisor_brief",
      owningService: "lotus-performance",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/performance/advisor-brief",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}&mode=advisor&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
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
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "proposal-narrative-posture-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.snapshot",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/summary",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.drawdown",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/drawdown",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.concentration",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/concentration",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.rolling",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/rolling",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.risk.historical_attribution",
      owningService: "lotus-risk",
      gatewayEndpoint: "/api/v1/workbench/{portfolio_id}/risk/attribution",
      requiredSupportState: "ready",
      route: "/performance?portfolioId={portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-risk-live.png",
      knownLimitations: [],
      ownerFollowUpRfc: null,
    },
    {
      panelId: "performance.evidence",
      owningService: "lotus-gateway",
      gatewayEndpoint: null,
      requiredSupportState: "partial",
      route: "/performance?portfolioId={portfolioId}&mode=evidence&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-evidence-live.png",
      knownLimitations: ["full evidence and lineage support is deferred pending RFC-0079"],
      ownerFollowUpRfc: "RFC-0079",
    },
    {
      panelId: "dpm.outcome_review",
      owningService: "lotus-manage",
      gatewayEndpoint: "/api/v1/dpm/command-center/outcome-reviews",
      requiredSupportState: "ready",
      route: "/workbench/{portfolioId}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "dpm-outcome-review-live.png",
      knownLimitations: [
        "embedded /workbench/{portfolioId} panel is implemented before the dedicated /dpm/outcomes workspace",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.wave_command_center",
      owningService: "lotus-manage",
      gatewayEndpoint: "/api/v1/dpm/command-center/waves",
      requiredSupportState: "ready",
      route: "/workbench/{portfolioId}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "dpm-wave-command-center-live.png",
      knownLimitations: [
        "embedded /workbench/{portfolioId} panel is implemented before the dedicated /dpm/waves workspace",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.portfolio_memory",
      owningService: "lotus-manage",
      gatewayEndpoint: "/api/v1/dpm/command-center/portfolios/{portfolio_id}/memory",
      requiredSupportState: "ready",
      route: "/workbench/{portfolioId}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "dpm-portfolio-memory-live.png",
      knownLimitations: [
        "embedded /workbench/{portfolioId} timeline is implemented before event filters and detail drawers",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.construction_alternatives",
      owningService: "lotus-manage",
      gatewayEndpoint: "/api/v1/dpm/command-center/construction/alternative-sets/generate",
      requiredSupportState: "ready",
      route: "/workbench/{portfolioId}?mode=construction",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "dpm-construction-alternatives-live.png",
      knownLimitations: [
        "Workbench renders Gateway/manage construction truth only; it does not calculate alternatives, route orders, execute trades, or claim OMS execution",
      ],
      ownerFollowUpRfc: "RFC-0098",
    },
    {
      panelId: "dpm.pm_operating_quality",
      owningService: "lotus-manage",
      gatewayEndpoint: "/api/v1/dpm/command-center/pm-operating-quality/score-runs",
      requiredSupportState: "ready",
      route: "/workbench/{portfolioId}?mode=quality",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
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
      route: "/workbench/{portfolioId}?mode=copilot",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
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
          "canonical-front-office-demo-data-contract.json"
        )
      : null,
    path.resolve(
      cwd,
      "..",
      "lotus-platform",
      "context",
      "contracts",
      "canonical-front-office-demo-data-contract.json"
    ),
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    try {
      const raw = await fs.readFile(candidatePath, "utf8");
      const payload = JSON.parse(raw);
      return {
        contractId: payload.contract_id ?? DEFAULT_CANONICAL_CONTRACT.contractId,
        contractVersion: payload.contract_version ?? DEFAULT_CANONICAL_CONTRACT.contractVersion,
        governedByRfc: payload.governed_by_rfc ?? DEFAULT_CANONICAL_CONTRACT.governedByRfc,
        portfolioId: payload.portfolio?.portfolio_id ?? DEFAULT_CANONICAL_CONTRACT.portfolioId,
        benchmarkCode:
          payload.benchmark?.benchmark_id ?? DEFAULT_CANONICAL_CONTRACT.benchmarkCode,
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
          commandCenterAsOfDate:
            payload.dpm_command_center?.command_center_as_of_date ??
            DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.commandCenterAsOfDate,
          multiPortfolioWaveScenario: normalizeMultiPortfolioWaveScenario(
            payload.dpm_command_center?.multi_portfolio_wave_scenario
          ),
        },
        sourcePath: candidatePath,
      };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw new Error(
        `Unable to load governed canonical contract metadata from ${candidatePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return {
    ...DEFAULT_CANONICAL_CONTRACT,
    sourcePath: "deterministic-fallback",
  };
}

function normalizeMultiPortfolioWaveScenario(rawScenario) {
  const fallback = DEFAULT_CANONICAL_CONTRACT.dpmCommandCenter.multiPortfolioWaveScenario;
  if (!rawScenario || typeof rawScenario !== "object") {
    return fallback;
  }

  return {
    scenarioId: rawScenario.scenario_id ?? fallback.scenarioId,
    triggerType: rawScenario.trigger_type ?? fallback.triggerType,
    sourceScope: rawScenario.source_scope ?? fallback.sourceScope,
    minimumPortfolioCount:
      Number(rawScenario.minimum_portfolio_count ?? fallback.minimumPortfolioCount) ||
      fallback.minimumPortfolioCount,
    portfolios: Array.isArray(rawScenario.portfolios) ? rawScenario.portfolios : fallback.portfolios,
  };
}

export async function loadWorkbenchPanelRegistryMetadata(cwd = process.cwd()) {
  const candidatePaths = [
    process.env.LOTUS_PLATFORM_REPO
      ? path.resolve(
          process.env.LOTUS_PLATFORM_REPO,
          "context",
          "contracts",
          "workbench-panel-registry.json"
        )
      : null,
    path.resolve(
      cwd,
      "..",
      "lotus-platform",
      "context",
      "contracts",
      "workbench-panel-registry.json"
    ),
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    try {
      const raw = await fs.readFile(candidatePath, "utf8");
      const payload = JSON.parse(raw);
      return {
        contractId: payload.contract_id ?? DEFAULT_PANEL_REGISTRY.contractId,
        contractVersion: payload.contract_version ?? DEFAULT_PANEL_REGISTRY.contractVersion,
        governedByRfc: payload.governed_by_rfc ?? DEFAULT_PANEL_REGISTRY.governedByRfc,
        canonicalDataContract:
          payload.canonical_data_contract ?? DEFAULT_PANEL_REGISTRY.canonicalDataContract,
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
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw new Error(
        `Unable to load governed panel registry metadata from ${candidatePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return DEFAULT_PANEL_REGISTRY;
}
