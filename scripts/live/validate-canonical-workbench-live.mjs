import dns from "node:dns/promises";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium, expect } from "@playwright/test";

const DEFAULT_CANONICAL_CONTRACT = {
  contractId: "canonical-front-office-demo-data-contract",
  contractVersion: "1.0.0",
  governedByRfc: "RFC-0076",
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
  canonicalAsOfDate: "2026-04-10",
};

const DEFAULT_PANEL_REGISTRY = {
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
      requiredSupportState: "unavailable",
      route: "/performance?portfolioId={portfolioId}&mode=evidence&period=YTD&detailBasis=NET&benchmark={benchmarkCode}",
      allowedStates: ["ready", "loading", "empty", "partial", "unavailable", "error"],
      screenshotName: "performance-evidence-live.png",
      knownLimitations: ["full evidence and lineage support is deferred pending RFC-0079"],
      ownerFollowUpRfc: "RFC-0079",
    },
  ],
};

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const portfolioId = args.get("portfolio-id") ?? "PB_SG_GLOBAL_BAL_001";
const benchmarkCode = args.get("benchmark-code") ?? "BMK_PB_GLOBAL_BALANCED_60_40";
const workbenchBaseUrl = (args.get("workbench-base-url") ?? "http://workbench.dev.lotus").replace(/\/+$/, "");
const gatewayBaseUrl = (args.get("gateway-base-url") ?? "http://gateway.dev.lotus").replace(/\/+$/, "");
const outputDir = path.resolve(
  process.cwd(),
  args.get("output-dir") ?? "output/playwright/live-canonical"
);
const summaryPath = path.join(outputDir, "live-validation-summary.json");
const shotIndexPath = path.join(outputDir, "SHOT-INDEX.md");
const timeoutMs = Number(args.get("timeout-ms") ?? "60000");
const canonicalAsOfDate = args.get("as-of-date") ?? "2026-04-10";
const canonicalContract = await loadCanonicalContractMetadata();
const panelRegistry = await loadWorkbenchPanelRegistryMetadata();
const panelRegistryById = new Map(panelRegistry.panels.map((panel) => [panel.panelId, panel]));

const summary = {
  generatedAt: new Date().toISOString(),
  portfolioId,
  benchmarkCode,
  canonicalContract,
  panelRegistry: {
    contractId: panelRegistry.contractId,
    contractVersion: panelRegistry.contractVersion,
    governedByRfc: panelRegistry.governedByRfc,
    canonicalDataContract: panelRegistry.canonicalDataContract,
    sourcePath: panelRegistry.sourcePath,
  },
  workbenchBaseUrl,
  gatewayBaseUrl,
  dns: [],
  apiChecks: [],
  uiChecks: [],
  calculationChecks: [],
  panelClassifications: [],
  supportabilityChecks: [],
  screenshots: [],
};

async function loadCanonicalContractMetadata() {
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
      process.cwd(),
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

async function loadWorkbenchPanelRegistryMetadata() {
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
      process.cwd(),
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

async function ensureDirectory(target) {
  await fs.mkdir(target, { recursive: true });
}

async function checkDns(hostname, required = true) {
  try {
    const resolution = await dns.lookup(hostname);
    const result = { hostname, ok: true, address: resolution.address, required };
    summary.dns.push(result);
    return result;
  } catch (error) {
    const result = {
      hostname,
      ok: false,
      required,
      warning: `Optional canonical host '${hostname}' is not resolvable: ${error.message}`,
    };
    summary.dns.push(result);
    if (required) {
      throw new Error(
        `Canonical host '${hostname}' is not resolvable. Update your hosts/DNS mapping before running the live validation again.`
      );
    }
    return result;
  }
}

async function fetchJson(url, description) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${description} failed (${response.status}) at ${url}`);
    }
    const body = await response.text();
    if (!body.trim()) {
      throw new Error(`${description} returned HTTP ${response.status} with an empty body at ${url}`);
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new Error(
        `${description} returned non-JSON content at ${url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    summary.apiChecks.push({ description, url, status: response.status, kind: "json" });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, description) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${description} failed (${response.status}) at ${url}`);
    }
    const payload = await response.text();
    summary.apiChecks.push({ description, url, status: response.status, kind: "text" });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function assertListHasItems(locator, description) {
  await expect(locator).toBeVisible({ timeout: timeoutMs });
  const count = await locator.locator('[role="listitem"]').count();
  if (count < 1) {
    throw new Error(`${description} is visible but empty.`);
  }
  summary.uiChecks.push({ description, kind: "list", itemCount: count });
}

async function assertTableHasRows(locator, minimumRows, description) {
  await expect(locator).toBeVisible({ timeout: timeoutMs });
  const count = await locator.locator("tbody tr").count();
  if (count < minimumRows) {
    throw new Error(`${description} expected at least ${minimumRows} body rows but found ${count}.`);
  }
  summary.uiChecks.push({ description, kind: "table", rowCount: count });
}

function assertFiniteNumber(value, description) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${description} expected a finite number but received ${String(value)}.`);
  }
  return value;
}

