import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("RFC-0023 risk hardening architecture guard", () => {
  it("keeps Performance Risk response state under governed Query ownership", () => {
    const contractHook = readRepoFile(
      "src/apps/performance/use-performance-risk-contract.ts",
    );
    const requiredPatterns = [
      "useQuery(",
      "useQueryClient()",
      "performanceRiskSummaryQueryOptions",
      "performanceRiskConcentrationQueryOptions",
      "performanceRiskAttributionQueryOptions",
      "performanceRiskDrawdownQueryOptions",
      "performanceRiskRollingQueryOptions",
    ];
    const forbiddenPatterns = [
      "CacheRef",
      "requestSequenceRef",
      "useRef<Map",
      "JSON.stringify",
    ];

    expect(
      requiredPatterns.filter((pattern) => !contractHook.includes(pattern)),
    ).toEqual([]);
    expect(
      forbiddenPatterns.filter((pattern) => contractHook.includes(pattern)),
    ).toEqual([]);
  });

  it("keeps hardened risk panels on shared methodology access instead of persistent methodology blocks", () => {
    const hardenedPanelFiles = [
      "src/apps/performance/components/risk/risk-snapshot-panel.tsx",
      "src/apps/performance/components/risk/risk-drawdown-panel.tsx",
      "src/apps/performance/components/risk/risk-concentration-panel.tsx",
      "src/apps/performance/components/risk/risk-rolling-panel.tsx",
      "src/apps/performance/components/risk/risk-attribution-panel.tsx",
    ];

    const violations = hardenedPanelFiles.flatMap((relativePath) => {
      const contents = readRepoFile(relativePath);
      return [
        !contents.includes("RiskPanelInfoDrawer")
        && !contents.includes("RiskPanelUtilityRow")
          ? {
              file: relativePath,
              reason:
                "Hardened risk panels must expose methodology and coverage through the shared drawer.",
            }
          : null,
        contents.includes("RiskContextList")
          ? {
              file: relativePath,
              reason:
                "Hardened risk panels must not reintroduce large persistent methodology blocks.",
            }
          : null,
      ].filter(
        (
          value
        ): value is {
          file: string;
          reason: string;
        } => value !== null
      );
    });

    expect(violations).toEqual([]);
  });

  it("keeps rolling-series and underwater detail behind shared analytical drawers", () => {
    const fileExpectations = [
      {
        file: "src/apps/performance/components/performance-risk-mode.tsx",
        required: ["RiskDrawdownDetailDrawer", "RiskRollingDetailDrawer"],
        forbidden: ["underwaterExpanded", "rollingExpanded"],
      },
      {
        file: "src/apps/performance/components/risk/risk-drawdown-panel.tsx",
        required: ["View underwater path"],
        forbidden: ["Expand underwater path"],
      },
      {
        file: "src/apps/performance/components/risk/risk-rolling-panel.tsx",
        required: ["drilldownLabel", "onViewSeries"],
        forbidden: ["Expand rolling series"],
      },
    ];

    const violations = fileExpectations.flatMap(({ file, required, forbidden }) => {
      const contents = readRepoFile(file);

      return [
        ...required
          .filter((pattern) => !contents.includes(pattern))
          .map((pattern) => ({
            file,
            reason: `Expected hardened risk drill-down pattern missing: ${pattern}`,
          })),
        ...forbidden
          .filter((pattern) => contents.includes(pattern))
          .map((pattern) => ({
            file,
            reason: `Forbidden inline expansion pattern reintroduced: ${pattern}`,
          })),
      ];
    });

    expect(violations).toEqual([]);
  });

  it("keeps the hardened risk component layer free of legacy inline expansion labels", () => {
    const riskComponentRoot = path.join(repoRoot, "src", "apps", "performance", "components", "risk");
    const riskComponentFiles = fs
      .readdirSync(riskComponentRoot)
      .filter((entry) => entry.endsWith(".tsx"))
      .map((entry) => path.join(riskComponentRoot, entry));

    const forbiddenStrings = [
      "Expand underwater path",
      "Expand rolling series",
      "Coverage and methodology",
    ];

    const violations = riskComponentFiles.flatMap((absolutePath) => {
      const contents = fs.readFileSync(absolutePath, "utf8");
      return forbiddenStrings
        .filter((pattern) => contents.includes(pattern))
        .map((pattern) => ({
          file: path.relative(repoRoot, absolutePath).replaceAll(path.sep, "/"),
          pattern,
        }));
    });

    expect(violations).toEqual([]);
  });
});
