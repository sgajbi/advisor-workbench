import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_CANONICAL_CONTRACT = {
  contractId: "canonical-front-office-demo-data-contract",
  contractVersion: "1.0.0",
  governedByRfc: "RFC-0076",
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
  canonicalAsOfDate: "2026-04-10",
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