function assertNumberInRange(value, minimum, maximum, description) {
  const numericValue = assertFiniteNumber(value, description);
  if (numericValue < minimum || numericValue > maximum) {
    throw new Error(
      `${description} expected ${minimum} <= value <= ${maximum} but received ${numericValue}.`
    );
  }
  return numericValue;
}

function assertArrayHasLength(value, minimumLength, description) {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new Error(
      `${description} expected at least ${minimumLength} rows but found ${
        Array.isArray(value) ? value.length : "non-array"
      }.`
    );
  }
  return value;
}

function recordCalculationCheck(description, evidence) {
  summary.calculationChecks.push({ description, ...evidence });
}

function recordSupportabilityCheck(panel, evidence) {
  summary.supportabilityChecks.push({ panel, ...evidence });
}

function recordPanelClassification(panel, state, owner, evidence) {
  const panelSpec = panelRegistryById.get(panel);
  if (!panelSpec) {
    throw new Error(`Panel classification '${panel}' is not present in the governed panel registry.`);
  }
  if (!panelSpec.allowedStates.includes(state)) {
    throw new Error(
      `Panel classification '${panel}' used unsupported state '${state}'. Allowed states: ${panelSpec.allowedStates.join(", ")}.`
    );
  }
  summary.panelClassifications.push({ panel, state, owner, ...evidence });
}

function assertNoUnsupportedBlankPanels() {
  const unsupportedBlankPanels = summary.panelClassifications.filter(
    (panel) => panel.state === "supported_blank"
  );
  if (unsupportedBlankPanels.length > 0) {
    throw new Error(
      `Unsupported blank panels found: ${unsupportedBlankPanels
        .map((panel) => panel.panel)
        .join(", ")}.`
    );
  }
}

function assertPanelSupportabilityAlignment() {
  const classifiedPanels = new Set(summary.panelClassifications.map((panel) => panel.panel));

  for (const panelSpec of panelRegistry.panels) {
    if (!classifiedPanels.has(panelSpec.panelId)) {
      throw new Error(`Governed panel '${panelSpec.panelId}' was not classified during validation.`);
    }
  }

  for (const panel of summary.panelClassifications) {
    const panelSpec = panelRegistryById.get(panel.panel);
    if (panel.owner !== panelSpec.owningService) {
      throw new Error(
        `Panel '${panel.panel}' reported owner '${panel.owner}' but registry owner is '${panelSpec.owningService}'.`
      );
    }
    if (panel.state !== panelSpec.requiredSupportState) {
      throw new Error(
        `Panel '${panel.panel}' reported state '${panel.state}' but registry requires '${panelSpec.requiredSupportState}'.`
      );
    }
    if (
      (panel.state === "partial" || panel.state === "unavailable") &&
      !panel.reason &&
      panelSpec.knownLimitations.length < 1 &&
      !panelSpec.ownerFollowUpRfc
    ) {
      throw new Error(
        `Panel '${panel.panel}' is ${panel.state} without a governed reason, limitation, or follow-up RFC.`
      );
    }
    recordSupportabilityCheck(panel.panel, {
      owner: panel.owner,
      state: panel.state,
      requiredSupportState: panelSpec.requiredSupportState,
      gatewayEndpoint: panelSpec.gatewayEndpoint,
      ownerFollowUpRfc: panelSpec.ownerFollowUpRfc,
    });
  }
}

