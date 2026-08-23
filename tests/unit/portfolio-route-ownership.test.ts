import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(REPO_ROOT, relativePath), "utf8");
}

describe("portfolio workspace route ownership", () => {
  it("keeps canonical validation and standalone smoke on the product route", () => {
    const canonicalValidator = readRepoFile("scripts/live/validate-canonical-workbench-live.mjs");
    const canonicalWrapper = readRepoFile("scripts/live/Validate-LotusFrontOfficeCanonical.ps1");
    const smokeSpec = readRepoFile("tests/e2e/portfolio-workbench.smoke.spec.ts");
    const smokeFixture = readRepoFile("tests/e2e/portfolio-fixture-gateway.ts");
    const featureCoverage = readRepoFile(
      "scripts/live/validation/rfc36-43-feature-coverage.mjs"
    );

    expect(canonicalValidator).toContain(
      "/api/v1/portfolio/portfolios/${portfolioId}/workspace"
    );
    expect(canonicalValidator).not.toContain("/api/v1/foundation");
    expect(canonicalWrapper).toContain(
      "/api/v1/portfolio/portfolios/$PortfolioId/workspace"
    );
    expect(canonicalWrapper).not.toContain("/api/v1/foundation");
    expect(smokeSpec).toContain("/api/bff/api/v1/portfolio/portfolios");
    expect(smokeSpec).not.toContain("/api/bff/api/v1/foundation");
    expect(smokeFixture).toContain("/api/v1/portfolio/portfolios");
    expect(smokeFixture).not.toContain("/api/v1/foundation");
    expect(featureCoverage).toContain('"portfolioWorkspace"');
    expect(featureCoverage).not.toContain('"foundationWorkspace"');
  });
});
