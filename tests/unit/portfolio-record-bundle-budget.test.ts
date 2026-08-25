import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

type RoutePolicy = {
  route: string;
  task: string;
  maxInitialJsBytes: number;
  agGrid: "required" | "forbidden";
};

type RouteReport = RoutePolicy & {
  assetCount: number;
  javascriptAssetCount: number;
  initialJsBytes: number;
  includesAgGrid: boolean;
};

type PortfolioRecordBundleModule = {
  PORTFOLIO_RECORD_ROUTE_POLICIES: ReadonlyArray<RoutePolicy>;
  analyzePortfolioRecordBundles: (options: {
    buildDirectory: string;
    routePolicies?: ReadonlyArray<RoutePolicy>;
  }) => RouteReport[];
  evaluatePortfolioRecordBundlePolicies: (report: RouteReport[]) => string[];
  formatPortfolioRecordBundleReport: (report: RouteReport[]) => Array<Record<string, unknown>>;
};

const bundleModulePromise =
  // @ts-expect-error The repository quality gate is a Node .mjs script without a TypeScript declaration.
  import("../../scripts/quality/check-portfolio-record-bundles.mjs") as Promise<PortfolioRecordBundleModule>;

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("portfolio record bundle budget", () => {
  it("reports all five business routes and their task-specific grid posture", async () => {
    const {
      analyzePortfolioRecordBundles,
      evaluatePortfolioRecordBundlePolicies,
      formatPortfolioRecordBundleReport,
    } = await bundleModulePromise;
    const buildDirectory = createBuild({ cashflowIncludesGrid: false, incomeIncludesGrid: false });

    const report = analyzePortfolioRecordBundles({ buildDirectory });

    expect(report.map(({ task }) => task)).toEqual([
      "Allocation",
      "Positions",
      "Transactions",
      "Cashflow",
      "Income and activity",
    ]);
    expect(report.slice(0, 3).every(({ includesAgGrid }) => includesAgGrid)).toBe(true);
    expect(report.slice(3).every(({ includesAgGrid }) => !includesAgGrid)).toBe(true);
    expect(evaluatePortfolioRecordBundlePolicies(report)).toEqual([]);
    expect(formatPortfolioRecordBundleReport(report)).toHaveLength(5);
  });

  it("rejects unrelated AG Grid code from non-grid business tasks", async () => {
    const { analyzePortfolioRecordBundles, evaluatePortfolioRecordBundlePolicies } =
      await bundleModulePromise;
    const buildDirectory = createBuild({ cashflowIncludesGrid: true, incomeIncludesGrid: false });

    const violations = evaluatePortfolioRecordBundlePolicies(
      analyzePortfolioRecordBundles({ buildDirectory }),
    );

    expect(violations).toContain(
      "Cashflow preloads AG Grid even though the business task does not use it.",
    );
  });

  it("rejects missing routes and route payloads above their budget", async () => {
    const {
      analyzePortfolioRecordBundles,
      evaluatePortfolioRecordBundlePolicies,
      PORTFOLIO_RECORD_ROUTE_POLICIES,
    } = await bundleModulePromise;
    const buildDirectory = createBuild({ cashflowIncludesGrid: false, incomeIncludesGrid: false });
    const manifestPath = path.join(buildDirectory, "app-build-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    delete manifest.pages["/income/page"];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(() => analyzePortfolioRecordBundles({ buildDirectory })).toThrow(
      "Portfolio record route /income/page is missing",
    );

    const constrainedPolicies = PORTFOLIO_RECORD_ROUTE_POLICIES.map((policy) => ({
      ...policy,
      maxInitialJsBytes: 1,
    }));
    const overBudgetReport = analyzePortfolioRecordBundles({
      buildDirectory: createBuild({ cashflowIncludesGrid: false, incomeIncludesGrid: false }),
      routePolicies: constrainedPolicies,
    });
    expect(evaluatePortfolioRecordBundlePolicies(overBudgetReport)).toHaveLength(5);
  });
});

function createBuild({
  cashflowIncludesGrid,
  incomeIncludesGrid,
}: {
  cashflowIncludesGrid: boolean;
  incomeIncludesGrid: boolean;
}) {
  const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-record-bundles-"));
  temporaryDirectories.push(buildDirectory);
  const chunksDirectory = path.join(buildDirectory, "static", "chunks");
  fs.mkdirSync(chunksDirectory, { recursive: true });
  fs.writeFileSync(path.join(chunksDirectory, "shared.js"), "shared-shell");
  fs.writeFileSync(path.join(chunksDirectory, "grid.js"), "ag-grid-community");
  fs.writeFileSync(
    path.join(chunksDirectory, "cashflow.js"),
    cashflowIncludesGrid ? "ag-grid-community cashflow" : "cashflow",
  );
  fs.writeFileSync(
    path.join(chunksDirectory, "income.js"),
    incomeIncludesGrid ? "ag-grid-community income" : "income",
  );

  fs.writeFileSync(
    path.join(buildDirectory, "app-build-manifest.json"),
    JSON.stringify({
      pages: {
        "/allocation/page": ["static/chunks/shared.js", "static/chunks/grid.js"],
        "/positions/page": ["static/chunks/shared.js", "static/chunks/grid.js"],
        "/transactions/page": ["static/chunks/shared.js", "static/chunks/grid.js"],
        "/cashflow/page": ["static/chunks/shared.js", "static/chunks/cashflow.js"],
        "/income/page": ["static/chunks/shared.js", "static/chunks/income.js"],
      },
    }),
  );

  return buildDirectory;
}