function assertPerformanceCalculationSanity(performanceSummary, performanceDetails) {
  const netPerformance = performanceSummary?.net_performance ?? {};
  const overview = performanceSummary?.overview ?? {};
  const contributionLevel = performanceDetails?.contribution?.levels?.[0];
  const attributionCapability = performanceDetails?.capabilities?.attribution_detail ?? {};
  const attributionLevel = performanceDetails?.attribution?.levels?.[0];

  const portfolioReturn = assertNumberInRange(
    netPerformance.portfolio_return_pct,
    -100,
    200,
    "Net portfolio return"
  );
  const benchmarkReturn = assertNumberInRange(
    netPerformance.benchmark_return_pct,
    -100,
    100,
    "Benchmark return"
  );
  const activeReturn = assertNumberInRange(
    netPerformance.active_return_pct,
    -200,
    200,
    "Active return"
  );
  const activeDifference = Math.abs(activeReturn - (portfolioReturn - benchmarkReturn));
  if (activeDifference > 0.01) {
    throw new Error(
      `Active return is not reconciled: active=${activeReturn}, portfolio=${portfolioReturn}, benchmark=${benchmarkReturn}.`
    );
  }

  assertNumberInRange(overview.market_value_base, 1, 100_000_000, "Portfolio market value");
  assertNumberInRange(overview.cash_weight_pct, -5, 100, "Cash weight");
  assertNumberInRange(overview.position_count, 10, 100, "Position count");
  assertArrayHasLength(performanceDetails?.net_chart, 4, "Performance return path observations");
  const contributionRows = assertArrayHasLength(
    contributionLevel?.rows,
    4,
    "Performance contribution rows"
  );
  const contributionTotal = assertFiniteNumber(
    contributionLevel.total_contribution_pct,
    "Contribution total"
  );
  if (Math.abs(contributionTotal - portfolioReturn) > 0.02) {
    throw new Error(
      `Contribution total does not reconcile with net portfolio return: contribution=${contributionTotal}, return=${portfolioReturn}.`
    );
  }

  const attributionRows = Array.isArray(attributionLevel?.rows) ? attributionLevel.rows.length : 0;
  const attributionFallback =
    attributionCapability.state === "partial" && attributionCapability.fallback_available === true;
  if (attributionCapability.state === "supported" && attributionRows < 1) {
    throw new Error("Attribution detail is supported but returned no rows.");
  }
  if (!attributionFallback && attributionCapability.state !== "supported") {
    throw new Error(
      `Attribution detail is ${String(attributionCapability.state)} without a governed fallback.`
    );
  }

  recordCalculationCheck("Performance calculation sanity", {
    portfolioReturnPct: portfolioReturn,
    benchmarkReturnPct: benchmarkReturn,
    activeReturnPct: activeReturn,
    contributionRows: contributionRows.length,
    attributionState: attributionCapability.state,
    attributionRows,
  });

  recordPanelClassification("performance.summary", "ready", "lotus-performance", {
    returnPathRows: performanceDetails.net_chart.length,
  });
  recordPanelClassification("performance.analysis.contribution", "ready", "lotus-performance", {
    contributionRows: contributionRows.length,
  });
  recordPanelClassification(
    "performance.analysis.attribution",
    attributionFallback ? "partial" : "ready",
    "lotus-performance",
    {
      attributionState: attributionCapability.state,
      attributionRows,
      fallbackAvailable: attributionCapability.fallback_available === true,
    }
  );
  const evidenceState = performanceSummary?.capabilities?.evidence?.state ?? "unavailable";
  recordPanelClassification("performance.evidence", evidenceState, "lotus-gateway", {
    reason: performanceSummary?.capabilities?.evidence?.reason ?? null,
  });
}

