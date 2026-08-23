import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NEXT_PRODUCTION_DIRECTORY } from "../config/next-artifact-layout.mjs";

export const PORTFOLIO_RECORD_ROUTE_POLICIES = Object.freeze([
  { route: "/allocation/page", task: "Allocation", maxInitialJsBytes: 4_500_000, agGrid: "required" },
  { route: "/positions/page", task: "Positions", maxInitialJsBytes: 4_500_000, agGrid: "required" },
  { route: "/transactions/page", task: "Transactions", maxInitialJsBytes: 4_500_000, agGrid: "required" },
  { route: "/cashflow/page", task: "Cashflow", maxInitialJsBytes: 3_350_000, agGrid: "forbidden" },
  { route: "/income/page", task: "Income & Activity", maxInitialJsBytes: 3_350_000, agGrid: "forbidden" },
]);

const AG_GRID_MARKER = "ag-grid-community";

export function analyzePortfolioRecordBundles({
  buildDirectory = NEXT_PRODUCTION_DIRECTORY,
  routePolicies = PORTFOLIO_RECORD_ROUTE_POLICIES,
} = {}) {
  const manifestPath = path.join(buildDirectory, "app-build-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Portfolio record bundle manifest not found at ${manifestPath}. Run the production build first.`,
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const pages = manifest.pages ?? {};

  return routePolicies.map((policy) => {
    const assets = pages[policy.route];
    if (!Array.isArray(assets)) {
      throw new Error(`Portfolio record route ${policy.route} is missing from ${manifestPath}.`);
    }

    const initialAssets = [...new Set(assets)].sort();
    const javascriptAssets = initialAssets.filter((asset) => asset.endsWith(".js"));
    let initialJsBytes = 0;
    let includesAgGrid = false;

    for (const asset of javascriptAssets) {
      const assetPath = path.join(buildDirectory, asset);
      if (!fs.existsSync(assetPath)) {
        throw new Error(`Portfolio record bundle asset is missing: ${assetPath}.`);
      }

      initialJsBytes += fs.statSync(assetPath).size;
      if (!includesAgGrid) {
        includesAgGrid = fs.readFileSync(assetPath, "utf8").includes(AG_GRID_MARKER);
      }
    }

    return {
      ...policy,
      assetCount: initialAssets.length,
      javascriptAssetCount: javascriptAssets.length,
      initialJsBytes,
      includesAgGrid,
    };
  });
}

export function evaluatePortfolioRecordBundlePolicies(report) {
  const violations = [];

  for (const route of report) {
    if (route.initialJsBytes > route.maxInitialJsBytes) {
      violations.push(
        `${route.task} initial JavaScript is ${formatBytes(route.initialJsBytes)}; budget is ${formatBytes(route.maxInitialJsBytes)}.`,
      );
    }
    if (route.agGrid === "required" && !route.includesAgGrid) {
      violations.push(`${route.task} lost the required AG Grid record workspace.`);
    }
    if (route.agGrid === "forbidden" && route.includesAgGrid) {
      violations.push(`${route.task} preloads AG Grid even though the business task does not use it.`);
    }
  }

  return violations;
}

export function formatPortfolioRecordBundleReport(report) {
  const rows = report.map((route) => ({
    Task: route.task,
    Route: route.route.replace("/page", ""),
    "Initial JS": formatBytes(route.initialJsBytes),
    Budget: formatBytes(route.maxInitialJsBytes),
    Assets: route.assetCount,
    "AG Grid": route.includesAgGrid ? "included" : "not included",
  }));

  return rows;
}

function formatBytes(bytes) {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function run() {
  const report = analyzePortfolioRecordBundles();
  console.log("Portfolio record route bundle report (uncompressed initial client JavaScript)");
  console.table(formatPortfolioRecordBundleReport(report));

  const violations = evaluatePortfolioRecordBundlePolicies(report);
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Portfolio record bundle budgets passed.");
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  run();
}