function assertRiskCalculationSanity(riskSummary, concentration, drawdown, rolling, attribution) {
  const riskPeriod = assertArrayHasLength(riskSummary?.payload?.periods, 1, "Risk periods")[0];
  const metrics = assertArrayHasLength(riskPeriod.metrics, 6, "Risk summary metrics");
  const readyMetrics = metrics.filter((metric) => metric?.state === "ready");
  if (readyMetrics.length < 6) {
    throw new Error(`Risk summary expected at least 6 ready metrics but found ${readyMetrics.length}.`);
  }
  assertNumberInRange(riskPeriod.portfolio_observation_count, 60, 400, "Risk observations");
  assertNumberInRange(
    riskPeriod.aligned_benchmark_observation_count,
    60,
    400,
    "Aligned benchmark observations"
  );
  if (riskPeriod.benchmark_context?.aligned !== true) {
    throw new Error("Risk benchmark context is not aligned.");
  }

  const concentrationPayload = concentration?.payload ?? {};
  assertNumberInRange(
    concentrationPayload.portfolio_concentration?.hhi_current,
    1,
    10_000,
    "Portfolio concentration HHI"
  );
  assertNumberInRange(
    concentrationPayload.issuer_concentration?.coverage_ratio_current,
    0.95,
    1,
    "Issuer concentration coverage ratio"
  );
  assertNumberInRange(
    concentrationPayload.single_position_concentration?.top_n_cumulative_weight_current,
    0.5,
    1.01,
    "Top positions cumulative weight"
  );

  const drawdownPeriod = assertArrayHasLength(drawdown?.payload?.periods, 1, "Drawdown periods")[0];
  assertNumberInRange(
    drawdownPeriod.portfolio_observation_count,
    60,
    400,
    "Drawdown observation count"
  );
  assertNumberInRange(
    drawdownPeriod.relative_to_benchmark?.time_under_water_days,
    1,
    366,
    "Relative drawdown time under water"
  );
  assertArrayHasLength(drawdownPeriod.underwater_series, 60, "Drawdown underwater series");

  const rollingPeriod = assertArrayHasLength(rolling?.payload?.periods, 1, "Rolling risk periods")[0];
  assertNumberInRange(rollingPeriod.window_count_emitted, 4, 4, "Rolling risk window count");
  const rollingWindows = assertArrayHasLength(
    rollingPeriod.window_results,
    4,
    "Rolling risk window results"
  );
  let rollingWindowsWithLatestVolatility = 0;
  for (const windowResult of rollingPeriod.window_results) {
    const volatility = windowResult?.metric_summaries?.ROLLING_VOLATILITY;
    if (!volatility || typeof volatility !== "object") {
      throw new Error(
        `Rolling risk window ${String(windowResult?.window_length)} has no volatility summary.`
      );
    }
    if (typeof volatility.latest === "number") {
      rollingWindowsWithLatestVolatility += 1;
    }
  }
  if (rollingWindowsWithLatestVolatility < 2) {
    throw new Error(
      `Rolling risk expected at least 2 computable windows but found ${rollingWindowsWithLatestVolatility}.`
    );
  }

  const attributionPeriod = assertArrayHasLength(
    attribution?.payload?.periods,
    1,
    "Historical risk attribution periods"
  )[0];
  const attributionSet = assertArrayHasLength(
    attributionPeriod.attribution_sets,
    1,
    "Historical risk attribution sets"
  )[0];
  const contributors = assertArrayHasLength(
    attributionSet.contributors,
    5,
    "Historical risk attribution contributors"
  );
  const residual = assertFiniteNumber(attributionSet.residual, "Historical risk residual");
  if (Math.abs(residual) > 0.000001) {
    throw new Error(`Historical risk attribution residual is too high: ${residual}.`);
  }

  recordCalculationCheck("Risk calculation sanity", {
    readyMetricCount: readyMetrics.length,
    observationCount: riskPeriod.portfolio_observation_count,
    concentrationHhi: concentrationPayload.portfolio_concentration?.hhi_current,
    rollingWindowCount: rollingPeriod.window_count_emitted,
    rollingWindowResultCount: rollingWindows.length,
    rollingWindowsWithLatestVolatility,
    attributionContributorCount: contributors.length,
  });

  recordPanelClassification("performance.risk.snapshot", "ready", "lotus-risk", {
    readyMetricCount: readyMetrics.length,
  });
  recordPanelClassification("performance.risk.concentration", "ready", "lotus-risk", {
    issuerCoverageRatio: concentrationPayload.issuer_concentration?.coverage_ratio_current,
  });
  recordPanelClassification("performance.risk.drawdown", "ready", "lotus-risk", {
    underwaterSeriesRows: drawdownPeriod.underwater_series.length,
  });
  recordPanelClassification("performance.risk.rolling", "ready", "lotus-risk", {
    windowCount: rollingPeriod.window_count_emitted,
    computableWindows: rollingWindowsWithLatestVolatility,
  });
  recordPanelClassification("performance.risk.historical_attribution", "ready", "lotus-risk", {
    contributorRows: contributors.length,
  });
}

async function screenshot(page, name, metadata) {
  const target = path.join(outputDir, name);
  await page.screenshot({ path: target, fullPage: true });
  summary.screenshots.push({
    name,
    path: target,
    route: metadata.route,
    panel: metadata.panel,
    portfolioId,
    benchmarkCode,
    asOfDate: canonicalAsOfDate,
    state: metadata.state ?? "demo_ready",
  });
}

function resolveRegistryRoute(routeTemplate) {
  return routeTemplate
    .replaceAll("{portfolioId}", portfolioId)
    .replaceAll("{benchmarkCode}", benchmarkCode);
}

async function screenshotRegisteredPanel(page, panelId, metadata = {}) {
  const panelSpec = panelRegistryById.get(panelId);
  if (!panelSpec) {
    throw new Error(`Screenshot requested for unregistered panel '${panelId}'.`);
  }
  if (!panelSpec.screenshotName) {
    throw new Error(`Panel '${panelId}' has no governed screenshot name.`);
  }
  await screenshot(page, panelSpec.screenshotName, {
    route: metadata.route ?? resolveRegistryRoute(panelSpec.route),
    panel: panelId,
    state: metadata.state,
  });
}

async function writeSummary() {
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function writeShotIndex() {
  const lines = [
    "# Lotus Canonical Front-Office Screenshots",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Contract: ${summary.canonicalContract.contractId} ${summary.canonicalContract.contractVersion}`,
    `- Governed by: ${summary.canonicalContract.governedByRfc}`,
    `- Portfolio: ${portfolioId}`,
    `- Benchmark: ${benchmarkCode}`,
    `- As of: ${canonicalAsOfDate}`,
    `- Validation summary: ${summaryPath}`,
    "",
    "## Captures",
    "",
  ];

  for (const screenshotEvidence of summary.screenshots) {
    lines.push(
      `- ${screenshotEvidence.name} - ${screenshotEvidence.panel} - ${screenshotEvidence.route} - ${screenshotEvidence.state}`
    );
  }

  await fs.writeFile(shotIndexPath, `${lines.join("\n")}\n`, "utf8");
}

async function run() {
  await ensureDirectory(outputDir);

  const dnsChecks = await Promise.all([
    checkDns("workbench.dev.lotus"),
    checkDns("gateway.dev.lotus"),
    checkDns("core-query.dev.lotus"),
    checkDns("core-control.dev.lotus"),
    checkDns("core-ingestion.dev.lotus"),
    checkDns("performance.dev.lotus"),
    checkDns("risk.dev.lotus"),
    checkDns("advise.dev.lotus"),
    checkDns("manage.dev.lotus"),
    checkDns("report.dev.lotus"),
    checkDns("ai.dev.lotus", false),
  ]);

  dnsChecks
    .filter((item) => !item.ok)
    .forEach((item) => console.warn(item.warning));

  const foundationWorkspace = await fetchJson(
    `${gatewayBaseUrl}/api/v1/foundation/portfolios/${portfolioId}/workspace`,
    "Foundation workspace"
  );
  if (foundationWorkspace?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error(`Foundation workspace did not resolve ${portfolioId}.`);
  }

  const performanceSummary = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/summary?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance summary"
  );
  if (!performanceSummary?.portfolio_id) {
    throw new Error("Performance summary returned no portfolio payload.");
  }

  const performanceDetails = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/details?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance details"
  );
  if (!performanceDetails?.portfolio_id) {
    throw new Error("Performance details returned no portfolio payload.");
  }

  const riskSummary = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/summary?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}`,
    "Risk summary"
  );
  if (!riskSummary?.portfolio_id) {
    throw new Error("Risk summary returned no portfolio payload.");
  }

  const riskConcentration = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/concentration?period=YTD&benchmark_code=${benchmarkCode}`,
    "Risk concentration"
  );
  const riskDrawdown = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/drawdown?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_underwater_series=true`,
    "Risk drawdown"
  );
  const riskRolling = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_time_series=true`,
    "Risk rolling"
  );
  const riskAttribution = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/attribution?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&attribution_type=total_risk&grouping_dimension=sector`,
    "Risk attribution"
  );
  for (const [description, payload] of [
    ["Risk concentration", riskConcentration],
    ["Risk drawdown", riskDrawdown],
    ["Risk rolling", riskRolling],
    ["Risk attribution", riskAttribution],
  ]) {
    if (payload?.state !== "ready") {
      throw new Error(`${description} returned non-ready state: ${String(payload?.state)}.`);
    }
  }
  assertPerformanceCalculationSanity(performanceSummary, performanceDetails);
  assertRiskCalculationSanity(
    riskSummary,
    riskConcentration,
    riskDrawdown,
    riskRolling,
    riskAttribution
  );

  const advisorBrief = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Advisor brief"
  );
  if (!advisorBrief?.summary) {
    throw new Error("Advisor brief returned no summary.");
  }

  const manageCapabilities = await fetchJson(
    "http://manage.dev.lotus/integration/capabilities?consumer_system=lotus-gateway&tenant_id=default",
    "lotus-manage integration capabilities"
  );
  if (!Array.isArray(manageCapabilities?.features) || manageCapabilities.features.length < 1) {
    throw new Error("lotus-manage integration capabilities returned no feature flags.");
  }

  const reportCapabilities = await fetchJson(
    "http://report.dev.lotus/integration/capabilities?consumerSystem=lotus-gateway&tenantId=default",
    "lotus-report integration capabilities"
  );
  if (!Array.isArray(reportCapabilities?.features) || reportCapabilities.features.length < 1) {
    throw new Error("lotus-report integration capabilities returned no feature flags.");
  }

  const gatewayCapabilities = await fetchJson(
    `${gatewayBaseUrl}/api/v1/platform/capabilities`,
    "Gateway platform capabilities"
  );
  const gatewayManageFeatures = gatewayCapabilities?.data?.sources?.lotus_manage?.features;
  if (!Array.isArray(gatewayManageFeatures) || gatewayManageFeatures.length < 1) {
    throw new Error("Gateway platform capabilities returned no lotus-manage feature flags.");
  }

  const gatewayOverview = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/overview`,
    "Gateway workbench overview"
  );
  if (gatewayOverview?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error("Gateway workbench overview returned no portfolio payload.");
  }
  recordPanelClassification("portfolio.summary", "ready", "lotus-gateway", {
    portfolioId,
  });
  recordPanelClassification("portfolio.detailed", "ready", "lotus-gateway", {
    portfolioId,
  });
  recordPanelClassification("performance.advisor_brief", "ready", "lotus-performance", {
    sourceMetricMinimum: 3,
  });
  assertNoUnsupportedBlankPanels();
  assertPanelSupportabilityAlignment();

  const portfolioShell = await fetchText(
    `${workbenchBaseUrl}/portfolio?portfolioId=${portfolioId}`,
    "Workbench portfolio route"
  );
  if (!portfolioShell.includes("Portfolio")) {
    throw new Error("Workbench portfolio route did not render the Portfolio shell.");
  }

  const performanceShell = await fetchText(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}`,
    "Workbench performance route"
  );
  if (!performanceShell.includes("Performance")) {
    throw new Error("Workbench performance route did not render the Performance shell.");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  try {
    await page.goto(`${workbenchBaseUrl}/portfolio?portfolioId=${portfolioId}`, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Portfolio", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: portfolioId, exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Portfolio Allocation" })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertListHasItems(page.getByRole("list", { name: "Top holdings chart" }), "Top holdings chart");
    await expect(page.getByRole("img", { name: "Allocation donut chart" })).toBeVisible({
      timeout: timeoutMs,
    });
    await screenshotRegisteredPanel(page, "portfolio.summary");

    await page.getByRole("tab", { name: "Detailed" }).click();
    await expect(page.getByRole("tab", { name: "Detailed", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible({ timeout: timeoutMs });
    await expect(page.getByRole("heading", { name: "Projected Cashflow" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByLabel("Portfolio transactions grid")).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByLabel("Projected cashflow summary")).toBeVisible({
      timeout: timeoutMs,
    });
    await screenshotRegisteredPanel(page, "portfolio.detailed");

    await page.goto(`${workbenchBaseUrl}/performance?portfolioId=${portfolioId}`, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("tab", { name: "Summary", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Net Return Path" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance Drivers" })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertTableHasRows(
      page.getByRole("table", { name: "Return path observation table" }),
      4,
      "Return path observation table"
    );
    await screenshotRegisteredPanel(page, "performance.summary");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=analysis&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Analysis", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Attribution Over Time" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Attribution Detail" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance Drivers" })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertTableHasRows(
      page.getByRole("table", { name: /attribution/i }).first(),
      1,
      "Attribution detail table"
    );
    await assertTableHasRows(
      page.getByRole("table", { name: /contribution/i }).first(),
      1,
      "Contribution detail table"
    );
    await screenshotRegisteredPanel(page, "performance.analysis.contribution");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=advisor&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Advisor Brief", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance Advisor Brief" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Client Talking Points" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Source Metrics" })).toBeVisible({
      timeout: timeoutMs,
    });
    const sourceMetricButtons = await page.getByRole("region", { name: "Source Metrics" }).getByRole("button").count();
    if (sourceMetricButtons < 3) {
      throw new Error(`Advisor brief source metrics expected at least 3 metric buttons but found ${sourceMetricButtons}.`);
    }
    summary.uiChecks.push({
      description: "Advisor brief source metrics",
      kind: "buttons",
      buttonCount: sourceMetricButtons,
    });
    await screenshotRegisteredPanel(page, "performance.advisor_brief");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Risk", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Risk Snapshot", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Drawdown", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Concentration", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Rolling Risk", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Historical Risk Attribution", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertTableHasRows(
      page.getByRole("table", { name: "Historical risk attribution table" }),
      5,
      "Historical risk attribution table"
    );
    await screenshotRegisteredPanel(page, "performance.risk.snapshot");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=evidence&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Evidence", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Evidence and Calculation Context" })).toBeVisible({
      timeout: timeoutMs,
    });
    const evidenceStatusStrip = page.getByLabel("Evidence support status");
    if (await evidenceStatusStrip.count()) {
      await expect(evidenceStatusStrip).toBeVisible({ timeout: timeoutMs });
      summary.uiChecks.push({ description: "Evidence support status", kind: "status-strip", state: "supported" });
    } else {
      await expect(page.getByText(/Evidence (partially available|unavailable)/)).toBeVisible({
        timeout: timeoutMs,
      });
      summary.uiChecks.push({ description: "Evidence support status", kind: "status-strip", state: "degraded" });
    }
    await screenshotRegisteredPanel(page, "performance.evidence", {
      state: "truthfully_degraded",
    });
  } finally {
    await browser.close();
  }

  await writeSummary();
  await writeShotIndex();
  console.log(`Live canonical Workbench validation passed for ${portfolioId}. Screenshots: ${outputDir}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
